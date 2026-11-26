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

// PayPal's supported currency/precision contract:
// https://developer.paypal.com/api/codes/currency/
const supportedCurrencies = new Set([
  "AUD", "BRL", "CAD", "CNY", "CZK", "DKK", "EUR", "HKD", "HUF", "ILS",
  "JPY", "MYR", "MXN", "TWD", "NZD", "NOK", "PHP", "PLN", "GBP", "RUB",
  "SGD", "SEK", "CHF", "THB", "USD",
]);

/** Input uses ISO minor units; PayPal additionally forbids HUF/TWD fractions. */
function majorFromMinor(amountMinor: number, currency: string): string | null {
  if (currency === "JPY") return String(amountMinor);
  const minor = BigInt(amountMinor);
  const unit = BigInt(100);
  if (currency === "HUF" || currency === "TWD") {
    return minor % unit === BigInt(0) ? String(minor / unit) : null;
  }
  // Preserve cents exactly even near Number.MAX_SAFE_INTEGER.
  return `${minor / unit}.${String(minor % unit).padStart(2, "0")}`;
}

export const paypalAdapter: PaymentAdapter = {
  id: "paypal",
  isConfigured: paypalConfigured,
  async createCheckout(input: PaymentAdapterCheckoutInput): Promise<PaymentAdapterCheckoutResult> {
    if (!paypalConfigured()) {
      return { ok: false, configured: false, error: "PayPal not configured (PAYPAL_CLIENT_ID + SECRET)." };
    }
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      return { ok: false, configured: true, error: "PayPal amount must be positive, safe integer minor units." };
    }
    const currencyIn = typeof input.currency === "string" ? input.currency.trim().toUpperCase() : "";
    let currency = currencyIn;
    let chargedMinor = input.amountMinor;
    if (currencyIn === "XOF" || currencyIn === "XAF") {
      // Never invent FX or reuse a different source currency's quote.
      const key = `PAYPAL_${currencyIn}_PER_USD`;
      const rate = Number(process.env[key] ?? process.env[`JOKO_${currencyIn}_PER_USD`]);
      if (!Number.isFinite(rate) || rate <= 0) {
        return { ok: false, configured: true, error: `Set a positive ${key} before converting ${currencyIn} to USD.` };
      }
      chargedMinor = Math.round(input.amountMinor / rate * 100);
      if (!Number.isSafeInteger(chargedMinor) || chargedMinor <= 0) {
        return { ok: false, configured: true, error: "PayPal converted amount cannot be represented safely in USD cents." };
      }
      currency = "USD";
    } else if (!supportedCurrencies.has(currencyIn)) {
      return { ok: false, configured: true, error: `PayPal does not support the declared currency ${currencyIn || "(empty)"}.` };
    }
    const value = majorFromMinor(chargedMinor, currency);
    if (value === null) {
      return { ok: false, configured: true, error: `PayPal requires whole ${currency} units; this price cannot be charged exactly.` };
    }
    // Validate the complete charge before requesting even an OAuth token.
    const token = await paypalAccessToken();
    if (!token) {
      return { ok: false, configured: true, error: "PayPal auth failed." };
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
