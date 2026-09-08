import { describe, expect, it } from "vitest";
import { quoteShippingCorridor, formatShippingXof } from "@/lib/shop/shipping-corridors";

describe("SN→GH shipping corridor v1", () => {
  it("quotes Senegal domestic", () => {
    const q = quoteShippingCorridor({ fromCountry: "SN", toCountry: "SN" });
    expect(q?.crossBorder).toBe(false);
    expect(q?.amountXof).toBe(2500);
    expect(q?.trustLabel).toBe("estimate");
  });

  it("quotes Senegal → Ghana with customs hint", () => {
    const q = quoteShippingCorridor({ fromCountry: "SN", toCountry: "GH" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.corridor).toBe("SN→GH");
    expect(q?.amountXof).toBe(18500);
    expect(q?.etaMinDays).toBeLessThanOrEqual(q!.etaMaxDays);
    expect(q?.customsHint.toLowerCase()).toContain("ghana");
    expect(q?.customsHint.toLowerCase()).toContain("not legal advice");
    expect(formatShippingXof(18500)).toContain("XOF");
  });

  it("returns null for undefined corridors (honest)", () => {
    expect(quoteShippingCorridor({ fromCountry: "NG", toCountry: "KE" })).toBeNull();
  });
});
