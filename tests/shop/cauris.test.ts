import { describe, expect, it } from "vitest";
import { jokoPayHint, ngnToCauris, xofToCauris } from "@/lib/shop/cauris";

describe("cauris (Joko currency)", () => {
  it("converts XOF to Cauris with local equivalents", () => {
    const a = xofToCauris(6000, {
      xofPerCauris: 600,
      ngnPerCauris: 250,
      source: "provisional",
      asOf: "2026-09-07",
    });
    expect(a.cauris).toBe(10);
    expect(a.payLabel).toBe("Pay 10 Cauris");
    expect(a.xof).toBe(6000);
    expect(a.ngn).toBe(2500);
    expect(a.rateNote).toMatch(/1 Cauris = 600 XOF/);
    expect(a.rateNote).toMatch(/provisional/);
  });

  it("converts NGN to Cauris", () => {
    const a = ngnToCauris(500, {
      xofPerCauris: 600,
      ngnPerCauris: 250,
      source: "provisional",
      asOf: "2026-09-07",
    });
    expect(a.cauris).toBe(2);
    expect(a.payLabel).toBe("Pay 2 Cauris");
    expect(a.ngn).toBe(500);
    expect(a.xof).toBe(1200);
  });

  it("builds Joko checkout hint as Pay X Cauris", () => {
    expect(jokoPayHint(null)).toMatch(/Pay in Cauris/);
    expect(jokoPayHint(1200)).toMatch(/^Pay 2 Cauris/);
    expect(jokoPayHint(1200)).toMatch(/XOF/);
    expect(jokoPayHint(1200)).toMatch(/NGN/);
  });
});
