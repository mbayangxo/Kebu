import { describe, expect, it } from "vitest";
import { FLAGSHIP_TEMPLATE_SLUGS } from "@/lib/create/template-visuals";
import { isPublicTemplateSlug, publicTemplateSeeds } from "@/lib/create/templates-seed";
import { userAestheticSlugs } from "@/lib/create/user-aesthetics-catalog";

describe("templates API merge contract", () => {
  it("keeps curated user aesthetics in the public seed list", () => {
    const slugs = new Set(publicTemplateSeeds().map((t) => t.slug));
    for (const slug of userAestheticSlugs()) {
      expect(slugs.has(slug)).toBe(true);
      expect(isPublicTemplateSlug(slug)).toBe(true);
    }
    expect(isPublicTemplateSlug("musician-maylecor-ksendr")).toBe(false);
    expect(isPublicTemplateSlug("agency-kdirection")).toBe(false);
  });

  it("recommends shop + agency starters as flagships", () => {
    expect(FLAGSHIP_TEMPLATE_SLUGS[0]).toBe("shopping-store");
    expect(FLAGSHIP_TEMPLATE_SLUGS[1]).toBe("carmine-creative");
  });
});
