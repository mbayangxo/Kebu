import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { VARIANT_SELECT, productVariantSchema } from "@/lib/shop/product-variants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; productId: string; variantId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, productId, variantId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = productVariantSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.option1 !== undefined) patch.option1 = parsed.data.option1;
  if (parsed.data.option2 !== undefined) patch.option2 = parsed.data.option2;
  if (parsed.data.option3 !== undefined) patch.option3 = parsed.data.option3;
  if (parsed.data.priceLabel !== undefined) patch.price_label = parsed.data.priceLabel;
  if (parsed.data.priceXof !== undefined) patch.price_xof = parsed.data.priceXof;
  if (parsed.data.sku !== undefined) patch.sku = parsed.data.sku;
  if (parsed.data.imageUrl !== undefined) patch.image_url = parsed.data.imageUrl;
  if (parsed.data.stockQty !== undefined) patch.stock_qty = parsed.data.stockQty;
  if (parsed.data.sortOrder !== undefined) patch.sort_order = parsed.data.sortOrder;
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;

  const { data: variant, error } = await supabase
    .from("project_product_variants")
    .update(patch)
    .eq("id", variantId)
    .eq("product_id", productId)
    .eq("project_id", projectId)
    .select(VARIANT_SELECT)
    .maybeSingle();

  if (error || !variant) {
    return NextResponse.json({ error: "Could not update variant." }, { status: 500 });
  }

  const { syncCatalogToProductsSections } = await import("@/lib/create/sync-catalog-to-sections");
  await syncCatalogToProductsSections(supabase, projectId);

  return NextResponse.json({ variant });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, productId, variantId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  await supabase
    .from("project_product_variants")
    .delete()
    .eq("id", variantId)
    .eq("product_id", productId)
    .eq("project_id", projectId);

  const { count } = await supabase
    .from("project_product_variants")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if ((count ?? 0) === 0) {
    await supabase
      .from("project_products")
      .update({ has_variants: false, updated_at: new Date().toISOString() })
      .eq("id", productId);
  }

  const { syncCatalogToProductsSections } = await import("@/lib/create/sync-catalog-to-sections");
  await syncCatalogToProductsSections(supabase, projectId);

  return NextResponse.json({ ok: true });
}
