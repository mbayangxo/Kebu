import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  PRODUCT_SELECT,
  PRODUCT_SELECT_LEGACY,
  PRODUCT_SELECT_MID,
  PRODUCT_SELECT_CODES,
  projectProductSchema,
} from "@/lib/create/project-products";
import { recalculateReadinessForProject } from "@/lib/kebu-id/recalculate-hooks";
import { assertProjectPlanLimit } from "@/lib/billing/enforce-limits";

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

  let { data: products, error } = await supabase
    .from("project_products")
    .select(PRODUCT_SELECT)
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error && /is_subscription|subscription_interval/i.test(error.message ?? "")) {
    const codes = await supabase
      .from("project_products")
      .select(PRODUCT_SELECT_CODES)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    products = (codes.data ?? []).map((row) => ({
      ...row,
      is_subscription: false,
      subscription_interval: null,
    }));
    error = codes.error;
  }

  if (error && /track_stock|stock_qty/i.test(error.message ?? "")) {
    const codes = await supabase
      .from("project_products")
      .select(PRODUCT_SELECT_CODES)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    products = (codes.data ?? []).map((row) => ({
      ...row,
      track_stock: false,
      stock_qty: null,
      is_subscription: false,
      subscription_interval: null,
    }));
    error = codes.error;
  }

  if (error && /upc|sku/i.test(error.message ?? "")) {
    const mid = await supabase
      .from("project_products")
      .select(PRODUCT_SELECT_MID)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    products = (mid.data ?? []).map((row) => ({
      ...row,
      upc: null,
      sku: null,
      track_stock: false,
      stock_qty: null,
      is_subscription: false,
      subscription_interval: null,
    }));
    error = mid.error;
  }

  if (error && /price_xof/i.test(error.message ?? "")) {
    const fallback = await supabase
      .from("project_products")
      .select(PRODUCT_SELECT_LEGACY)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    products = (fallback.data ?? []).map((row) => ({
      ...row,
      price_xof: null,
      upc: null,
      sku: null,
      track_stock: false,
      stock_qty: null,
      is_subscription: false,
      subscription_interval: null,
    }));
    error = fallback.error;
  }

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

  const planGate = await assertProjectPlanLimit(supabase, projectId, user.id, "maxProducts");
  if (!planGate.ok) {
    return NextResponse.json(
      { error: planGate.error, upgradeHint: planGate.upgradeHint, tier: planGate.tier },
      { status: 403 },
    );
  }

  const { resolveSellerTrust, sellerTrustDenyProductMessage } = await import("@/lib/shop/seller-trust");
  const trust = await resolveSellerTrust(supabase, { projectId, userId: user.id });
  if (!trust.canAddProduct) {
    return NextResponse.json(
      { error: sellerTrustDenyProductMessage(trust), sellerTrust: trust },
      { status: 403 },
    );
  }

  const { data: last } = await supabase
    .from("project_products")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = parsed.data.sortOrder ?? (last?.sort_order ?? 0) + 1;

  const insertRow: Record<string, unknown> = {
    project_id: projectId,
    business_id: project.business_id,
    name: parsed.data.name,
    description: parsed.data.description,
    price_label: parsed.data.priceLabel,
    image_url: parsed.data.imageUrl,
    whatsapp_order_message: parsed.data.whatsappOrderMessage,
    sort_order: sortOrder,
    is_active: parsed.data.isActive ?? true,
  };
  if (parsed.data.priceXof !== undefined) {
    insertRow.price_xof = parsed.data.priceXof;
  }
  if (parsed.data.upc !== undefined) {
    insertRow.upc = parsed.data.upc;
  }
  if (parsed.data.sku !== undefined) {
    insertRow.sku = parsed.data.sku;
  }
  if (parsed.data.trackStock !== undefined) {
    insertRow.track_stock = parsed.data.trackStock;
    insertRow.stock_qty = parsed.data.trackStock
      ? (parsed.data.stockQty ?? 0)
      : null;
  }
  if (parsed.data.isSubscription !== undefined) {
    insertRow.is_subscription = parsed.data.isSubscription;
    insertRow.subscription_interval = parsed.data.isSubscription
      ? (parsed.data.subscriptionInterval ?? "monthly")
      : null;
  }

  let { data: product, error } = await supabase
    .from("project_products")
    .insert(insertRow)
    .select(PRODUCT_SELECT)
    .single();

  if (error && /is_subscription|subscription_interval/i.test(error.message ?? "")) {
    delete insertRow.is_subscription;
    delete insertRow.subscription_interval;
    const retry = await supabase
      .from("project_products")
      .insert(insertRow)
      .select(PRODUCT_SELECT_CODES)
      .single();
    product = retry.data
      ? {
          ...retry.data,
          is_subscription: false,
          subscription_interval: null,
        }
      : null;
    error = retry.error;
  }

  if (error && /track_stock|stock_qty/i.test(error.message ?? "")) {
    delete insertRow.track_stock;
    delete insertRow.stock_qty;
    const retry = await supabase
      .from("project_products")
      .insert(insertRow)
      .select(PRODUCT_SELECT_CODES)
      .single();
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
    if (/duplicate|unique/i.test(error.message ?? "")) {
      return NextResponse.json(
        { error: "That UPC or SKU is already used on another product in this shop." },
        { status: 409 },
      );
    }
    delete insertRow.upc;
    delete insertRow.sku;
    const retry = await supabase
      .from("project_products")
      .insert(insertRow)
      .select(PRODUCT_SELECT_MID)
      .single();
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
    delete insertRow.price_xof;
    delete insertRow.upc;
    delete insertRow.sku;
    const retry = await supabase
      .from("project_products")
      .insert(insertRow)
      .select(PRODUCT_SELECT_LEGACY)
      .single();
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
    logCreate("products.add_failed", { userId: user.id, projectId, message: error?.message });
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "Products table missing. Apply migration 022."
          : /duplicate|unique/i.test(error?.message ?? "")
            ? "That UPC or SKU is already used on another product in this shop."
            : "Could not save product.",
        detail: error?.message,
      },
      { status: /duplicate|unique/i.test(error?.message ?? "") ? 409 : 500 },
    );
  }

  await recalculateReadinessForProject(supabase, projectId);
  const { syncCatalogToProductsSections } = await import("@/lib/create/sync-catalog-to-sections");
  await syncCatalogToProductsSections(supabase, projectId);
  logCreate("products.added", { userId: user.id, projectId, productId: product.id });

  return NextResponse.json({ product });
}
