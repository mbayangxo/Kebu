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

  const { data, error } = await admin.rpc("decrement_product_stock_atomic", {
    p_product_id: productId,
    p_quantity: quantity,
  });

  if (error) return { ok: false, error: "Could not reserve stock." };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.ok) return { ok: false, error: "Not enough stock for that product." };
  return { ok: true, remaining: typeof row.remaining === "number" ? row.remaining : null };
}

export async function restoreProductStock(
  admin: SupabaseClient,
  productId: string,
  quantity: number,
): Promise<void> {
  if (quantity < 1) return;
  await admin.rpc("restore_product_stock_atomic", {
    p_product_id: productId,
    p_quantity: quantity,
  });
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

export async function commitShopCheckout(admin: SupabaseClient, orderId: string): Promise<boolean> {
  const { data, error } = await admin.rpc("commit_shop_checkout", { p_order_id: orderId });
  return !error && data === true;
}

export async function releaseShopCheckout(admin: SupabaseClient, orderId: string): Promise<void> {
  if (!orderId) return;
  await admin.rpc("release_shop_checkout", { p_order_id: orderId });
}
