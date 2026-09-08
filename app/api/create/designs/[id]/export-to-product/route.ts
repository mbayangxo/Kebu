import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { parseCanvasDocument, exportCanvasToPngDataUrl } from "@/lib/studio/canvas-document";
import type { StudioDesignType } from "@/lib/studio/canvas-document";
import { recalculateReadinessForProject } from "@/lib/kebu-id/recalculate-hooks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const exportSchema = z.object({
  projectId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  productName: z.string().trim().min(1).max(120).optional(),
  /** Client-rendered PNG data URL when server cannot render canvas */
  imageDataUrl: z.string().max(2_000_000).optional(),
});

/** Export a Studio design image onto a Shop product (new or existing). */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: designId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = exportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: design } = await supabase
    .from("create_designs")
    .select("id, title, design_type, canvas")
    .eq("id", designId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!design) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, business_id")
    .eq("id", parsed.data.projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const doc = parseCanvasDocument(design.canvas, design.design_type as StudioDesignType);
  let imageUrl = parsed.data.imageDataUrl?.trim() ?? "";

  if (!imageUrl.startsWith("data:image/")) {
    const serverRender = exportCanvasToPngDataUrl(doc);
    if (serverRender) imageUrl = serverRender;
  }

  if (!imageUrl.startsWith("data:image/") && !imageUrl.startsWith("http") && !imageUrl.startsWith("/")) {
    return NextResponse.json(
      {
        error:
          "Could not export image. Open the design in Studio and use Send to Shop — your browser renders the PNG.",
      },
      { status: 400 },
    );
  }

  let productId = parsed.data.productId;
  let productName = parsed.data.productName ?? design.title;

  if (productId) {
    const { data: existing } = await supabase
      .from("project_products")
      .select("id")
      .eq("id", productId)
      .eq("project_id", parsed.data.projectId)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "Product not found in this shop." }, { status: 404 });
    }

    const { error: updErr } = await supabase
      .from("project_products")
      .update({
        image_url: imageUrl,
        create_design_id: designId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (updErr) {
      return NextResponse.json({ error: "Could not update product image." }, { status: 500 });
    }
  } else {
    const { data: last } = await supabase
      .from("project_products")
      .select("sort_order")
      .eq("project_id", parsed.data.projectId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: created, error: createErr } = await supabase
      .from("project_products")
      .insert({
        project_id: parsed.data.projectId,
        business_id: project.business_id,
        name: productName,
        description: `From Studio design: ${design.title}`,
        price_label: "",
        image_url: imageUrl,
        create_design_id: designId,
        sort_order: (last?.sort_order ?? 0) + 1,
        is_active: true,
      })
      .select("id, name")
      .single();

    if (createErr || !created) {
      return NextResponse.json({ error: "Could not create product from design." }, { status: 500 });
    }
    productId = created.id;
    productName = created.name;
  }

  await recalculateReadinessForProject(supabase, parsed.data.projectId);
  const { syncCatalogToProductsSections } = await import("@/lib/create/sync-catalog-to-sections");
  await syncCatalogToProductsSections(supabase, parsed.data.projectId);

  return NextResponse.json({
    ok: true,
    productId,
    productName,
    imageUrl,
    shopPath: `/shop/${parsed.data.projectId}?tab=products`,
  });
}
