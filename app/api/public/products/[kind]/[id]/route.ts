import { NextResponse } from "next/server";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ kind: string; id: string }> };

function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Public product/template detail card for Kebu Search result pages.
 * Re-checks real live status directly (never trusts search_documents, which
 * can be stale) — a deactivated shop product, a product on an unpublished
 * site, or an unpublished marketplace template always 404s, mirroring the
 * same contract as app/api/public/businesses/[id]/route.ts.
 */
export async function GET(req: Request, { params }: Params) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { kind, id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const admin = createAdminClient();

  if (kind === "shop_product") {
    const { data: product, error } = await admin
      .from("project_products")
      .select("id, name, description, price_label, image_url, is_active, updated_at, projects!inner(status, subdomain)")
      .eq("id", id)
      .eq("is_active", true)
      .eq("projects.status", "published")
      .maybeSingle();

    if (error) {
      console.error("[public/products] shop_product lookup failed:", error);
      return NextResponse.json({ error: "This product could not load." }, { status: 500 });
    }
    if (!product) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const project = (product as unknown as { projects: { status: string; subdomain: string | null } }).projects;
    const siteUrl = project?.subdomain ? `https://${project.subdomain}.thekebu.com` : null;

    return NextResponse.json({
      product: {
        id: product.id,
        kind: "shop_product",
        name: product.name,
        description: product.description,
        priceLabel: product.price_label,
        imageUrl: safeUrl(product.image_url),
        siteUrl: safeUrl(siteUrl),
        updatedAt: product.updated_at,
      },
    });
  }

  if (kind === "marketplace_template") {
    const { data: template, error } = await admin
      .from("marketplace_templates")
      .select("id, name, description, category, price_cents, preview_url, status, updated_at, developer_profiles(display_name)")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      console.error("[public/products] marketplace_template lookup failed:", error);
      return NextResponse.json({ error: "This template could not load." }, { status: 500 });
    }
    if (!template) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const developer = (template as unknown as { developer_profiles: { display_name: string } | null }).developer_profiles;

    return NextResponse.json({
      product: {
        id: template.id,
        kind: "marketplace_template",
        name: template.name,
        description: template.description,
        category: template.category,
        priceLabel: "$" + (template.price_cents / 100).toFixed(2),
        previewUrl: safeUrl(template.preview_url),
        developerName: developer?.display_name || null,
        updatedAt: template.updated_at,
      },
    });
  }

  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
