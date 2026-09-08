import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  VARIANT_SELECT,
  productVariantSchema,
} from "@/lib/shop/product-variants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; productId: string }> };

async function assertProductOwner(
  supabase: Awaited<ReturnType<typeof requireUser>> extends { supabase: infer S } ? S : never,
  userId: string,
  projectId: string,
  productId: string,
) {
  const { data: product } = await supabase
    .from("project_products")
    .select("id, project_id")
    .eq("id", productId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!product) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (!project) return null;
  return product;
}

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, productId } = await params;

  const product = await assertProductOwner(supabase, user.id, projectId, productId);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const { data: variants, error } = await supabase
    .from("project_product_variants")
    .select(VARIANT_SELECT)
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Variants table missing. Apply migration 064."
          : "Could not load variants.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ variants: variants ?? [] });
}

export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, productId } = await params;

  const product = await assertProductOwner(supabase, user.id, projectId, productId);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = productVariantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: last } = await supabase
    .from("project_product_variants")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = parsed.data.sortOrder ?? (last?.sort_order ?? 0) + 1;

  const { data: variant, error } = await supabase
    .from("project_product_variants")
    .insert({
      product_id: productId,
      project_id: projectId,
      name: parsed.data.name,
      option1: parsed.data.option1,
      option2: parsed.data.option2,
      option3: parsed.data.option3,
      price_label: parsed.data.priceLabel,
      price_xof: parsed.data.priceXof ?? null,
      sku: parsed.data.sku ?? null,
      image_url: parsed.data.imageUrl,
      stock_qty: parsed.data.stockQty ?? null,
      sort_order: sortOrder,
      is_active: parsed.data.isActive ?? true,
    })
    .select(VARIANT_SELECT)
    .single();

  if (error || !variant) {
    return NextResponse.json(
      { error: error?.message?.includes("does not exist") ? "Apply migration 064." : "Could not save variant." },
      { status: 500 },
    );
  }

  await supabase
    .from("project_products")
    .update({ has_variants: true, updated_at: new Date().toISOString() })
    .eq("id", productId);

  const { syncCatalogToProductsSections } = await import("@/lib/create/sync-catalog-to-sections");
  await syncCatalogToProductsSections(supabase, projectId);

  return NextResponse.json({ variant });
}
