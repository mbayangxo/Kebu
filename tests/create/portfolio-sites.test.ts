import { describe, expect, it } from "vitest";
import { PORTFOLIO_SITES } from "@/lib/create/portfolio-sites";
import { definitionFromTemplateSlug } from "@/lib/create/ai-generate";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { isOwnerPortfolioDescription } from "@/lib/create/go-live";

describe("portfolio sites", () => {
  it("defines May Lecor and K-Direction seeds", () => {
    expect(PORTFOLIO_SITES.map((s) => s.key)).toEqual(["maylecor", "kdirection"]);
  });

  it("marks descriptions as owner portfolio for free hosting", () => {
    for (const site of PORTFOLIO_SITES) {
      expect(isOwnerPortfolioDescription(site.description)).toBe(true);
    }
    expect(isOwnerPortfolioDescription("generic agency site")).toBe(false);
  });

  it("builds valid website definitions for both portfolio templates", () => {
    for (const site of PORTFOLIO_SITES) {
      const def = definitionFromTemplateSlug(site.templateSlug, {
        mode: "template",
        businessId: "11111111-1111-4111-8111-111111111111",
        businessName: site.title,
        category: site.category,
        description: site.description,
        countryCode: site.countryCode,
        locale: "en",
        desiredPages: ["home"],
        templateSlug: site.templateSlug,
      });
      expect(def).not.toBeNull();
      const validated = validateWebsiteDefinition(def!);
      expect(validated.ok).toBe(true);
      expect(def!.title).toBe(site.title);
    }
  });

  it("uses owner-only template slugs for both sites", () => {
    expect(PORTFOLIO_SITES.find((s) => s.key === "maylecor")?.templateSlug).toBe("musician-maylecor-ksendr");
    expect(PORTFOLIO_SITES.find((s) => s.key === "kdirection")?.templateSlug).toBe("agency-kdirection");
  });
});
