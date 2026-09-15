import { describe, expect, it } from "vitest";
import {
  quoteShippingCorridor,
  formatShippingXof,
  shippingDestinationOptions,
  supportedCorridorPairs,
} from "@/lib/shop/shipping-corridors";

describe("domestic corridors", () => {
  it("SN→SN returns local quote", () => {
    const q = quoteShippingCorridor({ fromCountry: "SN", toCountry: "SN" });
    expect(q?.crossBorder).toBe(false);
    expect(q?.amountXof).toBe(2_500);
    expect(q?.trustLabel).toBe("estimate");
    expect(q?.corridor).toBe("SN→SN");
  });

  it("CI→CI returns local quote", () => {
    const q = quoteShippingCorridor({ fromCountry: "CI", toCountry: "CI" });
    expect(q?.crossBorder).toBe(false);
    expect(q?.amountXof).toBe(2_000);
  });

  it("GH→GH returns local quote", () => {
    const q = quoteShippingCorridor({ fromCountry: "GH", toCountry: "GH" });
    expect(q?.crossBorder).toBe(false);
  });

  it("NG→NG returns local quote", () => {
    const q = quoteShippingCorridor({ fromCountry: "NG", toCountry: "NG" });
    expect(q?.crossBorder).toBe(false);
  });
});

