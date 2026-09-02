import { describe, expect, it } from "vitest";
import {
  formatProfileForYande,
  mainGoalLabel,
  toPersonalizationSummary,
  userIsExploreOnly,
} from "@/lib/account/kebu-personalization";
import type { OpportunityProfile } from "@/lib/opportunity/intake-schema";

const exploreProfile: OpportunityProfile = {
  userId: "u1",
  mainGoal: "explore_africa",
  goals: ["explore_africa"],
  interestPaths: [],
  resourceNeeds: [],
  startingBudgetBand: "not_sure",
  preferredCountryCodes: ["SN"],
  enjoyDoing: "I love music and culture",
  intakeComplete: true,
  intakeVersion: "v1",
};

describe("Kebu personalization", () => {
  it("labels here-for goals", () => {
    expect(mainGoalLabel("explore_africa")).toContain("Explore Africa");
  });

  it("detects explore-only users", () => {
    expect(userIsExploreOnly(exploreProfile)).toBe(true);
    expect(
      userIsExploreOnly({ ...exploreProfile, mainGoal: "start_business", goals: ["start_business"] }),
    ).toBe(false);
  });

  it("formats profile for Yande without pushing business", () => {
    const text = formatProfileForYande(exploreProfile);
    expect(text).toMatch(/exploring/i);
    expect(text).toMatch(/do NOT push business/i);
  });

  it("builds home personalization summary", () => {
    const s = toPersonalizationSummary(exploreProfile, false);
    expect(s.needsIntake).toBe(false);
    expect(s.exploreOnly).toBe(true);
    expect(s.intakeHref).toBe("/welcome");
  });
});
