import type { SupabaseClient } from "@supabase/supabase-js";

export type StockState = {
  trackStock: boolean;
  stockQty: number | null;
};

export function isInStock(state: StockState, quantity: number): boolean {
  if (!state.trackStock) return true;
  const q = state.stockQty ?? 0;
  return q >= quantity && quantity > 0;
}

/** Atomically decrement stock when tracking. No-op if track_stock is false. */
export async function decrementProductStock(
  admin: SupabaseClient,
  productId: string,
  quantity: number,
): Promise<{ ok: true; remaining: number | null } | { ok: false; error: string }> {
  if (quantity < 1) return { ok: false, error: "Invalid quantity." };

  const { data: product, error } = await admin
    .from("project_products")
    .select("id, track_stock, stock_qty")
    .eq("id", productId)
    .maybeSingle();

  if (error && /track_stock|stock_qty/i.test(error.message ?? "")) {
    return { ok: true, remaining: null };
  }
  if (error || !product) return { ok: false, error: "Product not found for stock." };
  if (!product.track_stock) return { ok: true, remaining: null };

  const current = typeof product.stock_qty === "number" ? product.stock_qty : 0;
  if (current < quantity) {
    return { ok: false, error: "Not enough stock for that product." };
  }

  const next = current - quantity;
  const { data: updated, error: updErr } = await admin
    .from("project_products")
    .update({ stock_qty: next, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("track_stock", true)
    .gte("stock_qty", quantity)
    .select("stock_qty")
    .maybeSingle();

  if (updErr || !updated) {
    return { ok: false, error: "Stock changed — refresh and try again." };
  }
  return { ok: true, remaining: updated.stock_qty };
}

export async function restoreProductStock(
  admin: SupabaseClient,
  productId: string,
  quantity: number,
): Promise<void> {
  if (quantity < 1) return;
  const { data: product } = await admin
    .from("project_products")
    .select("id, track_stock, stock_qty")
    .eq("id", productId)
    .maybeSingle();
  if (!product?.track_stock) return;
  const current = typeof product.stock_qty === "number" ? product.stock_qty : 0;
  await admin
    .from("project_products")
    .update({ stock_qty: current + quantity, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("track_stock", true);
}

/** Decrement each line; on failure restore prior decrements in reverse. */
export async function decrementCartStock(
  admin: SupabaseClient,
  lines: { productId: string; quantity: number }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const done: { productId: string; quantity: number }[] = [];
  for (const line of lines) {
    const res = await decrementProductStock(admin, line.productId, line.quantity);
    if (!res.ok) {
      for (const prev of done.reverse()) {
        await restoreProductStock(admin, prev.productId, prev.quantity);
      }
      return { ok: false, error: res.error };
    }
    done.push(line);
  }
  return { ok: true };
}


export async function reserveShopCheckout(
  admin: SupabaseClient,
  opts: { orderId: string; projectId: string; productId: string; quantity: number; discountId?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await admin.rpc("reserve_shop_checkout", {
    p_order_id: opts.orderId,
    p_project_id: opts.projectId,
    p_product_id: opts.productId,
    p_quantity: opts.quantity,
    p_discount_id: opts.discountId ?? null,
    p_ttl_minutes: 20,
  });
  if (error || data !== true) return { ok: false, error: "Product or discount is no longer available." };
  return { ok: true };
}

export type MultiCheckoutLine = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

/** Atomic all-or-nothing multi-line reservation via reserve_multi_shop_checkout RPC. */
export async function reserveMultiShopCheckout(
  admin: SupabaseClient,
  opts: {
    orderId: string;
    projectId: string;
    lines: MultiCheckoutLine[];
    discountId?: string | null;
    ttlMinutes?: number;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const lines = opts.lines.map((l) => ({
    product_id: l.productId,
    variant_id: l.variantId ?? null,
    quantity: l.quantity,
  }));
  const { data, error } = await admin.rpc("reserve_multi_shop_checkout", {
    p_order_id: opts.orderId,
    p_project_id: opts.projectId,
    p_lines: lines,
    p_discount_id: opts.discountId ?? null,
    p_ttl_minutes: opts.ttlMinutes ?? 20,
  });
  if (error || data !== true) return { ok: false, error: "One or more items are no longer available." };
  return { ok: true };
}

export async function commitShopCheckout(admin: SupabaseClient, orderId: string): Promise<boolean> {
  const { data, error } = await admin.rpc("commit_shop_checkout", { p_order_id: orderId });
  return !error && data === true;
}

export async function releaseShopCheckout(admin: SupabaseClient, orderId: string): Promise<void> {
  if (!orderId) return;
  await admin.rpc("release_shop_checkout", { p_order_id: orderId });
}
