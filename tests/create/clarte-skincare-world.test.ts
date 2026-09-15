import { describe, expect, it } from "vitest";
import { clarteSkincareWorldDefinition } from "@/lib/create/design-worlds/clarte-skincare-world";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { isPublicTemplateSlug } from "@/lib/create/templates-seed";
import { USER_AESTHETICS_BY_TYPE } from "@/lib/create/user-aesthetics-catalog";

describe("clarte-compatible-skin design world", () => {
  it("validates multipage skincare IA", () => {
    const def = clarteSkincareWorldDefinition();
    expect(def.pages.map((p) => p.slug)).toEqual([
      "home",
      "shop",
      "compatibility",
      "routine",
      "reviews",
      "about",
      "faq",
    ]);
    const validated = validateWebsiteDefinition(def);
    expect(validated.ok).toBe(true);
  });

  it("includes products, compatibility chart, quiz, testimonials, faq — not hero-only", () => {
    const def = clarteSkincareWorldDefinition();
    const home = def.pages.find((p) => p.slug === "home");
    const homeTypes = home?.sections.map((s) => s.type) ?? [];
    expect(homeTypes).toContain("products");
    expect(homeTypes).toContain("trust-badges");
    expect(homeTypes).toContain("before-after");
    expect(homeTypes).toContain("social-proof");

    const compatibility = def.pages.find((p) => p.slug === "compatibility");
    expect(compatibility?.sections.some((s) => s.type === "features")).toBe(true);

    const routine = def.pages.find((p) => p.slug === "routine");
    expect(routine?.sections.some((s) => s.type === "quiz")).toBe(true);

    const reviews = def.pages.find((p) => p.slug === "reviews");
    expect(reviews?.sections.some((s) => s.type === "testimonials")).toBe(true);

    const faq = def.pages.find((p) => p.slug === "faq");
    expect(faq?.sections.some((s) => s.type === "faq")).toBe(true);
    expect(faq?.sections.some((s) => s.type === "form")).toBe(true);
  });

  it("is public and listed as the 3rd beauty aesthetic (explicit lock override)", () => {
    expect(isPublicTemplateSlug("clarte-compatible-skin")).toBe(true);
    const beauty = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "beauty");
    expect(beauty?.pair.length).toBe(3);
    expect(beauty?.pair.some((p) => p.slug === "clarte-compatible-skin")).toBe(true);
    // The two previously-locked beauty looks must remain untouched by this addition.
    expect(beauty?.pair.some((p) => p.slug === "hair-salon")).toBe(true);
    expect(beauty?.pair.some((p) => p.slug === "layers-beauty")).toBe(true);
  });

  it("does not reuse other owner-brand assets or reference the source brand it was inspired by", () => {
    const blob = JSON.stringify(clarteSkincareWorldDefinition());
    expect(blob).not.toMatch(/maylecor|legally-blonde|drunk elephant|elephant/i);
  });
});
