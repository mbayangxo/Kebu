import { createHmac } from "node:crypto";
import { describe, expect, it, afterEach } from "vitest";
import {
  buildJokoCheckoutBody,
  verifyJokoWebhookSignature,
} from "@/lib/joko/payments";

describe("Joko Partner checkout body", () => {
  it("prefers amount_xof + phone over USD cents", () => {
    const body = buildJokoCheckoutBody({
      reference: "shop_order_abc",
      amountXof: 8500,
      amountUsdCents: 1400,
      description: "Shop order: Boubou",
      customerPhone: "+221771234567",
      customerEmail: "buyer@example.com",
      returnUrl: "https://kebu.africa/thanks",
      cancelUrl: "https://kebu.africa/cancel",
      webhookUrl: "https://kebu.africa/api/webhooks/joko",
      metadata: { kind: "shop_order", order_id: "oid" },
    });

    expect(body.amount_xof).toBe(8500);
    expect(body.currency).toBe("XOF");
    expect(body.amount).toBeUndefined();
    expect(body.customer).toEqual({
      phone: "+221771234567",
      email: "buyer@example.com",
    });
    expect((body.metadata as Record<string, string>).partner).toBe("kebu");
    expect((body.metadata as Record<string, string>).kind).toBe("shop_order");
  });

  it("falls back to USD cents when amount_xof omitted", () => {
    const body = buildJokoCheckoutBody({
      reference: "hosting_1",
      amountUsdCents: 500,
      description: "Hosting",
      returnUrl: "https://kebu.africa/thanks",
      cancelUrl: "https://kebu.africa/cancel",
      webhookUrl: "https://kebu.africa/api/webhooks/joko",
    });
    expect(body.amount).toBe(500);
    expect(body.currency).toBe("USD");
    expect(body.amount_xof).toBeUndefined();
  });
});

describe("Joko webhook HMAC", () => {
  const prev = process.env.JOKO_WEBHOOK_SECRET;

  afterEach(() => {
    if (prev === undefined) delete process.env.JOKO_WEBHOOK_SECRET;
    else process.env.JOKO_WEBHOOK_SECRET = prev;
  });

  it("accepts sha256=<hex> signatures", () => {
    process.env.JOKO_WEBHOOK_SECRET = "test-secret";
    const raw = JSON.stringify({ reference: "shop_order_x", status: "paid" });
    const hex = createHmac("sha256", "test-secret").update(raw).digest("hex");
    expect(verifyJokoWebhookSignature(raw, `sha256=${hex}`)).toBe(true);
    expect(verifyJokoWebhookSignature(raw, hex)).toBe(true);
    expect(verifyJokoWebhookSignature(raw, `sha256=${hex.slice(0, -2)}aa`)).toBe(false);
  });
});
