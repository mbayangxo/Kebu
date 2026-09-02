import { describe, expect, it } from "vitest";
import {
  buildPersonalizedPlan,
  filterCountriesForProfile,
  filterStoriesForProfile,
  scoreCountryForProfile,
  type CountryForMatch,
  type StoryForMatch,
} from "@/lib/opportunity/personalize";
import type { OpportunityProfile } from "@/lib/opportunity/intake-schema";

const baseProfile: OpportunityProfile = {
  userId: "u1",
  mainGoal: "start_business",
  goals: ["start_business"],
  interestPaths: ["construction_bidding"],
  resourceNeeds: ["tenders_contracts", "grants"],
  startingBudgetBand: "under_50k",
  preferredCountryCodes: ["SN"],
  enjoyDoing: "I like building and organizing crews",
  intakeComplete: true,
  intakeVersion: "v1",
};

const senegal: CountryForMatch = {
  country: "Senegal",
  country_code: "SN",
  industries: ["construction", "agriculture"],
  youth_programs: ["ADEPME youth"],
  public_entrepreneurship_programs: ["DER/FJ"],
};

const kenya: CountryForMatch = {
  country: "Kenya",
  country_code: "KE",
  industries: ["tech", "tourism"],
};

describe("Opportunity personalization", () => {
  it("ranks preferred countries and matching industries higher", () => {
    expect(scoreCountryForProfile(senegal, baseProfile)).toBeGreaterThan(
      scoreCountryForProfile(kenya, baseProfile),
    );
    const ordered = filterCountriesForProfile([kenya, senegal], baseProfile);
    expect(ordered[0].country_code).toBe("SN");
  });

  it("matches heritage stories to ancestry interest", () => {
    const stories: StoryForMatch[] = [
      {
        id: "1",
        slug: "mali",
        title: "Mali trade",
        person_name: "Legacy",
        country_code: "ML",
        era: "ancestral_legacy",
        summary: "Gold routes across the Sahel.",
        lesson: "Organize trade.",
        themes: ["ancestry_heritage"],
        resource_tags: ["ancestral_knowledge"],
        trust_label: "verified_public",
        source_url: null,
      },
      {
        id: "2",
        slug: "tech",
        title: "Tech hub",
        person_name: "Founder",
        country_code: "KE",
        era: "contemporary",
        summary: "Software startup.",
        lesson: "Ship fast.",
        themes: ["tech_software"],
        resource_tags: ["startup_programs"],
        trust_label: "verified_public",
        source_url: null,
      },
    ];
    const heritageProfile: OpportunityProfile = {
      ...baseProfile,
      interestPaths: ["ancestry_heritage"],
      preferredCountryCodes: [],
    };
    const ordered = filterStoriesForProfile(stories, heritageProfile);
    expect(ordered[0].era).toBe("ancestral_legacy");
  });

  it("builds a plan with budget and tender hints", () => {
    const plan = buildPersonalizedPlan(baseProfile);
    expect(plan.startSteps.length).toBeGreaterThan(0);
    expect(plan.resourceHints.some((h) => h.label.includes("Tenders"))).toBe(true);
    expect(plan.headline).toContain("building");
  });
});
