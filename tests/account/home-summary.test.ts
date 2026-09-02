import { describe, expect, it } from "vitest";
import type { HomeSummary } from "@/lib/account/home-summary";

describe("HomeSummary shape", () => {
  it("accepts empty businesses and updates", () => {
    const s: HomeSummary = {
      profile: { name: "Awa", email: "a@x.com", avatarUrl: null, afriqueId: null },
      stats: {
        sitesTotal: 0,
        sitesPublished: 0,
        storeProducts: 0,
        emailSubscribers: 0,
        createDesigns: 0,
        countriesLive: 1,
      },
      businesses: [],
      sites: [],
      email: { subscribers: 0, draftCampaigns: 0, lastCampaignSubject: null },
      opportunities: { count: 1, exploreHref: "/opportunity/countries" },
      personalization: {
        needsIntake: true,
        mainGoal: null,
        mainGoalLabel: "Exploring Kebu",
        enjoyDoing: "",
        exploreOnly: true,
        intakeHref: "/welcome",
      },
      updates: [],
    };
    expect(s.stats.countriesLive).toBe(1);
  });
});
