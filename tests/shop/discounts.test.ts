import { describe, expect, it } from "vitest";
import {
  applyPercentOff,
  discountCodeInputSchema,
  normalizeDiscountCode,
} from "@/lib/shop/discounts";

describe("shop discounts", () => {
  it("normalizes codes", () => {
    expect(normalizeDiscountCode(" welcome 10 ")).toBe("WELCOME10");
  });

  it("applies percent off in whole XOF", () => {
    expect(applyPercentOff(10000, 10)).toBe(9000);
    expect(applyPercentOff(5000, 50)).toBe(2500);
  });

  it("validates create input", () => {
    const ok = discountCodeInputSchema.safeParse({ code: "sale-20", percentOff: 20 });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.code).toBe("SALE-20");
    const bad = discountCodeInputSchema.safeParse({ code: "!!", percentOff: 5 });
    expect(bad.success).toBe(false);
  });
});
