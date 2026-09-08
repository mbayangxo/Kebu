import { describe, expect, it } from "vitest";
import { layersBeautyWorldDefinition } from "@/lib/create/design-worlds/layers-beauty-world";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { TEMPLATE_CARD_VISUALS } from "@/lib/create/template-visuals";
import { isPublicTemplateSlug } from "@/lib/create/templates-seed";
import { USER_AESTHETICS_BY_TYPE } from "@/lib/create/user-aesthetics-catalog";

describe("layers-beauty design world", () => {
  it("validates multipage beauty-shop IA", () => {
    const def = layersBeautyWorldDefinition();
    expect(def.pages.map((p) => p.slug)).toEqual([
      "home",
      "shop",
      "about",
      "gallery",
      "faq",
      "journal",
      "contact",
      "gifts",
    ]);
    const validated = validateWebsiteDefinition(def);
    expect(validated.ok).toBe(true);
  });

  it("includes shop products, form contact, faq, blog-list, email-popup — not hero-only", () => {
    const def = layersBeautyWorldDefinition();
    const home = def.pages.find((p) => p.slug === "home");
    const homeTypes = home?.sections.map((s) => s.type) ?? [];
    expect(homeTypes).toContain("products");
    expect(homeTypes).toContain("gallery");
    expect(homeTypes).toContain("email-popup");
    expect(homeTypes).toContain("newsletter");

    const contact = def.pages.find((p) => p.slug === "contact");
    expect(contact?.sections.some((s) => s.type === "form")).toBe(true);

    const faq = def.pages.find((p) => p.slug === "faq");
    expect(faq?.sections.some((s) => s.type === "faq")).toBe(true);

    const journal = def.pages.find((p) => p.slug === "journal");
    expect(journal?.sections.some((s) => s.type === "blog-list")).toBe(true);
  });

  it("is public with beauty card chrome and listed in aesthetics pair", () => {
    expect(isPublicTemplateSlug("layers-beauty")).toBe(true);
    expect(TEMPLATE_CARD_VISUALS["layers-beauty"]?.wordmark).toBe("LAYERS");
    const beauty = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "beauty");
    expect(beauty?.pair.some((p) => p.slug === "layers-beauty")).toBe(true);
  });

  it("does not reuse May Lecor / legally-blonde assets", () => {
    const blob = JSON.stringify(layersBeautyWorldDefinition());
    expect(blob).not.toMatch(/maylecor|legally-blonde/i);
  });
});
