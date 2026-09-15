import { describe, expect, it } from "vitest";
import { nueeIntimatesWorldDefinition } from "@/lib/create/design-worlds/nuee-intimates-world";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { isPublicTemplateSlug } from "@/lib/create/templates-seed";
import { USER_AESTHETICS_BY_TYPE } from "@/lib/create/user-aesthetics-catalog";

describe("nuee-intimates design world", () => {
  it("validates multipage intimates IA", () => {
    const def = nueeIntimatesWorldDefinition();
    expect(def.pages.map((p) => p.slug)).toEqual([
      "home",
      "shop",
      "fit-finder",
      "reviews",
      "about",
      "faq",
    ]);
    const validated = validateWebsiteDefinition(def);
    expect(validated.ok).toBe(true);
  });

  it("includes products, fit finder quiz, testimonials, faq — not hero-only", () => {
    const def = nueeIntimatesWorldDefinition();
    const home = def.pages.find((p) => p.slug === "home");
    const homeTypes = home?.sections.map((s) => s.type) ?? [];
    expect(homeTypes).toContain("products");
    expect(homeTypes).toContain("trust-badges");
    expect(homeTypes).toContain("social-proof");

    const fitFinder = def.pages.find((p) => p.slug === "fit-finder");
    expect(fitFinder?.sections.some((s) => s.type === "quiz")).toBe(true);
    expect(fitFinder?.sections.some((s) => s.type === "features")).toBe(true);

    const reviews = def.pages.find((p) => p.slug === "reviews");
    expect(reviews?.sections.some((s) => s.type === "testimonials")).toBe(true);

    const faq = def.pages.find((p) => p.slug === "faq");
    expect(faq?.sections.some((s) => s.type === "faq")).toBe(true);
    expect(faq?.sections.some((s) => s.type === "form")).toBe(true);
  });

  it("is public and listed in the fashion aesthetic", () => {
    expect(isPublicTemplateSlug("nuee-intimates")).toBe(true);
    const fashion = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "fashion");
    expect(fashion?.pair.some((p) => p.slug === "nuee-intimates")).toBe(true);
    expect(fashion?.pair.some((p) => p.slug === "fashion-atelier")).toBe(true);
    expect(fashion?.pair.some((p) => p.slug === "clothing-company")).toBe(true);
  });

  it("does not reuse other owner-brand assets or reference the source brand it was inspired by", () => {
    const blob = JSON.stringify(nueeIntimatesWorldDefinition());
    expect(blob).not.toMatch(/maylecor|legally-blonde|syrn|sydney sweeney/i);
  });
});
