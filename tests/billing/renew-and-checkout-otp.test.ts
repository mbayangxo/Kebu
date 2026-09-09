import { describe, expect, it } from "vitest";
import {
  generateCheckoutOtpCode,
  hashCheckoutOtp,
  normalizeCheckoutEmail,
} from "@/lib/shop/checkout-email-otp";
import { extendPeriodEnd, isWithinAutopayWindow } from "@/lib/billing/subscriptions";

describe("checkout email OTP helpers", () => {
  it("normalizes email and hashes codes stably", () => {
    expect(normalizeCheckoutEmail("  May@Kebu.africa ")).toBe("may@kebu.africa");
    const a = hashCheckoutOtp("123456");
    const b = hashCheckoutOtp("123456");
    expect(a).toBe(b);
    expect(a).not.toBe(hashCheckoutOtp("000000"));
  });

  it("generates 6-digit codes", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateCheckoutOtpCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe("billing renew window helpers", () => {
  it("extends period from remaining end when still active", () => {
    const now = new Date("2026-09-08T12:00:00.000Z");
    const currentEnd = "2026-09-20T12:00:00.000Z";
    const next = extendPeriodEnd(currentEnd, "monthly", now);
    expect(new Date(next).getTime()).toBeGreaterThan(new Date(currentEnd).getTime());
  });

  it("detects autopay lead window", () => {
    const now = new Date("2026-09-08T12:00:00.000Z");
    expect(isWithinAutopayWindow("2026-09-10T12:00:00.000Z", now)).toBe(true);
    expect(isWithinAutopayWindow("2026-10-20T12:00:00.000Z", now)).toBe(false);
  });
});
