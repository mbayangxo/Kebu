import type { SupabaseClient } from "@supabase/supabase-js";

export type StockState = { trackStock: boolean; stockQty: number | null };
const validQuantity = (quantity: number) => Number.isInteger(quantity) && quantity > 0 && quantity <= 2147483647;
export function isInStock(state: StockState, quantity: number): boolean {
  return validQuantity(quantity) && (!state.trackStock || (state.stockQty ?? 0) >= quantity);
}

/** Server-only SQL updates relative stock under a row lock; never fall back to absolute writes. */
export async function decrementProductStock(admin: SupabaseClient, productId: string, quantity: number):
Promise<{ ok: true; remaining: number | null } | { ok: false; error: string }> {
  if (!validQuantity(quantity)) return { ok: false, error: "Invalid quantity." };
  const { data, error } = await admin.rpc("decrement_shop_stock_atomic", { p_product_id: productId, p_quantity: quantity });
  if (error || data?.ok !== true) return { ok: false, error: typeof data?.error === "string" ? data.error : "Could not reserve product stock. Please try again." };
  if (data.remaining !== null && (!Number.isInteger(data.remaining) || data.remaining < 0))
    return { ok: false, error: "Could not verify product stock." };
  return { ok: true, remaining: data.remaining };
}

export async function restoreProductStock(admin: SupabaseClient, productId: string, quantity: number): Promise<void> {
  if (!validQuantity(quantity)) throw Error("Invalid stock restoration quantity.");
  const { error } = await admin.rpc("restore_shop_stock_atomic", { p_product_id: productId, p_quantity: quantity });
  if (error) throw Error("Could not restore product stock: " + error.message);
}

/** Validate and decrement every line in one transaction, including duplicate products. */
export async function decrementCartStock(admin: SupabaseClient, lines: { productId: string; quantity: number }[]):
Promise<{ ok: true } | { ok: false; error: string }> {
  if (!lines.length || lines.length > 100 || lines.some(line => !validQuantity(line.quantity))) return { ok: false, error: "Invalid cart stock request." };
  const { data, error } = await admin.rpc("decrement_shop_cart_stock_atomic", { p_lines: lines.map(line => ({ product_id: line.productId, quantity: line.quantity })) });
  if (error || data?.ok !== true) return { ok: false, error: typeof data?.error === "string" ? data.error : "Could not reserve cart stock. Please try again." };
  return { ok: true };
}
