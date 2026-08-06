import { describe, expect, it } from "vitest";
import { generatePublicKebuId, isPublicKebuIdFormat } from "@/lib/kebu-id/public-id";
import { createDraftBusinessSchema } from "@/lib/kebu-id/schemas";

describe("Kebu ID public format", () => {
  it("generates KEBU-CC-01-XXXXXX for draft", () => {
    const id = generatePublicKebuId("sn");
    expect(id).toMatch(/^KEBU-SN-01-[A-Z0-9]{6}$/);
    expect(isPublicKebuIdFormat(id)).toBe(true);
  });

  it("rejects invalid country codes", () => {
    expect(() => generatePublicKebuId("SEN")).toThrow();
  });

  it("does not generate sequential suffixes across calls", () => {
    const a = generatePublicKebuId("NG");
    const b = generatePublicKebuId("NG");
    expect(a).not.toBe(b);
  });
});

describe("createDraftBusinessSchema", () => {
  it("accepts valid draft input", () => {
    const parsed = createDraftBusinessSchema.parse({
      legalName: "Atelier Baobab",
      tradingName: "Baobab",
      countryCode: "sn",
      category: "fashion",
      description: "Handmade clothing in Dakar.",
    });
    expect(parsed.countryCode).toBe("SN");
    expect(parsed.tradingName).toBe("Baobab");
  });

  it("rejects empty legal name", () => {
    expect(() =>
      createDraftBusinessSchema.parse({
        legalName: "  ",
        countryCode: "SN",
        category: "fashion",
        description: "x",
      })
    ).toThrow();
  });

  it("rejects non-African country codes", () => {
    const result = createDraftBusinessSchema.safeParse({
      legalName: "Test Co",
      countryCode: "US",
      category: "other",
      description: "Test",
    });
    expect(result.success).toBe(false);
  });
});
