import type { SupabaseClient } from "@supabase/supabase-js";

export async function beginShopProviderCheckout(admin: SupabaseClient, opts: {orderId:string;projectId:string;provider:string;reference:string;amountXof:number}): Promise<boolean> {
  const {data,error}=await admin.rpc("begin_shop_provider_checkout",{
    p_order_id:opts.orderId,p_project_id:opts.projectId,p_provider:opts.provider,
    p_reference:opts.reference,p_amount_xof:opts.amountXof,
  });
  return !error && data===true;
}
export async function finishShopProviderCheckout(admin: SupabaseClient, opts: {orderId:string;projectId:string;provider:string;reference:string;paymentId:string|null;checkoutUrl:string;amount?:{value:string;currency:string};expiresAt?:string}): Promise<boolean> {
  const {data,error}=await admin.rpc("finish_shop_provider_checkout",{
    p_order_id:opts.orderId,p_project_id:opts.projectId,p_provider:opts.provider,p_reference:opts.reference,
    p_payment_id:opts.paymentId,p_checkout_url:opts.checkoutUrl,
    p_amount_value:opts.amount?.value??null,p_currency:opts.amount?.currency??null,p_expires_at:opts.expiresAt??null,
  });
  return !error && data===true;
}

/** All financial and inventory effects either commit with every item or roll back. */
export async function saveShopCheckout(
  admin: SupabaseClient,
  order: Record<string, unknown>,
  items: Record<string, unknown>[],
  tender: { discountId?: string | null; giftCardId?: string | null; expectedGiftBalance?: number | null } = {},
): Promise<{ ok: true; order: { id: string; order_number: string | null; gift_public_id: string | null; paid?: boolean; replayed?: boolean } } | { ok: false; error: string }> {
  const { data, error } = await admin.rpc("save_shop_checkout_atomic", {
    p_order: order,
    p_items: items,
    p_discount_id: tender.discountId ?? null,
    p_gift_card_id: tender.giftCardId ?? null,
    p_expected_gift_balance: tender.expectedGiftBalance ?? null,
  });
  if (error || typeof data?.id !== "string") {
    const message = error?.message ?? "";
    const safe = /^(Not enough (product|variant) stock\.|A (product|variant) is no longer available\.|Choose a product variant\.|Discount changed or reached its use limit\. Please try again\.|Gift card balance changed\. Please try again\.)$/.test(message);
    return { ok: false, error: safe ? message : "Could not save order. Please try again." };
  }
  return { ok: true, order: data };
}

export async function markVerifiedShopPayment(
  admin: SupabaseClient,
  opts: { reference: string; provider?: string | null; paymentId?: string | null },
): Promise<{ ok: true; orderId: string; projectId: string } | { ok: false; error: string }> {
  if (!opts.provider) return { ok: false, error: "A verified payment provider is required." };
  const { data, error } = await admin.rpc("mark_verified_shop_payment", {
    p_reference: opts.reference,
    p_provider: opts.provider ?? null,
    p_payment_id: opts.paymentId ?? null,
  });
  if (error || typeof data?.orderId !== "string" || typeof data?.projectId !== "string") {
    return { ok: false, error: "Could not reconcile payment with this order." };
  }
  return { ok: true, orderId: data.orderId, projectId: data.projectId };
}
