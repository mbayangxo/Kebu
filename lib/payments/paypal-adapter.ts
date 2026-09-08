/**
 * PayPal Orders API v2 — live checkout when PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET set.
 * Paid only after webhook (PAYMENT.CAPTURE.COMPLETED) — never from the browser.
 */

import type { PaymentAdapter, PaymentAdapterCheckoutInput, PaymentAdapterCheckoutResult } from "./adapters";

function paypalBase(): string {
  const mode = (process.env.PAYPAL_MODE ?? "sandbox").toLowerCase();
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function paypalConfigured(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim(),
  );
}

async function paypalAccessToken(): Promise<string | null> {
  const id = process.env.PAYPAL_CLIENT_ID?.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

/** Amount in major units string for PayPal (e.g. "12.50"). Input amountMinor = cents. */
function majorFromMinor(amountMinor: number, currency: string): string {
  const c = currency.toUpperCase();
  // XOF/XAF have no minor units in PayPal — send integer string
  if (c === "XOF" || c === "XAF") return String(Math.max(1, Math.round(amountMinor)));
  return (Math.max(1, amountMinor) / 100).toFixed(2);
}

export const paypalAdapter: PaymentAdapter = {
  id: "paypal",
  isConfigured: paypalConfigured,
  async createCheckout(input: PaymentAdapterCheckoutInput): Promise<PaymentAdapterCheckoutResult> {
    if (!paypalConfigured()) {
      return { ok: false, configured: false, error: "PayPal not configured (PAYPAL_CLIENT_ID + SECRET)." };
    }
    const token = await paypalAccessToken();
    if (!token) {
      return { ok: false, configured: true, error: "PayPal auth failed." };
    }
    const currencyIn = (input.currency || "USD").toUpperCase();
    // PayPal rarely supports XOF — convert to USD like JOKO when needed
    let currency = currencyIn;
    let value = majorFromMinor(input.amountMinor, currencyIn);
    if (currencyIn === "XOF" || currencyIn === "XAF") {
      const rate = Number(process.env.PAYPAL_XOF_PER_USD ?? process.env.JOKO_XOF_PER_USD ?? "600");
      const per = Number.isFinite(rate) && rate > 0 ? rate : 600;
      currency = "USD";
      value = Math.max(0.01, input.amountMinor / per).toFixed(2);
    }
    const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": input.reference.slice(0, 36),
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.reference.slice(0, 256),
            description: input.description.slice(0, 127),
            custom_id: input.reference.slice(0, 127),
            amount: { currency_code: currency, value },
          },
        ],
        application_context: {
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
        },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      links?: { rel: string; href: string }[];
      message?: string;
      details?: { description?: string }[];
    };
    if (!res.ok || !data.id) {
      return {
        ok: false,
        configured: true,
        error: data.message || data.details?.[0]?.description || "PayPal create order failed.",
      };
    }
    const approve = data.links?.find((l) => l.rel === "approve")?.href;
    if (!approve) {
      return { ok: false, configured: true, error: "PayPal approve link missing." };
    }
    return { ok: true, checkoutUrl: approve, providerPaymentId: data.id };
  },
};

export async function paypalCaptureOrder(orderId: string): Promise<boolean> {
  const token = await paypalAccessToken();
  if (!token) return false;
  const res = await fetch(`${paypalBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (res.ok) return true;

  // Already captured / completed — treat as success so return URL is idempotent
  const body = (await res.json().catch(() => ({}))) as {
    name?: string;
    details?: { issue?: string }[];
    status?: string;
  };
  const issue = body.details?.[0]?.issue || body.name || "";
  if (/ORDER_ALREADY_CAPTURETED|ORDER_ALREADY_CAPTURED|CAPTURED/i.test(issue)) {
    return true;
  }

  const getRes = await fetch(`${paypalBase()}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!getRes.ok) return false;
  const order = (await getRes.json()) as { status?: string };
  return order.status === "COMPLETED";
}
