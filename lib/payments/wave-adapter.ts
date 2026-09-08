/**
 * Wave Business checkout (Senegal / supported markets).
 * Paid only after Wave webhook — never from the browser.
 * Docs: https://docs.wave.com/
 */

import type { PaymentAdapter, PaymentAdapterCheckoutInput, PaymentAdapterCheckoutResult } from "./adapters";

export function waveConfigured(): boolean {
  return Boolean(process.env.WAVE_API_KEY?.trim());
}

function waveBase(): string {
  return (process.env.WAVE_API_BASE_URL ?? "https://api.wave.com").replace(/\/$/, "");
}

export const waveAdapter: PaymentAdapter = {
  id: "wave",
  isConfigured: waveConfigured,
  async createCheckout(input: PaymentAdapterCheckoutInput): Promise<PaymentAdapterCheckoutResult> {
    const key = process.env.WAVE_API_KEY?.trim();
    if (!key) {
      return { ok: false, configured: false, error: "Wave not configured (WAVE_API_KEY)." };
    }
    // Wave checkout expects amount as string in major units for XOF
    const amount = String(Math.max(1, Math.round(input.amountMinor)));
    const res = await fetch(`${waveBase()}/v1/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "XOF",
        error_url: input.cancelUrl,
        success_url: input.returnUrl,
        client_reference: input.reference.slice(0, 255),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      wave_launch_url?: string;
      message?: string;
      error?: string;
    };
    if (!res.ok || !data.wave_launch_url) {
      return {
        ok: false,
        configured: true,
        error: data.message || data.error || "Wave checkout session failed.",
      };
    }
    return {
      ok: true,
      checkoutUrl: data.wave_launch_url,
      providerPaymentId: data.id || input.reference,
    };
  },
};

/** Orange Money — configured only when partner API keys exist; otherwise honest not-configured. */
export function orangeMoneyConfigured(): boolean {
  return Boolean(
    process.env.ORANGE_MONEY_API_KEY?.trim() && process.env.ORANGE_MONEY_MERCHANT_ID?.trim(),
  );
}

export const orangeMoneyAdapter: PaymentAdapter = {
  id: "orange_money",
  isConfigured: orangeMoneyConfigured,
  async createCheckout(input: PaymentAdapterCheckoutInput): Promise<PaymentAdapterCheckoutResult> {
    if (!orangeMoneyConfigured()) {
      return {
        ok: false,
        configured: false,
        error:
          "Orange Money API not configured. Use mobile money instructions or Wave/JOKO until partner keys are set.",
      };
    }
    const base = (process.env.ORANGE_MONEY_API_BASE_URL ?? "").replace(/\/$/, "");
    const key = process.env.ORANGE_MONEY_API_KEY!.trim();
    const merchant = process.env.ORANGE_MONEY_MERCHANT_ID!.trim();
    if (!base) {
      return { ok: false, configured: true, error: "ORANGE_MONEY_API_BASE_URL missing." };
    }
    const res = await fetch(`${base}/checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        merchant_id: merchant,
        amount: Math.max(1, Math.round(input.amountMinor)),
        currency: "XOF",
        reference: input.reference,
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        customer_phone: input.customerPhone,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      checkout_url?: string;
      payment_id?: string;
      message?: string;
    };
    if (!res.ok || !data.checkout_url) {
      return {
        ok: false,
        configured: true,
        error: data.message || "Orange Money checkout failed.",
      };
    }
    return {
      ok: true,
      checkoutUrl: data.checkout_url,
      providerPaymentId: data.payment_id || input.reference,
    };
  },
};
