import { describe, expect, it } from "vitest";
import {
  formatSubscriptionPriceLabel,
  labelSubscriptionInterval,
  nextBillingDate,
  publicSubscribeSchema,
  subscriptionInputSchema,
  subscriptionOrderNote,
} from "@/lib/shop/subscriptions";
import { projectProductSchema } from "@/lib/create/project-products";

describe("C8 shop subscriptions", () => {
  it("validates merchant create input", () => {
    expect(
      subscriptionInputSchema.safeParse({
        productId: "11111111-1111-4111-8111-111111111111",
        customerName: "Awa",
        customerPhone: "+221771234567",
        interval: "monthly",
        priceXof: 5000,
      }).success,
    ).toBe(true);
    expect(
      subscriptionInputSchema.safeParse({
        productId: "not-uuid",
        customerName: "Awa",
        customerPhone: "+221771234567",
        interval: "monthly",
        priceXof: 5000,
      }).success,
    ).toBe(false);
  });

  it("validates public subscribe without price (derived server-side)", () => {
    const parsed = publicSubscribeSchema.safeParse({
      productId: "11111111-1111-4111-8111-111111111111",
      customerName: "Moussa",
      customerPhone: "+221770000000",
    });
    expect(parsed.success).toBe(true);
  });

  it("advances next billing date by interval", () => {
    const from = new Date("2026-01-15T12:00:00.000Z");
    expect(nextBillingDate("weekly", from)).toBe("2026-01-22T12:00:00.000Z");
    expect(nextBillingDate("monthly", from)).toBe("2026-02-15T12:00:00.000Z");
    expect(nextBillingDate("quarterly", from)).toBe("2026-04-15T12:00:00.000Z");
    expect(nextBillingDate("yearly", from)).toBe("2027-01-15T12:00:00.000Z");
  });

  it("labels intervals and order notes honestly", () => {
    expect(labelSubscriptionInterval("monthly")).toContain("month");
    expect(subscriptionOrderNote("first", "weekly")).toMatch(/first period/i);
    expect(subscriptionOrderNote("renewal", "monthly")).toMatch(/renewal/i);
    expect(subscriptionOrderNote("renewal", "monthly")).toMatch(/not auto-charged|Collect payment/i);
    expect(formatSubscriptionPriceLabel(5000, "monthly")).toMatch(/XOF/);
  });

  it("accepts isSubscription on product schema", () => {
    const parsed = projectProductSchema.safeParse({
      name: "Weekly rice box",
      priceLabel: "8,000 XOF",
      priceXof: 8000,
      isSubscription: true,
      subscriptionInterval: "weekly",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isSubscription).toBe(true);
      expect(parsed.data.subscriptionInterval).toBe("weekly");
    }
  });
});
