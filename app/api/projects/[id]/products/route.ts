import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { projectProductSchema } from "@/lib/create/project-products";
import { recalculateReadinessForProject } from "@/lib/kebu-id/recalculate-hooks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** List catalog products for an owned project. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: products, error } = await supabase
    .from("project_products")
    .select(
      "id, project_id, business_id, name, description, price_label, image_url, whatsapp_order_message, sort_order, is_active, created_at, updated_at",
    )
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Products table missing. Apply migration 022."
          : "Could not load products.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ products: products ?? [] });
}

/** Add a product to the site catalog. */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = projectProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, business_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: last } = await supabase
    .from("project_products")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = parsed.data.sortOrder ?? (last?.sort_order ?? 0) + 1;

  const { data: product, error } = await supabase
    .from("project_products")
    .insert({
      project_id: projectId,
      business_id: project.business_id,
      name: parsed.data.name,
      description: parsed.data.description,
      price_label: parsed.data.priceLabel,
      image_url: parsed.data.imageUrl,
      whatsapp_order_message: parsed.data.whatsappOrderMessage,
      sort_order: sortOrder,
      is_active: parsed.data.isActive ?? true,
    })
    .select(
      "id, project_id, business_id, name, description, price_label, image_url, whatsapp_order_message, sort_order, is_active, created_at, updated_at",
    )
    .single();

  if (error || !product) {
    logCreate("products.add_failed", { userId: user.id, projectId, message: error?.message });
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "Products table missing. Apply migration 022."
          : "Could not save product.",
        detail: error?.message,
      },
      { status: 500 },
    );
  }

  await recalculateReadinessForProject(supabase, projectId);
  const { syncCatalogToProductsSections } = await import("@/lib/create/sync-catalog-to-sections");
  await syncCatalogToProductsSections(supabase, projectId);
  logCreate("products.added", { userId: user.id, projectId, productId: product.id });

  return NextResponse.json({ product });
}
