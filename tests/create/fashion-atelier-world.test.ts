import { describe, expect, it } from "vitest";
import { fashionAtelierWorldDefinition } from "@/lib/create/design-worlds/fashion-atelier-world";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { TEMPLATE_CARD_VISUALS } from "@/lib/create/template-visuals";
import { isPublicTemplateSlug } from "@/lib/create/templates-seed";

describe("fashion-atelier design world (B5)", () => {
  it("validates multipage editorial IA", () => {
    const def = fashionAtelierWorldDefinition();
    expect(def.pages.map((p) => p.slug)).toEqual(["home", "lookbook", "about", "contact"]);
    const validated = validateWebsiteDefinition(def);
    expect(validated.ok).toBe(true);
  });

  it("includes gallery + features — not hero-only stack", () => {
    const home = fashionAtelierWorldDefinition().pages.find((p) => p.slug === "home");
    const types = home?.sections.map((s) => s.type) ?? [];
    expect(types).toContain("gallery");
    expect(types).toContain("features");
    const gallery = home?.sections.find((s) => s.type === "gallery");
    expect((gallery?.props as { items?: unknown[] }).items?.length).toBeGreaterThan(0);
  });

  it("does not reuse May Lecor assets", () => {
    expect(JSON.stringify(fashionAtelierWorldDefinition())).not.toMatch(/maylecor|legally-blonde/i);
  });

  it("is a public template with fashion card chrome", () => {
    expect(isPublicTemplateSlug("fashion-atelier")).toBe(true);
    expect(TEMPLATE_CARD_VISUALS["fashion-atelier"]?.layout).toBe("fashion");
  });
});
