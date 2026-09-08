import { describe, expect, it } from "vitest";
import {
  opportunityCardSlugSchema,
  rowToOpportunityCardDetail,
  rowToOpportunityCardListItem,
} from "@/lib/opportunity/opportunity-card-schema";

describe("Opportunity Card schema", () => {
  it("validates slugs", () => {
    expect(opportunityCardSlugSchema.parse("senegal-local-pharma-supply")).toBe(
      "senegal-local-pharma-supply",
    );
    expect(opportunityCardSlugSchema.safeParse("Bad Slug").success).toBe(false);
  });

  it("maps DB rows to list + detail shapes", () => {
    const row = {
      slug: "senegal-local-pharma-supply",
      title: "Local pharma",
      opportunity_summary: "Import replacement opportunity in Senegal.",
      country_code: "SN",
      location_label: "Senegal",
      confidence: "medium",
      trust_label: "curated",
      difficulty: "high",
      capital_intensity: "high",
      problem: "Imports dominate supply.",
      evidence: "Public procurement lists local supplier gaps.",
      why_now: "Supply chain focus post-COVID.",
      customer_segment: "Hospitals",
      current_solutions: "Importers",
      import_dependency: "High",
      local_resources: ["Graduates"],
      required_capabilities: ["GMP"],
      estimated_market: "Regional",
      competition: "Importers",
      regulatory_notes: "Registration required",
      potential_african_markets: ["Mali"],
      business_models: ["Partnership"],
      time_to_market: "12 months",
      sources: [{ title: "PNA", url: "https://www.pna.sn" }],
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const list = rowToOpportunityCardListItem(row);
    expect(list.slug).toBe("senegal-local-pharma-supply");
    expect(list.countryCode).toBe("SN");

    const detail = rowToOpportunityCardDetail(row);
    expect(detail.problem).toContain("Imports");
    expect(detail.sources[0]?.url).toBe("https://www.pna.sn");
  });
});
