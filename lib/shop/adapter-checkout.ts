import type { SupabaseClient } from "@supabase/supabase-js";
import { beginShopProviderCheckout, finishShopProviderCheckout } from "@/lib/shop/checkout-persistence";
import { getShopPaymentAdapter } from "@/lib/payments/registry";
import { startShopOrderJokoCheckout } from "@/lib/shop/joko-order";
import {
  railFromProvider,
  recordPaymentLedgerEvent,
} from "@/lib/shop/payment-ledger";

export type AdapterCheckoutStart =
  | { ok: true; paymentUrl: string; provider: string; reference: string }
  | { ok: false; error: string; configured: boolean; fallbackInstructions?: boolean };

function appReturnUrls(appUrl: string, orderId: string, psp: string) {
  const base = appUrl.replace(/\/$/, "");
  const q = `order=${encodeURIComponent(orderId)}&psp=${encodeURIComponent(psp)}`;
  return {
    returnUrl: `${base}/sites/order-thanks?${q}`,
    cancelUrl: `${base}/sites/order-cancel?${q}`,
  };
}

/**
 * Start live PSP checkout for a saved shop order.
 * Never marks paid — webhook / capture does.
 */
export async function startShopOrderProviderCheckout(opts: {
  admin: SupabaseClient;
  orderId: string;
  projectId: string;
  amountXof: number;
  productName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  paymentPreference: string;
  appUrl: string;
}): Promise<AdapterCheckoutStart> {
  const email = opts.customerEmail?.trim() || "";
  if (
    (opts.paymentPreference === "card" || opts.paymentPreference === "paypal") &&
    !email
  ) {
    return {
      ok: false,
      configured: true,
      fallbackInstructions: true,
      error:
        "Add your email so we can start card/PayPal checkout — order is saved unpaid; WhatsApp still works.",
    };
  }

  if (opts.paymentPreference === "joko") {
    const urls = appReturnUrls(opts.appUrl, opts.orderId, "joko");
    const joko = await startShopOrderJokoCheckout({
      admin: opts.admin,
      orderId: opts.orderId,
      projectId: opts.projectId,
      amountXof: opts.amountXof,
      productName: opts.productName,
      customerEmail: opts.customerEmail,
      customerPhone: opts.customerPhone,
      appUrl: opts.appUrl,
      returnUrl: urls.returnUrl,
      cancelUrl: urls.cancelUrl,
    });
    if (!joko.ok) {
      return {
        ok: false,
        error: joko.error,
        configured: joko.configured,
        fallbackInstructions: !joko.configured,
      };
    }
    await recordPaymentLedgerEvent(opts.admin, {
      projectId: opts.projectId,
      orderId: opts.orderId,
      rail: "joko",
      eventType: "checkout_started",
      amountXof: opts.amountXof,
      currency: "CAURIS",
      provider: "joko",
      providerReference: joko.reference,
      meta: { paymentId: joko.paymentId ?? null },
    });
    return {
      ok: true,
      paymentUrl: joko.paymentUrl,
      provider: "joko",
      reference: joko.reference,
    };
  }

  const adapter = getShopPaymentAdapter(opts.paymentPreference);
  if (!adapter) {
    return {
      ok: false,
      configured: false,
      fallbackInstructions: true,
      error: "No live adapter for this method — order saved; follow shop instructions / WhatsApp.",
    };
  }
  if (!adapter.isConfigured()) {
    return {
      ok: false,
      configured: false,
      fallbackInstructions: true,
      error: `${adapter.id} is not configured on the server — order saved unpaid with your pay preference.`,
    };
  }

  const reference = `shop_${adapter.id}_${opts.orderId.replace(/-/g, "").slice(0, 20)}`;
  const provider =
    opts.paymentPreference === "mobile_money"
      ? adapter.id
      : opts.paymentPreference === "card"
        ? "paystack"
        : opts.paymentPreference;

  const urls = appReturnUrls(opts.appUrl, opts.orderId, provider);
  if (!await beginShopProviderCheckout(opts.admin,{...opts,provider,reference})) {
    return {ok:false,configured:true,error:"Checkout already started or needs reconciliation. Contact the shop."};
  }
  const result = await adapter.createCheckout({
    reference,
    amountMinor: opts.amountXof,
    currency: "XOF",
    description: `Shop: ${opts.productName}`.slice(0, 120),
    customerEmail: email || undefined,
    customerPhone: opts.customerPhone ?? undefined,
    returnUrl: urls.returnUrl,
    cancelUrl: urls.cancelUrl,
    webhookUrl: `${opts.appUrl.replace(/\/$/, "")}/api/webhooks/${adapter.id === "card" ? "paystack" : adapter.id}`,
    metadata: {
      kind: "shop_order",
      order_id: opts.orderId,
      project_id: opts.projectId,
      amount_xof: String(opts.amountXof),
    },
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      configured: result.configured,
      fallbackInstructions: !result.configured,
    };
  }

  const finished = await finishShopProviderCheckout(opts.admin,{
    ...opts,provider,reference,paymentId:result.providerPaymentId,checkoutUrl:result.checkoutUrl,
    amount:result.providerAmount,expiresAt:result.expiresAt,
  });
  if (!finished) {
    return {ok:false,configured:true,error:"Checkout started but needs reconciliation. Contact the shop."};
  }

  await recordPaymentLedgerEvent(opts.admin, {
    projectId: opts.projectId,
    orderId: opts.orderId,
    rail: railFromProvider(provider),
    eventType: "checkout_started",
    amountXof: opts.amountXof,
    provider,
    providerReference: reference,
    meta: { preference: opts.paymentPreference },
  });

  return {
    ok: true,
    paymentUrl: result.checkoutUrl,
    provider,
    reference,
  };
}

export async function markShopOrderPaidByProviderRef(
  admin: SupabaseClient,
  opts: {
    reference: string;
    paymentId?: string | null;
    provider?: string | null;
  },
): Promise<{ ok: true; orderId: string; projectId: string } | { ok: false; error: string }> {
  return markVerifiedShopPayment(admin, opts);
}
import { markVerifiedShopPayment } from "@/lib/shop/checkout-persistence";
