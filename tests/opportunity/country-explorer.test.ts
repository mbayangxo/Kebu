import { describe, expect, it } from "vitest";
import { countryCodeParamSchema, profileToDbRow } from "@/lib/opportunity/country-schema";

describe("Opportunity Country Explorer schemas", () => {
  it("normalizes country codes", () => {
    expect(countryCodeParamSchema.parse("sn")).toBe("SN");
    expect(countryCodeParamSchema.safeParse("SEN").success).toBe(false);
  });

  it("maps curated profiles to DB rows without AI fields", () => {
    const row = profileToDbRow({
      country: "Ghana",
      country_code: "gh",
      capital: "Accra",
      population: 33_000_000,
      industries: ["Cocoa", "Gold"],
      youth_programs: ["NEIP"],
      women_programs: ["Women Fund"],
    });
    expect(row.country_code).toBe("GH");
    expect(row.publish_status).toBe("published");
    expect(row.public_entrepreneurship_programs).toContain("NEIP");
    expect(row.data_confidence).toBe("moderate");
    expect(Array.isArray(row.sources)).toBe(true);
  });
});
