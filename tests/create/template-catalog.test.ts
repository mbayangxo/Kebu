import { describe, expect, it } from "vitest";
import { groupTemplatesByCategory, templateGroupId } from "@/lib/create/template-catalog";
import { publicTemplateSeeds, TEMPLATE_SEEDS } from "@/lib/create/templates-seed";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";

describe("template catalog", () => {
  it("groups all public seeds into organized categories", () => {
    const groups = groupTemplatesByCategory(publicTemplateSeeds());
    expect(groups.length).toBeGreaterThan(10);
    const total = groups.reduce((n, g) => n + g.templates.length, 0);
    expect(total).toBe(publicTemplateSeeds().length);
  });

  it("hides owner portfolio seeds from the public catalog", () => {
    expect(TEMPLATE_SEEDS.some((t) => t.slug === "musician-kdirection-artist")).toBe(true);
    expect(TEMPLATE_SEEDS.some((t) => t.slug === "agency-kdirection")).toBe(true);
    expect(publicTemplateSeeds().some((t) => t.slug === "musician-kdirection-artist")).toBe(false);
    expect(publicTemplateSeeds().some((t) => t.slug === "agency-kdirection")).toBe(false);
    expect(publicTemplateSeeds().some((t) => t.slug === "musician-artist")).toBe(true);
    expect(publicTemplateSeeds().some((t) => t.slug === "agency-creative")).toBe(true);
  });

  it("includes agency, production, salon, and perfume templates", () => {
    const slugs = new Set(TEMPLATE_SEEDS.map((t) => t.slug));
    expect(slugs.has("agency-creative")).toBe(true);
    expect(slugs.has("production-company")).toBe(true);
    expect(slugs.has("hair-salon")).toBe(true);
    expect(slugs.has("perfume-brand")).toBe(true);
  });

  it("maps new categories to picker groups", () => {
    expect(templateGroupId("agency")).toBe("agency");
    expect(templateGroupId("production")).toBe("production");
    expect(templateGroupId("fragrance")).toBe("fragrance");
  });

  it("complete business templates validate with all core sections", () => {
    for (const slug of ["agency-creative", "production-company", "hair-salon", "perfume-brand"] as const) {
      const seed = TEMPLATE_SEEDS.find((t) => t.slug === slug);
      expect(seed).toBeDefined();
      const result = validateWebsiteDefinition(seed!.definition);
      expect(result.ok, slug).toBe(true);
      const types = seed!.definition.pages[0]!.sections.map((s) => s.type);
      expect(types).toContain("navigation");
      expect(types).toContain("hero");
      expect(types).toContain("text");
      expect(types).toContain("features");
      expect(types).toContain("contact");
      expect(types).toContain("whatsapp");
      expect(types).toContain("footer");
    }
  });

  it("generic musician-artist public template validates", () => {
    const seed = TEMPLATE_SEEDS.find((t) => t.slug === "musician-artist");
    expect(seed).toBeDefined();
    expect(validateWebsiteDefinition(seed!.definition).ok).toBe(true);
  });
});
