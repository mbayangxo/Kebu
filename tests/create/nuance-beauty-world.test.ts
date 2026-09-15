import { describe, expect, it } from "vitest";
import { nuanceBeautyWorldDefinition } from "@/lib/create/design-worlds/nuance-beauty-world";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { isPublicTemplateSlug } from "@/lib/create/templates-seed";
import { USER_AESTHETICS_BY_TYPE } from "@/lib/create/user-aesthetics-catalog";

describe("nuance-beauty design world", () => {
  it("validates multipage cosmetics IA", () => {
    const def = nuanceBeautyWorldDefinition();
    expect(def.pages.map((p) => p.slug)).toEqual([
      "home",
      "shop",
      "shade-finder",
      "looks",
      "reviews",
      "about",
      "faq",
    ]);
    const validated = validateWebsiteDefinition(def);
    expect(validated.ok).toBe(true);
  });

  it("includes products, shade finder quiz, gallery, testimonials, faq — not hero-only", () => {
    const def = nuanceBeautyWorldDefinition();
    const home = def.pages.find((p) => p.slug === "home");
    const homeTypes = home?.sections.map((s) => s.type) ?? [];
    expect(homeTypes).toContain("products");
    expect(homeTypes).toContain("trust-badges");
    expect(homeTypes).toContain("social-proof");

    const shadeFinder = def.pages.find((p) => p.slug === "shade-finder");
    expect(shadeFinder?.sections.some((s) => s.type === "quiz")).toBe(true);

    const looks = def.pages.find((p) => p.slug === "looks");
    expect(looks?.sections.some((s) => s.type === "gallery")).toBe(true);

    const reviews = def.pages.find((p) => p.slug === "reviews");
    expect(reviews?.sections.some((s) => s.type === "testimonials")).toBe(true);

    const faq = def.pages.find((p) => p.slug === "faq");
    expect(faq?.sections.some((s) => s.type === "faq")).toBe(true);
    expect(faq?.sections.some((s) => s.type === "form")).toBe(true);
  });

  it("is public and listed in the beauty aesthetic", () => {
    expect(isPublicTemplateSlug("nuance-beauty")).toBe(true);
    const beauty = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "beauty");
    expect(beauty?.pair.some((p) => p.slug === "nuance-beauty")).toBe(true);
    expect(beauty?.pair.some((p) => p.slug === "hair-salon")).toBe(true);
    expect(beauty?.pair.some((p) => p.slug === "layers-beauty")).toBe(true);
    expect(beauty?.pair.some((p) => p.slug === "clarte-compatible-skin")).toBe(true);
  });

  it("does not reuse other owner-brand assets or reference the source brand it was inspired by", () => {
    const blob = JSON.stringify(nuanceBeautyWorldDefinition());
    expect(blob).not.toMatch(/maylecor|legally-blonde|fenty|rihanna|gloss bomb/i);
  });
});
