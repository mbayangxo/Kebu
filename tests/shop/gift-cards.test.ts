import { describe, expect, it } from "vitest";
import {
  giftCardApplyAmount,
  normalizeGiftCardCode,
  giftCardInputSchema,
} from "@/lib/shop/gift-cards";
import { shopCartCheckoutSchema } from "@/lib/shop/cart-order";

describe("C6 gift card redeem helpers", () => {
  it("normalizes codes", () => {
    expect(normalizeGiftCardCode(" kebu-ab12 ")).toBe("KEBU-AB12");
  });

  it("applies min(balance, total)", () => {
    expect(giftCardApplyAmount(10_000, 7_500)).toBe(7_500);
    expect(giftCardApplyAmount(3_000, 7_500)).toBe(3_000);
    expect(giftCardApplyAmount(0, 7_500)).toBe(0);
    expect(giftCardApplyAmount(5_000, 0)).toBe(0);
  });

  it("validates issue input", () => {
    expect(giftCardInputSchema.safeParse({ initialBalanceXof: 100 }).success).toBe(false);
    expect(giftCardInputSchema.safeParse({ initialBalanceXof: 5000 }).success).toBe(true);
  });

  it("accepts giftCardCode on cart checkout schema", () => {
    const parsed = shopCartCheckoutSchema.safeParse({
      items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 1 }],
      customerName: "Awa",
      customerPhone: "+221771234567",
      giftCardCode: "KEBU-TESTCODE1",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.giftCardCode).toBe("KEBU-TESTCODE1");
  });
});
