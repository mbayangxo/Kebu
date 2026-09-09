import { describe, expect, it } from "vitest";
import { trackingMessage } from "@/lib/shop/fulfillment";

describe("fulfillment buyer notify copy", () => {
  it("includes order and tracking for SMS body", () => {
    const text = trackingMessage({
      shopName: "May Shop",
      orderLabel: "ORD-1",
      carrier: "dhl",
      trackingNumber: "ABC123",
      trackingUrl: "https://example.com/t/ABC123",
    });
    expect(text).toContain("May Shop");
    expect(text).toContain("ORD-1");
    expect(text).toContain("ABC123");
    expect(text).toContain("https://example.com/t/ABC123");
  });
});
