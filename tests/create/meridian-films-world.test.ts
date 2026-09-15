import { describe, expect, it } from "vitest";
import { meridianFilmsWorldDefinition } from "@/lib/create/design-worlds/meridian-films-world";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { isPublicTemplateSlug } from "@/lib/create/templates-seed";
import { USER_AESTHETICS_BY_TYPE } from "@/lib/create/user-aesthetics-catalog";

describe("meridian-films design world", () => {
  it("validates multipage film studio IA", () => {
    const def = meridianFilmsWorldDefinition();
    expect(def.pages.map((p) => p.slug)).toEqual([
      "home",
      "films",
      "shop",
      "submissions",
      "press",
      "about",
      "faq",
    ]);
    const validated = validateWebsiteDefinition(def);
    expect(validated.ok).toBe(true);
  });

  it("includes an editorial hero, film catalog, screenings, merch, press, submissions form — not hero-only", () => {
    const def = meridianFilmsWorldDefinition();
    const home = def.pages.find((p) => p.slug === "home");
    const homeTypes = home?.sections.map((s) => s.type) ?? [];
    expect(homeTypes).toContain("editorial-hero");
    expect(homeTypes).toContain("marquee");
    expect(homeTypes).toContain("features");

    const films = def.pages.find((p) => p.slug === "films");
    expect(films?.sections.some((s) => s.type === "events")).toBe(true);

    const shop = def.pages.find((p) => p.slug === "shop");
    expect(shop?.sections.some((s) => s.type === "products")).toBe(true);

    const submissions = def.pages.find((p) => p.slug === "submissions");
    expect(submissions?.sections.some((s) => s.type === "form")).toBe(true);

    const press = def.pages.find((p) => p.slug === "press");
    expect(press?.sections.some((s) => s.type === "stats")).toBe(true);
    expect(press?.sections.some((s) => s.type === "testimonials")).toBe(true);

    const faq = def.pages.find((p) => p.slug === "faq");
    expect(faq?.sections.some((s) => s.type === "faq")).toBe(true);
  });

  it("is public and listed as the 3rd production aesthetic (explicit lock override)", () => {
    expect(isPublicTemplateSlug("meridian-films")).toBe(true);
    const production = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "production");
    expect(production?.pair.length).toBe(3);
    expect(production?.pair.some((p) => p.slug === "meridian-films")).toBe(true);
    // The two previously-locked production looks must remain untouched by this addition.
    expect(production?.pair.some((p) => p.slug === "production-company")).toBe(true);
    expect(production?.pair.some((p) => p.slug === "film-studio")).toBe(true);
  });

  it("does not reuse other owner-brand assets or reference the source brand it was inspired by", () => {
    const blob = JSON.stringify(meridianFilmsWorldDefinition());
    expect(blob).not.toMatch(/maylecor|legally-blonde|\ba24\b/i);
  });
});
