/**
 * Paystack — card checkout for African merchants.
 * Paid only after charge.success webhook — never from the browser.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentAdapter, PaymentAdapterCheckoutInput, PaymentAdapterCheckoutResult } from "./adapters";

export function paystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

function paystackCurrency(): string {
  return (process.env.PAYSTACK_CURRENCY ?? "NGN").trim().toUpperCase() || "NGN";
}

/** Map shop XOF total into Paystack amount subunit. Refuses unsafe 1:1 NGN defaults. */
function paystackAmount(
  amountXof: number,
  currency: string,
): { ok: true; amount: number } | { ok: false; error: string } {
  if (currency === "XOF" || currency === "XAF") {
    return { ok: true, amount: Math.max(1, Math.round(amountXof)) };
  }
  if (currency === "USD") {
    const per = Number(process.env.PAYSTACK_XOF_PER_USD ?? process.env.JOKO_XOF_PER_USD);
    if (!Number.isFinite(per) || per <= 0) return { ok: false, error: "Set a positive PAYSTACK_XOF_PER_USD before converting an XOF price to USD." };
    const amount = Math.round((amountXof / per) * 100);
    return Number.isSafeInteger(amount) && amount > 0 ? { ok: true, amount } : { ok: false, error: "Price cannot be represented safely in the card currency." };
  }
  // NGN / GHS / others with minor units — require explicit FX (XOF per 1 major unit)
  const raw = process.env.PAYSTACK_XOF_PER_UNIT?.trim();
  if (!raw) {
    return {
      ok: false,
      error:
        `Paystack currency is ${currency} but PAYSTACK_XOF_PER_UNIT is unset. Set XOF per 1 ${currency} (e.g. ~4 for NGN) or use PAYSTACK_CURRENCY=XOF.`,
    };
  }
  const per = Number(raw);
  if (!Number.isFinite(per) || per <= 0) {
    return { ok: false, error: "PAYSTACK_XOF_PER_UNIT must be a positive number." };
  }
  const amount = Math.round((amountXof / per) * 100);
  return Number.isSafeInteger(amount) && amount > 0 ? { ok: true, amount } : { ok: false, error: "Price cannot be represented safely in the card currency." };
}

export const paystackAdapter: PaymentAdapter = {
  id: "card",
  isConfigured: paystackConfigured,
  async createCheckout(input: PaymentAdapterCheckoutInput): Promise<PaymentAdapterCheckoutResult> {
    const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!secret) {
      return { ok: false, configured: false, error: "Paystack not configured (PAYSTACK_SECRET_KEY)." };
    }
    const currency = paystackCurrency();
    const sourceCurrency = input.currency.trim().toUpperCase();
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) return { ok: false, configured: true, error: "Payment amount must be a positive integer." };
    // Matching currencies already use provider subunits. Convert only the
    // existing explicit XOF bridge; never reinterpret USD cents as XOF.
    const converted = sourceCurrency === currency
      ? { ok: true as const, amount: input.amountMinor }
      : sourceCurrency === "XOF"
        ? paystackAmount(input.amountMinor, currency)
        : { ok: false as const, error: `Checkout currency ${sourceCurrency} cannot be charged as ${currency}; configure a matching card currency.` };
    if (!converted.ok) {
      return { ok: false, configured: true, error: converted.error };
    }
    const email = input.customerEmail?.trim();
    if (!email) {
      return { ok: false, configured: true, error: "Customer email required for card checkout." };
    }

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: converted.amount,
        currency,
        reference: input.reference.slice(0, 100),
        callback_url: input.returnUrl,
        metadata: {
          ...(input.metadata ?? {}),
          kebu_reference: input.reference,
        },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    };

    if (!res.ok || !data.status || !data.data?.authorization_url) {
      return {
        ok: false,
        configured: true,
        error: data.message || "Paystack initialize failed.",
      };
    }

    return {
      ok: true,
      checkoutUrl: data.data.authorization_url,
      providerPaymentId: data.data.reference || input.reference,
    };
  },
};

export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret || !signature) return false;
  const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(hash, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
