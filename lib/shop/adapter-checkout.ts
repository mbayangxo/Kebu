import type { SupabaseClient } from "@supabase/supabase-js";
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

/** Persist provider columns; tolerate DBs that have not applied migration 051 yet. */
async function persistProviderFields(
  admin: SupabaseClient,
  orderId: string,
  fields: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await admin.from("shop_orders").update(fields).eq("id", orderId);
  if (!error) return { ok: true };

  if (/payment_provider|provider_reference|provider_payment_id/i.test(error.message)) {
    const legacy: Record<string, unknown> = { ...fields };
    delete legacy.payment_provider;
    delete legacy.provider_reference;
    delete legacy.provider_payment_id;
    if (Object.keys(legacy).length === 0) return { ok: true };
    const retry = await admin.from("shop_orders").update(legacy).eq("id", orderId);
    if (retry.error) return { ok: false, error: retry.error.message };
    return { ok: true };
  }
  return { ok: false, error: error.message };
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
  // Idempotency: if a PSP session already exists for this order, return it
  // without creating a new external session.
  const { data: existingOrder } = await opts.admin
    .from("shop_orders")
    .select("payment_status, payment_provider, provider_reference, provider_payment_id")
    .eq("id", opts.orderId)
    .maybeSingle();
  if (
    existingOrder?.payment_status === "awaiting_payment" &&
    existingOrder.provider_reference &&
    existingOrder.payment_provider
  ) {
    const provider = existingOrder.payment_provider as string;
    const reference = existingOrder.provider_reference as string;
    const base = opts.appUrl.replace(/\/$/, "");
    const q = `order=${encodeURIComponent(opts.orderId)}&psp=${encodeURIComponent(provider)}`;
    const paymentUrl = `${base}/sites/order-thanks?${q}`;
    return { ok: true, paymentUrl, provider, reference };
  }

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
    const persisted = await persistProviderFields(opts.admin, opts.orderId, {
      payment_provider: "joko",
      provider_reference: joko.reference,
      provider_payment_id: joko.paymentId ?? null,
      updated_at: new Date().toISOString(),
    });
    if (!persisted.ok) {
      // Checkout URL still valid; joko_reference was written by startShopOrderJokoCheckout
      console.warn(
        JSON.stringify({
          event: "shop.provider_fields_persist_failed",
          orderId: opts.orderId,
          error: persisted.error,
        }),
      );
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

  const persisted = await persistProviderFields(opts.admin, opts.orderId, {
    payment_status: "awaiting_payment",
    payment_provider: provider,
    provider_reference: reference,
    provider_payment_id: result.providerPaymentId,
    amount_xof: opts.amountXof,
    updated_at: new Date().toISOString(),
  });

  if (!persisted.ok) {
    console.error(JSON.stringify({ event: "shop.provider_persist_failed", orderId: opts.orderId, error: persisted.error }));
    return {
      ok: false,
      configured: true,
      error: "Checkout was created but could not be saved. Please contact support.",
    };
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

/**
 * Mark a shop order paid via the atomic complete_shop_payment RPC.
 * Used by non-Paystack webhook handlers (Joko, PayPal, Wave, Orange Money).
 * Paystack has its own webhook route that calls the RPC directly.
 */
export async function markShopOrderPaidByProviderRef(
  admin: SupabaseClient,
  opts: {
    reference: string;
    paymentId?: string | null;
    provider?: string | null;
    expectedOrderId?: string | null;
    expectedProjectId?: string | null;
    expectedAmountXof?: number | null;
  },
): Promise<{ ok: true; orderId: string; projectId: string; alreadyPaid: boolean } | { ok: false; error: string }> {
  const provider = opts.provider?.trim().toLowerCase();
  if (!provider) return { ok: false, error: "Payment provider is required." };

  const { data: completed, error } = await admin.rpc("complete_shop_payment", {
    p_reference: opts.reference,
    p_provider: provider,
    p_payment_id: opts.paymentId ?? null,
    p_expected_order_id: opts.expectedOrderId ?? null,
    p_expected_project_id: opts.expectedProjectId ?? null,
    p_expected_amount_xof: opts.expectedAmountXof ?? null,
  });

  if (error) return { ok: false, error: error.message };

  const rows = Array.isArray(completed) ? completed : completed ? [completed] : [];
  if (rows.length === 0) return { ok: false, error: "Order not found." };

  const paid = rows[0] as { order_id: string; project_id: string; already_paid: boolean };
  return {
    ok: true,
    orderId: paid.order_id,
    projectId: paid.project_id,
    alreadyPaid: Boolean(paid.already_paid),
  };
}
