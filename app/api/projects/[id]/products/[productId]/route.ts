import { NextRequest, NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { builderRateLimit } from "@/lib/api-guard";
import {
  PRODUCT_SELECT,
  PRODUCT_SELECT_LEGACY,
  PRODUCT_SELECT_MID,
  PRODUCT_SELECT_CODES,
  projectProductSchema,
} from "@/lib/create/project-products";
import { assertProjectProductAccess } from "@/lib/create/assert-project-access";
import { recalculateReadinessForProject } from "@/lib/kebu-id/recalculate-hooks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; productId: string }> };

const patchSchema = projectProductSchema.partial();

/** Update or remove a catalog product. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const csrf = assertSameOriginMutation(req);
  if (csrf) return csrf;

  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, productId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const access = await assertProjectProductAccess(supabase, projectId, user.id);
  if (!access.ok) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.priceLabel !== undefined) patch.price_label = parsed.data.priceLabel;
  if (parsed.data.priceXof !== undefined) patch.price_xof = parsed.data.priceXof;
  if (parsed.data.upc !== undefined) patch.upc = parsed.data.upc;
  if (parsed.data.sku !== undefined) patch.sku = parsed.data.sku;
  if (parsed.data.trackStock !== undefined) {
    patch.track_stock = parsed.data.trackStock;
    if (!parsed.data.trackStock) {
      patch.stock_qty = null;
    } else if (parsed.data.stockQty !== undefined) {
      patch.stock_qty = parsed.data.stockQty ?? 0;
    } else {
      patch.stock_qty = 0;
    }
  } else if (parsed.data.stockQty !== undefined) {
    patch.stock_qty = parsed.data.stockQty;
  }
  if (parsed.data.isSubscription !== undefined) {
    patch.is_subscription = parsed.data.isSubscription;
    if (!parsed.data.isSubscription) {
      patch.subscription_interval = null;
    } else if (parsed.data.subscriptionInterval !== undefined) {
      patch.subscription_interval = parsed.data.subscriptionInterval ?? "monthly";
    } else {
      patch.subscription_interval = "monthly";
    }
  } else if (parsed.data.subscriptionInterval !== undefined) {
    patch.subscription_interval = parsed.data.subscriptionInterval;
  }
  if (parsed.data.imageUrl !== undefined) patch.image_url = parsed.data.imageUrl;
  if (parsed.data.whatsappOrderMessage !== undefined) {
    patch.whatsapp_order_message = parsed.data.whatsappOrderMessage;
  }
  if (parsed.data.sortOrder !== undefined) patch.sort_order = parsed.data.sortOrder;
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;

  let { data: product, error } = await supabase
    .from("project_products")
    .update(patch)
    .eq("id", productId)
    .eq("project_id", projectId)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error && /duplicate|unique/i.test(error.message ?? "")) {
    return NextResponse.json(
      { error: "That UPC or SKU is already used on another product in this shop." },
      { status: 409 },
    );
  }

  if (error && /is_subscription|subscription_interval/i.test(error.message ?? "")) {
    delete patch.is_subscription;
    delete patch.subscription_interval;
    const retry = await supabase
      .from("project_products")
      .update(patch)
      .eq("id", productId)
      .eq("project_id", projectId)
      .select(PRODUCT_SELECT_CODES)
      .maybeSingle();
    product = retry.data
      ? { ...retry.data, is_subscription: false, subscription_interval: null }
      : null;
    error = retry.error;
  }

  if (error && /track_stock|stock_qty/i.test(error.message ?? "")) {
    delete patch.track_stock;
    delete patch.stock_qty;
    const retry = await supabase
      .from("project_products")
      .update(patch)
      .eq("id", productId)
      .eq("project_id", projectId)
      .select(PRODUCT_SELECT_CODES)
      .maybeSingle();
    product = retry.data
      ? {
          ...retry.data,
          track_stock: false,
          stock_qty: null,
          is_subscription: false,
          subscription_interval: null,
        }
      : null;
    error = retry.error;
  }

  if (error && /upc|sku/i.test(error.message ?? "")) {
    delete patch.upc;
    delete patch.sku;
    const retry = await supabase
      .from("project_products")
      .update(patch)
      .eq("id", productId)
      .eq("project_id", projectId)
      .select(PRODUCT_SELECT_MID)
      .maybeSingle();
    product = retry.data
      ? {
          ...retry.data,
          upc: null,
          sku: null,
          track_stock: false,
          stock_qty: null,
          is_subscription: false,
          subscription_interval: null,
        }
      : null;
    error = retry.error;
  }

  if (error && /price_xof/i.test(error.message ?? "")) {
    delete patch.price_xof;
    delete patch.upc;
    delete patch.sku;
    const retry = await supabase
      .from("project_products")
      .update(patch)
      .eq("id", productId)
      .eq("project_id", projectId)
      .select(PRODUCT_SELECT_LEGACY)
      .maybeSingle();
    product = retry.data
      ? {
          ...retry.data,
          price_xof: null,
          upc: null,
          sku: null,
          track_stock: false,
          stock_qty: null,
          is_subscription: false,
          subscription_interval: null,
        }
      : null;
    error = retry.error;
  }

  if (error || !product) {
    return NextResponse.json({ error: "Could not update product." }, { status: 500 });
  }

  await recalculateReadinessForProject(supabase, projectId);
  const { syncCatalogToProductsSections } = await import("@/lib/create/sync-catalog-to-sections");
  await syncCatalogToProductsSections(supabase, projectId);
  return NextResponse.json({ product });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const csrf = assertSameOriginMutation(req);
  if (csrf) return csrf;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, productId } = await params;

  const access = await assertProjectProductAccess(supabase, projectId, user.id);
  if (!access.ok) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("project_products")
    .delete()
    .eq("id", productId)
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: "Could not delete product." }, { status: 500 });
  }

  await recalculateReadinessForProject(supabase, projectId);
  const { syncCatalogToProductsSections } = await import("@/lib/create/sync-catalog-to-sections");
  await syncCatalogToProductsSections(supabase, projectId);
  logCreate("products.deleted", { userId: user.id, projectId, productId });
  return NextResponse.json({ ok: true });
}
