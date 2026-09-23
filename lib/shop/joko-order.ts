import { createJokoCheckout } from "@/lib/joko/payments";
import { jokoCheckoutAvailable } from "@/lib/create/site-commerce";
import { xofToCauris } from "@/lib/shop/cauris";
import type { SupabaseClient } from "@supabase/supabase-js";

export { jokoCheckoutAvailable };

/** Digits from a price label like "8,000 XOF" → 8000. */
export function parseXofFromLabel(label: string | null | undefined): number | null {
  if (!label) return null;
  const digits = label.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, 50_000_000);
}

/**
 * Rough XOF → USD cents for legacy Joko / hosting paths that still post USD.
 * Shop Partner checkout uses amount_xof directly — prefer that.
 * ~600 XOF ≈ 1 USD (configurable via JOKO_XOF_PER_USD).
 */
export function xofToUsdCents(amountXof: number): number {
  const rate = Number(process.env.JOKO_XOF_PER_USD ?? "600");
  const per = Number.isFinite(rate) && rate > 0 ? rate : 600;
  return Math.max(1, Math.round(amountXof / per) * 100);
}

export async function startShopOrderJokoCheckout(opts: {
  admin: SupabaseClient;
  orderId: string;
  projectId: string;
  amountXof: number;
  productName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  appUrl: string;
  returnUrl?: string;
  cancelUrl?: string;
}): Promise<
  | { ok: true; paymentUrl: string; reference: string; paymentId: string | null }
  | { ok: false; error: string; configured: boolean }
> {
  if (!jokoCheckoutAvailable()) {
    return {
      ok: false,
      configured: false,
      error: "JOKO is not configured on this server (JOKO_API_BASE_URL + JOKO_API_SECRET).",
    };
  }

  const reference = `shop_order_${opts.orderId.replace(/-/g, "").slice(0, 24)}`;
  const cauris = xofToCauris(opts.amountXof);
  const base = opts.appUrl.replace(/\/$/, "");

  // Partner API prefers amount_xof + customer.phone (USD cents only as legacy bridge).
  const checkout = await createJokoCheckout({
    reference,
    amountXof: opts.amountXof,
    description: `Shop order: ${opts.productName}`.slice(0, 120),
    customerPhone: opts.customerPhone ?? undefined,
    customerEmail: opts.customerEmail ?? undefined,
    returnUrl: opts.returnUrl ?? `${base}/sites/order-thanks?order=${opts.orderId}&psp=joko`,
    cancelUrl: opts.cancelUrl ?? `${base}/sites/order-cancel?order=${opts.orderId}&psp=joko`,
    webhookUrl: `${base}/api/webhooks/joko`,
    metadata: {
      kind: "shop_order",
      order_id: opts.orderId,
      project_id: opts.projectId,
      amount_xof: String(opts.amountXof),
      amount_cauris: String(cauris.cauris),
      currency: "CAURIS",
    },
  });

  if (!checkout.ok) {
    return { ok: false, configured: checkout.configured, error: checkout.error };
  }

  const paymentId = checkout.paymentId ?? null;
  const { error } = await opts.admin
    .from("shop_orders")
    .update({
      payment_status: "awaiting_payment",
      joko_reference: reference,
      joko_payment_id: paymentId,
      amount_xof: opts.amountXof,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.orderId);

  if (error) {
    return { ok: false, configured: true, error: `JOKO session started but order update failed: ${error.message}` };
  }

  return { ok: true, paymentUrl: checkout.paymentUrl, reference, paymentId };
}

export async function markShopOrderPaid(
  admin: SupabaseClient,
  reference: string,
  paymentId: string | null,
  expected?: { orderId?: string | null; projectId?: string | null; amountXof?: number | null },
): Promise<{ ok: true; orderId: string; projectId: string; alreadyPaid: boolean } | { ok: false; error: string }> {
  const { data: completed, error } = await admin.rpc("complete_shop_payment", {
    p_reference: reference,
    p_provider: "joko",
    p_payment_id: paymentId,
    p_expected_order_id: expected?.orderId ?? null,
    p_expected_project_id: expected?.projectId ?? null,
    p_expected_amount_xof: expected?.amountXof ?? null,
  });
  const paid = Array.isArray(completed) ? completed[0] : completed;

  if (error) return { ok: false, error: error.message };
  if (!paid?.order_id || !paid?.project_id) return { ok: false, error: "Order not found." };

  return {
    ok: true,
    orderId: paid.order_id,
    projectId: paid.project_id,
    alreadyPaid: Boolean(paid.already_paid),
  };
}
