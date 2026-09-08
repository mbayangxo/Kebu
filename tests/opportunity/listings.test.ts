import { describe, expect, it } from "vitest";
import { rowToOpportunity, opportunityToDbRow } from "@/lib/opportunity/listings";
import type { Opportunity } from "@/lib/types";

const sample: Opportunity = {
  id: "opp-test-001",
  title: "Test Grant",
  country: "Senegal",
  type: "Grant",
  sectors: ["Agriculture"],
  diaspora_allowed: true,
  currency: "USD",
  source_url: "https://example.org/grant",
  source_name: "Example Ministry",
  verified_status: "verified",
  verified_at: "2026-01-15",
  volatility: "medium",
  summary: "A test grant for youth agribusiness.",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("opportunity listings", () => {
  it("maps db row metadata to trust fields", () => {
    const row = opportunityToDbRow(sample);
    expect(row.metadata).toMatchObject({
      verified_at: "2026-01-15",
      volatility: "medium",
    });

    const back = rowToOpportunity({
      ...(row as Record<string, unknown>),
      metadata: row.metadata as Record<string, unknown>,
    } as Parameters<typeof rowToOpportunity>[0]);

    expect(back.verified_at).toBe("2026-01-15");
    expect(back.volatility).toBe("medium");
    expect(back.title).toBe("Test Grant");
  });

  it("curated seed export is non-empty", async () => {
    const { CURATED_OPPORTUNITY_SEED } = await import("@/lib/opportunity/curated-listings");
    expect(CURATED_OPPORTUNITY_SEED.length).toBeGreaterThanOrEqual(3);
    for (const opp of CURATED_OPPORTUNITY_SEED) {
      expect(opp.source_url).toMatch(/^https?:\/\//);
      expect(opp.source_name.length).toBeGreaterThan(0);
    }
  });
});
