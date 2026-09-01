import { describe, expect, it } from "vitest";
import {
  formatLastVerified,
  OPPORTUNITY_TRUST_LABELS,
  parseCuratedSources,
} from "@/lib/opportunity/trust-labels";
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
      gdp: "$77 billion",
      industries: ["Cocoa", "Gold", "Tech"],
      cultural_notes: "Known for hospitality and creative economy.",
      startup_notes: "Accra tech hub growing.",
      sme_agencies: ["NEIP", "GEA"],
      youth_programs: ["NEIP"],
      women_programs: ["Women Fund"],
      procurement_links: [{ name: "PPA Ghana", url: "https://www.ppaghana.org" }],
    });
    expect(row.country_code).toBe("GH");
    expect(row.publish_status).toBe("published");
    expect(row.public_entrepreneurship_programs).toContain("NEIP");
    expect(row.data_confidence).toBe("moderate");
    expect(row.overview).toContain("hospitality");
    expect(row.economy_overview).toContain("Cocoa");
    expect(row.business_registration_guidance).toContain("NEIP");
    expect(row.major_exports).toContain("Cocoa");
    expect(row.technology_ecosystem).toContain("Accra");
    expect(Array.isArray(row.sources)).toBe(true);
    expect((row.sources as { url?: string }[]).some((s) => s.url?.includes("ppaghana"))).toBe(true);
  });
});

describe("Opportunity trust labels", () => {
  it("parses curated sources from JSON", () => {
    const sources = parseCuratedSources([
      { title: "ARMP", type: "public_portal", url: "https://armp.sn" },
      { note: "curated import" },
    ]);
    expect(sources).toHaveLength(2);
    expect(sources[0]?.url).toBe("https://armp.sn");
  });

  it("uses honest curated label (not government verified)", () => {
    expect(OPPORTUNITY_TRUST_LABELS.curated).toContain("Curated");
    expect(OPPORTUNITY_TRUST_LABELS.curated).not.toMatch(/government verified/i);
  });

  it("formats last verified dates", () => {
    expect(formatLastVerified("2026-01-15T12:00:00.000Z")).toBeTruthy();
    expect(formatLastVerified(null)).toBeNull();
  });
});
