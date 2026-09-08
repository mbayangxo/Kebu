import { describe, expect, it } from "vitest";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { createWebsiteBriefSchema } from "@/lib/create/website-schema";
import { definitionFromTemplateSlug } from "@/lib/create/ai-generate";
import { artistDarkStageWorldDefinition, streamingLaunchWorldDefinition } from "@/lib/create/design-worlds/music-worlds";
import { productionHouseWorldDefinition, filmStudioWorldDefinition } from "@/lib/create/design-worlds/production-worlds";
import { companySiteWorldDefinition, buildTradeWorldDefinition } from "@/lib/create/design-worlds/business-worlds";
import { appLaunchWorldDefinition, techStartupWorldDefinition } from "@/lib/create/design-worlds/tech-worlds";
import { proPortfolioWorldDefinition, studentPortfolioWorldDefinition } from "@/lib/create/design-worlds/portfolio-worlds";
import { ngoImpactWorldDefinition, farmAgriWorldDefinition } from "@/lib/create/design-worlds/impact-worlds";
import { professionalServicesWorldDefinition } from "@/lib/create/design-worlds/agency-professional-world";
import { LOCKED_AESTHETIC_TYPES } from "@/lib/create/user-aesthetics-catalog";

const WORLDS: { slug: string; def: () => ReturnType<typeof artistDarkStageWorldDefinition> }[] = [
  { slug: "musician-artist", def: artistDarkStageWorldDefinition },
  { slug: "musician-streaming", def: streamingLaunchWorldDefinition },
  { slug: "production-company", def: productionHouseWorldDefinition },
  { slug: "film-studio", def: filmStudioWorldDefinition },
  { slug: "business-company", def: companySiteWorldDefinition },
  { slug: "construction-build", def: buildTradeWorldDefinition },
  { slug: "app-launch", def: appLaunchWorldDefinition },
  { slug: "tech-startup", def: techStartupWorldDefinition },
  { slug: "portfolio-pro", def: proPortfolioWorldDefinition },
  { slug: "student-portfolio", def: studentPortfolioWorldDefinition },
  { slug: "ngo-impact", def: ngoImpactWorldDefinition },
  { slug: "agriculture-farm", def: farmAgriWorldDefinition },
  { slug: "professional-services", def: professionalServicesWorldDefinition },
];

describe("Senegal remaining aesthetic worlds", () => {
  it("locks all user aesthetic types", () => {
    expect(LOCKED_AESTHETIC_TYPES).toEqual(
      expect.arrayContaining([
        "music",
        "production",
        "business",
        "tech",
        "portfolio",
        "impact",
        "store",
        "agency",
      ]),
    );
  });

  for (const w of WORLDS) {
    it(`validates ${w.slug}`, () => {
      const v = validateWebsiteDefinition(w.def());
      expect(v.ok).toBe(true);
      if (v.ok) {
        expect(v.data.pages.length).toBeGreaterThanOrEqual(4);
        expect(v.data.pages[0]?.slug).toBe("home");
      }
    });

    it(`wires seed ${w.slug}`, () => {
      const brief = createWebsiteBriefSchema.parse({
        mode: "template",
        businessName: "Test Biz",
        category: "general",
        description: "Senegal business site for local customers.",
        countryCode: "SN",
        templateSlug: w.slug,
      });
      const def = definitionFromTemplateSlug(w.slug, brief);
      expect(def).toBeTruthy();
      expect(validateWebsiteDefinition(def!).ok).toBe(true);
    });
  }
});
