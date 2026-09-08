import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  getShopPaymentAdapter,
  paypalConfigured,
  paystackConfigured,
  shopPaymentAdapterStatus,
  waveConfigured,
} from "@/lib/payments/registry";
import { verifyPaystackSignature } from "@/lib/payments/paystack-adapter";

describe("shop payment adapter registry", () => {
  it("exposes status without secrets", () => {
    const status = shopPaymentAdapterStatus();
    expect(status.joko.label).toBe("JOKO");
    expect(status.paypal.label).toBe("PayPal");
    expect(status.card.label).toContain("Paystack");
    expect(status.wave.label).toBe("Wave");
    expect(typeof status.paypal.configured).toBe("boolean");
  });

  it("maps preferences to adapters", () => {
    expect(getShopPaymentAdapter("paypal")?.id).toBe("paypal");
    expect(getShopPaymentAdapter("card")?.id).toBe("card");
    expect(getShopPaymentAdapter("joko")).toBeNull();
    expect(getShopPaymentAdapter("whatsapp")).toBeNull();
  });

  it("reports configured=false without env keys", () => {
    expect(paypalConfigured()).toBe(Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET));
    expect(paystackConfigured()).toBe(Boolean(process.env.PAYSTACK_SECRET_KEY));
    expect(waveConfigured()).toBe(Boolean(process.env.WAVE_API_KEY));
  });
});

describe("paystack webhook signature", () => {
  it("rejects missing signature", () => {
    expect(verifyPaystackSignature("{}", null)).toBe(false);
  });

  it("accepts matching hmac when secret set", () => {
    const prev = process.env.PAYSTACK_SECRET_KEY;
    process.env.PAYSTACK_SECRET_KEY = "test_secret";
    const body = '{"event":"charge.success"}';
    const sig = createHmac("sha512", "test_secret").update(body).digest("hex");
    expect(verifyPaystackSignature(body, sig)).toBe(true);
    expect(verifyPaystackSignature(body, "nope")).toBe(false);
    if (prev === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = prev;
  });
});

describe("paystack amount safety", () => {
  it("refuses NGN without PAYSTACK_XOF_PER_UNIT", async () => {
    const prevKey = process.env.PAYSTACK_SECRET_KEY;
    const prevCur = process.env.PAYSTACK_CURRENCY;
    const prevUnit = process.env.PAYSTACK_XOF_PER_UNIT;
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    process.env.PAYSTACK_CURRENCY = "NGN";
    delete process.env.PAYSTACK_XOF_PER_UNIT;

    const { paystackAdapter } = await import("@/lib/payments/paystack-adapter");
    const result = await paystackAdapter.createCheckout({
      reference: "shop_card_test",
      amountMinor: 5000,
      currency: "XOF",
      description: "test",
      returnUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/cancel",
      webhookUrl: "https://example.com/hook",
      customerEmail: "a@b.co",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/PAYSTACK_XOF_PER_UNIT/);
    }

    if (prevKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = prevKey;
    if (prevCur === undefined) delete process.env.PAYSTACK_CURRENCY;
    else process.env.PAYSTACK_CURRENCY = prevCur;
    if (prevUnit === undefined) delete process.env.PAYSTACK_XOF_PER_UNIT;
    else process.env.PAYSTACK_XOF_PER_UNIT = prevUnit;
  });
});
