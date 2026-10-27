import { describe, expect, it } from "vitest";
import {
  rowToDiscoveryHypothesisDetail,
  rowToImportReplacementDetail,
} from "@/lib/opportunity/explore-engines-schema";

describe("Opportunity OS explore-engines schema mapping", () => {
  it("maps an import-replacement DB row to its detail shape", () => {
    const row = {
      slug: "senegal-processed-cashew-value-addition",
      country_code: "SN",
      product_category: "Processed cashew products",
      import_dependency_note: "note",
      local_production_status: "status",
      raw_material_availability: "high",
      processing_gap: "gap",
      equipment_needed: ["Shelling equipment"],
      skills_needed: ["Food processing operations"],
      target_markets: ["Local retail"],
      verdict: "mixed",
      verdict_reasoning: "reasoning",
      confidence: "exploratory",
      trust_label: "curated",
      sources: [{ title: "Kebu Country Intelligence — Senegal profile" }],
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const detail = rowToImportReplacementDetail(row);
    expect(detail.slug).toBe("senegal-processed-cashew-value-addition");
    expect(detail.verdict).toBe("mixed");
    expect(detail.equipmentNeeded).toEqual(["Shelling equipment"]);
    expect(detail.sources[0]?.title).toContain("Kebu Country Intelligence");
  });

  it("defaults array fields to empty when the DB returns null", () => {
    const detail = rowToImportReplacementDetail({
      slug: "x",
      country_code: "SN",
      product_category: "x",
      import_dependency_note: "x",
      local_production_status: "x",
      raw_material_availability: null,
      processing_gap: null,
      equipment_needed: null,
      skills_needed: null,
      target_markets: null,
      verdict: "unlikely",
      verdict_reasoning: "x",
      confidence: "exploratory",
      trust_label: "curated",
      sources: [],
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    expect(detail.equipmentNeeded).toEqual([]);
    expect(detail.skillsNeeded).toEqual([]);
    expect(detail.targetMarkets).toEqual([]);
  });

  it("maps a discovery-hypothesis DB row to its detail shape", () => {
    const detail = rowToDiscoveryHypothesisDetail({
      slug: "senegal-agtech-export-tooling",
      title: "Export-processing and traceability tooling",
      country_code: "SN",
      confidence: "exploratory",
      trust_label: "curated",
      hypothesis: "hypothesis text",
      signal_basis: ["country_profiles.technology_ecosystem"],
      reasoning: "reasoning text",
      sources: [{ title: "Kebu Country Intelligence — Senegal profile" }],
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    expect(detail.title).toContain("Export-processing");
    expect(detail.signalBasis).toEqual(["country_profiles.technology_ecosystem"]);
  });
});
