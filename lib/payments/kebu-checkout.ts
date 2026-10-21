/**
 * The Kebu Checkout — one multi-provider checkout starter shared by every
 * first-party purchase inside the app (Studio Creative Assets, the
 * template/aesthetics marketplace, and in time anything else that isn't a
 * Shop order). Not a new payment integration: it's the same adapter
 * registry Shop's own checkout already uses (lib/payments/registry.ts —
 * Joko, Wave, Orange Money, Paystack/card, PayPal), so a buyer picks a
 * method once and it works the same way everywhere in Kebu.
 *
 * Never marks anything paid here — that only ever happens from a verified
 * webhook (see mark-purchase-paid.ts), exactly like every other payment
 * path in this app.
 */
import { createJokoCheckout } from "@/lib/joko/payments";
import { waveAdapter, orangeMoneyAdapter, paystackAdapter, paypalAdapter, shopPaymentAdapterStatus } from "@/lib/payments/registry";

export const KEBU_CHECKOUT_METHODS = ["joko", "wave", "orange_money", "card", "paypal"] as const;
export type KebuCheckoutMethod = (typeof KEBU_CHECKOUT_METHODS)[number];

export type KebuCheckoutResult =
  | { ok: true; paymentUrl: string; provider: KebuCheckoutMethod; providerPaymentId?: string; settlement?: { amountMinor: number; currency: "XOF" } }
  | { ok: false; error: string; configured: boolean };

/** Which methods are actually usable right now — same status Shop's own checkout exposes. */
export function kebuCheckoutMethodsAvailable(): Record<KebuCheckoutMethod, boolean> {
  const status = shopPaymentAdapterStatus();
  return {
    joko: status.joko?.configured ?? false,
    wave: status.wave?.configured ?? false,
    orange_money: status.orange_money?.configured ?? false,
    card: status.card?.configured ?? false,
    paypal: status.paypal?.configured ?? false,
  };
}

export async function startKebuCheckout(opts: {
  method: KebuCheckoutMethod;
  reference: string;
  /** Minor units (centimes for XOF — i.e. the whole XOF amount — or USD cents) of whichever `currency` is given. */
  amountMinor: number;
  currency: "XOF" | "USD";
  description: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  returnUrl: string;
  cancelUrl: string;
  webhookBaseUrl: string;
  metadata: Record<string, string>;
}): Promise<KebuCheckoutResult> {
  try {
    if (!Number.isSafeInteger(opts.amountMinor) || opts.amountMinor <= 0) return { ok: false, error: "Payment amount must be a positive integer in the declared currency's minor units.", configured: true };
    if (opts.method === "joko") {
      const checkout = await createJokoCheckout({
        reference: opts.reference,
        ...(opts.currency === "XOF" ? { amountXof: opts.amountMinor } : { amountUsdCents: opts.amountMinor }),
        description: opts.description,
        customerEmail: opts.customerEmail ?? undefined,
        customerPhone: opts.customerPhone ?? undefined,
        returnUrl: opts.returnUrl,
        cancelUrl: opts.cancelUrl,
        webhookUrl: `${opts.webhookBaseUrl.replace(/\/$/, "")}/api/webhooks/joko`,
        metadata: opts.metadata,
      });
      if (!checkout.ok) return { ok: false, error: checkout.error, configured: checkout.configured };
      return { ok: true, paymentUrl: checkout.paymentUrl, provider: "joko", providerPaymentId: checkout.paymentId };
    }

    // Orange Money has no documented conversion path. Wave validates and snapshots its explicit quote.
    if (opts.method === "orange_money" && opts.currency !== "XOF") {
      return { ok: false, error: `${opts.method} only supports XOF, not ${opts.currency}.`, configured: false };
    }

    // A buyer-selected rail must not use Shop's generic mobile-money fallback.
    const adapter = { wave: waveAdapter, orange_money: orangeMoneyAdapter, card: paystackAdapter, paypal: paypalAdapter }[opts.method];
    if (!adapter) return { ok: false, error: `No live adapter for ${opts.method}.`, configured: false };
    if (!adapter.isConfigured()) {
      return { ok: false, error: `${adapter.id} is not configured on this server.`, configured: false };
    }

    const result = await adapter.createCheckout({
      reference: opts.reference,
      amountMinor: opts.amountMinor,
      currency: opts.currency,
      description: opts.description.slice(0, 120),
      customerEmail: opts.customerEmail ?? undefined,
      customerPhone: opts.customerPhone ?? undefined,
      returnUrl: opts.returnUrl,
      cancelUrl: opts.cancelUrl,
      webhookUrl: `${opts.webhookBaseUrl.replace(/\/$/, "")}/api/webhooks/${adapter.id === "card" ? "paystack" : adapter.id}`,
      metadata: opts.metadata,
    });
    if (!result.ok) return { ok: false, error: result.error, configured: result.configured };
    return { ok: true, paymentUrl: result.checkoutUrl, provider: opts.method, providerPaymentId: result.providerPaymentId, ...(result.settlement ? { settlement: result.settlement } : {}) };
  } catch {
    return { ok: false, configured: true, error: "The payment provider could not be reached. Please try again." };
  }

}