describe("SN outbound corridors", () => {
  it("SN→GH cross-border with customs hint", () => {
    const q = quoteShippingCorridor({ fromCountry: "SN", toCountry: "GH" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.corridor).toBe("SN→GH");
    expect(q?.amountXof).toBe(18_500);
    expect(q?.etaMinDays).toBeLessThanOrEqual(q!.etaMaxDays);
    expect(q?.customsHint.toLowerCase()).toContain("ghana");
    expect(q?.customsHint.toLowerCase()).toContain("pas de conseil juridique");
  });

  it("SN→GM short corridor to Gambia", () => {
    const q = quoteShippingCorridor({ fromCountry: "SN", toCountry: "GM" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.amountXof).toBe(7_500);
    expect(q?.etaMaxDays).toBeLessThanOrEqual(5);
  });

  it("SN→ML land corridor", () => {
    const q = quoteShippingCorridor({ fromCountry: "SN", toCountry: "ML" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.amountXof).toBe(14_000);
  });

  it("SN→CI UEMOA corridor", () => {
    const q = quoteShippingCorridor({ fromCountry: "SN", toCountry: "CI" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.amountXof).toBe(21_000);
  });

  it("SN→MR non-ECOWAS (Mauritania)", () => {
    const q = quoteShippingCorridor({ fromCountry: "SN", toCountry: "MR" });
    expect(q?.crossBorder).toBe(true);
    // Mauritania hint warns it's outside ECOWAS
    expect(q?.customsHint.toLowerCase()).toContain("mauritanie");
  });

  it("SN→BF Burkina Faso", () => {
    const q = quoteShippingCorridor({ fromCountry: "SN", toCountry: "BF" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.amountXof).toBeGreaterThan(0);
  });

  it("SN→TG Togo", () => {
    const q = quoteShippingCorridor({ fromCountry: "SN", toCountry: "TG" });
    expect(q?.crossBorder).toBe(true);
  });

  it("SN→BJ Benin", () => {
    const q = quoteShippingCorridor({ fromCountry: "SN", toCountry: "BJ" });
    expect(q?.crossBorder).toBe(true);
  });
});

describe("CI outbound corridors", () => {
  it("CI→GH short land corridor", () => {
    const q = quoteShippingCorridor({ fromCountry: "CI", toCountry: "GH" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.amountXof).toBe(17_000);
    expect(q?.etaMaxDays).toBeLessThanOrEqual(7);
  });

  it("CI→ML Abidjan–Bamako", () => {
    const q = quoteShippingCorridor({ fromCountry: "CI", toCountry: "ML" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.etaMaxDays).toBeLessThanOrEqual(7);
  });

  it("CI→SN returns quote", () => {
    const q = quoteShippingCorridor({ fromCountry: "CI", toCountry: "SN" });
    expect(q?.crossBorder).toBe(true);
  });

  it("CI→NG Nigeria quote", () => {
    const q = quoteShippingCorridor({ fromCountry: "CI", toCountry: "NG" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.amountXof).toBeGreaterThan(0);
  });
});

describe("GH outbound corridors", () => {
  it("GH→NG Lagos corridor", () => {
    const q = quoteShippingCorridor({ fromCountry: "GH", toCountry: "NG" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.amountXof).toBe(21_500);
  });

  it("GH→TG short land border", () => {
    const q = quoteShippingCorridor({ fromCountry: "GH", toCountry: "TG" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.etaMaxDays).toBeLessThanOrEqual(5);
  });

  it("GH→CI returns quote", () => {
    const q = quoteShippingCorridor({ fromCountry: "GH", toCountry: "CI" });
    expect(q?.crossBorder).toBe(true);
  });
});

describe("NG outbound corridors", () => {
  it("NG→GH returns quote", () => {
    const q = quoteShippingCorridor({ fromCountry: "NG", toCountry: "GH" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.amountXof).toBe(21_500);
  });

  it("NG→BJ short land corridor", () => {
    const q = quoteShippingCorridor({ fromCountry: "NG", toCountry: "BJ" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.etaMaxDays).toBeLessThanOrEqual(5);
  });

  it("NG→CI returns quote", () => {
    const q = quoteShippingCorridor({ fromCountry: "NG", toCountry: "CI" });
    expect(q?.crossBorder).toBe(true);
  });
});

describe("ML outbound corridors", () => {
  it("ML→SN returns quote", () => {
    const q = quoteShippingCorridor({ fromCountry: "ML", toCountry: "SN" });
    expect(q?.crossBorder).toBe(true);
  });

  it("ML→CI Bamako–Abidjan", () => {
    const q = quoteShippingCorridor({ fromCountry: "ML", toCountry: "CI" });
    expect(q?.crossBorder).toBe(true);
  });

  it("ML→BF neighbouring UEMOA", () => {
    const q = quoteShippingCorridor({ fromCountry: "ML", toCountry: "BF" });
    expect(q?.crossBorder).toBe(true);
    expect(q?.amountXof).toBe(9_000);
  });
});

describe("invariants", () => {
  it("returns null for undefined corridors (honest)", () => {
    expect(quoteShippingCorridor({ fromCountry: "NG", toCountry: "KE" })).toBeNull();
    expect(quoteShippingCorridor({ fromCountry: "SN", toCountry: "ZA" })).toBeNull();
    expect(quoteShippingCorridor({ fromCountry: "XX", toCountry: "YY" })).toBeNull();
  });

  it("all quotes have etaMinDays ≤ etaMaxDays", () => {
    const pairs = [
      ["SN", "SN"], ["SN", "GH"], ["SN", "GM"], ["SN", "ML"], ["SN", "CI"],
      ["SN", "MR"], ["SN", "BF"], ["SN", "TG"], ["SN", "BJ"], ["SN", "GN"],
      ["CI", "CI"], ["CI", "GH"], ["CI", "ML"], ["CI", "SN"], ["CI", "BF"], ["CI", "NG"],
      ["GH", "GH"], ["GH", "NG"], ["GH", "CI"], ["GH", "TG"], ["GH", "BJ"],
      ["NG", "NG"], ["NG", "GH"], ["NG", "BJ"], ["NG", "TG"], ["NG", "CI"],
      ["ML", "ML"], ["ML", "SN"], ["ML", "CI"], ["ML", "BF"],
    ];
    for (const [f, t] of pairs) {
      const q = quoteShippingCorridor({ fromCountry: f!, toCountry: t! });
      if (q) {
        expect(q.etaMinDays, `${f}→${t}`).toBeLessThanOrEqual(q.etaMaxDays);
        expect(q.amountXof, `${f}→${t}`).toBeGreaterThan(0);
      }
    }
  });

  it("all quotes include non-legal-advice notice", () => {
    const pairs = [["SN", "GH"], ["CI", "GH"], ["NG", "GH"]];
    for (const [f, t] of pairs) {
      const q = quoteShippingCorridor({ fromCountry: f!, toCountry: t! });
      expect(q?.customsHint.toLowerCase(), `${f}→${t}`).toMatch(
        /not legal advice|pas de conseil juridique/,
      );
    }
  });
});

describe("shippingDestinationOptions", () => {
  it("SN has multiple destinations", () => {
    const opts = shippingDestinationOptions("SN");
    const codes = opts.map((o) => o.code);
    expect(codes).toContain("SN");
    expect(codes).toContain("GH");
    expect(codes).toContain("CI");
    expect(codes).toContain("ML");
    expect(codes).toContain("GM");
    // SN (same-country) appears first
    expect(codes[0]).toBe("SN");
  });

  it("CI has multiple destinations", () => {
    const opts = shippingDestinationOptions("CI");
    const codes = opts.map((o) => o.code);
    expect(codes).toContain("CI");
    expect(codes).toContain("GH");
    expect(codes).toContain("SN");
    expect(codes[0]).toBe("CI");
  });

  it("unknown origin returns full country list", () => {
    const opts = shippingDestinationOptions("ZA");
    expect(opts.length).toBeGreaterThan(3);
  });
});

describe("supportedCorridorPairs", () => {
  it("returns all defined pairs including domestics", () => {
    const pairs = supportedCorridorPairs();
    expect(pairs.length).toBeGreaterThan(25);
    const keys = pairs.map((p) => `${p.from}→${p.to}`);
    expect(keys).toContain("SN→SN");
    expect(keys).toContain("SN→GH");
    expect(keys).toContain("NG→GH");
    expect(keys).toContain("CI→ML");
  });
});

describe("formatShippingXof", () => {
  it("formats with XOF suffix", () => {
    expect(formatShippingXof(18_500)).toContain("XOF");
  });
});
