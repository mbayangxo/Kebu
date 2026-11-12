/**
 * Adversarial unit tests for the three Shop payment webhook signature verifiers.
 * Pure functions, no DB — proves: a correctly-signed payload passes, a tampered body or
 * signature is rejected, and verification fails closed (not open) when no secret is
 * configured, for Wave, Paystack and JOKO.
 */
import { createHmac } from "node:crypto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyWaveWebhookSignature } from "@/lib/payments/wave-webhook";
import { verifyPaystackSignature } from "@/lib/payments/paystack-adapter";
import { verifyJokoWebhookSignature } from "@/lib/joko/payments";

describe("Wave webhook signature", () => {
  const secret = "wave_test_secret";
  const body = JSON.stringify({ type: "checkout.session.completed", data: { id: "x" } });

  function sign(ts: number, b: string): string {
    const h = createHmac("sha256", secret).update(String(ts) + b).digest("hex");
    return `t=${ts},v1=${h}`;
  }

  it("accepts a correctly-signed, fresh payload", () => {
    const now = Date.now();
    const header = sign(Math.floor(now / 1000), body);
    expect(verifyWaveWebhookSignature(body, header, secret, now)).toBe(true);
  });

  it("rejects a tampered body with a signature computed for the original body", () => {
    const now = Date.now();
    const header = sign(Math.floor(now / 1000), body);
    const tampered = body.replace('"id":"x"', '"id":"stolen-order-id"');
    expect(verifyWaveWebhookSignature(tampered, header, secret, now)).toBe(false);
  });

  it("rejects a forged signature when the secret is wrong", () => {
    const now = Date.now();
    const ts = Math.floor(now / 1000);
    const wrongHash = createHmac("sha256", "attacker-guess").update(String(ts) + body).digest("hex");
    expect(verifyWaveWebhookSignature(body, `t=${ts},v1=${wrongHash}`, secret, now)).toBe(false);
  });

  it("rejects a replayed signature outside the 5-minute window", () => {
    const now = Date.now();
    const staleTs = Math.floor(now / 1000) - 600; // 10 minutes old
    const header = sign(staleTs, body);
    expect(verifyWaveWebhookSignature(body, header, secret, now)).toBe(false);
  });

  it("fails closed when no secret is configured", () => {
    const now = Date.now();
    const header = sign(Math.floor(now / 1000), body);
    expect(verifyWaveWebhookSignature(body, header, "", now)).toBe(false);
  });
});

describe("Paystack webhook signature", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "ref1", amount: 5000 } });
  const originalEnv = process.env.PAYSTACK_SECRET_KEY;

  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = "paystack_test_secret";
  });
  afterEach(() => {
    process.env.PAYSTACK_SECRET_KEY = originalEnv;
  });

  it("accepts a correctly-signed payload", () => {
    const sig = createHmac("sha512", "paystack_test_secret").update(body).digest("hex");
    expect(verifyPaystackSignature(body, sig)).toBe(true);
  });

  it("rejects a tampered body (e.g. amount changed after signing)", () => {
    const sig = createHmac("sha512", "paystack_test_secret").update(body).digest("hex");
    const tampered = body.replace('"amount":5000', '"amount":1');
    expect(verifyPaystackSignature(tampered, sig)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyPaystackSignature(body, null)).toBe(false);
  });

  it("fails closed when PAYSTACK_SECRET_KEY is unset", () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    const sig = createHmac("sha512", "paystack_test_secret").update(body).digest("hex");
    expect(verifyPaystackSignature(body, sig)).toBe(false);
  });
});

describe("JOKO webhook signature", () => {
  const body = JSON.stringify({ reference: "shop_order_1", status: "paid" });
  const originalEnv = process.env.JOKO_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.JOKO_WEBHOOK_SECRET = "joko_test_secret";
  });
  afterEach(() => {
    process.env.JOKO_WEBHOOK_SECRET = originalEnv;
  });

  it("accepts a correctly-signed payload, with or without the sha256= prefix", () => {
    const hash = createHmac("sha256", "joko_test_secret").update(body).digest("hex");
    expect(verifyJokoWebhookSignature(body, hash)).toBe(true);
    expect(verifyJokoWebhookSignature(body, `sha256=${hash}`)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const hash = createHmac("sha256", "joko_test_secret").update(body).digest("hex");
    const tampered = body.replace('"status":"paid"', '"status":"failed"');
    expect(verifyJokoWebhookSignature(tampered, hash)).toBe(false);
  });

  it("fails closed when JOKO_WEBHOOK_SECRET is unset", () => {
    delete process.env.JOKO_WEBHOOK_SECRET;
    const hash = createHmac("sha256", "joko_test_secret").update(body).digest("hex");
    expect(verifyJokoWebhookSignature(body, hash)).toBe(false);
  });
});
