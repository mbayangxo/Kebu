import { describe, expect, it } from "vitest";
import { perfumeMaisonWorldDefinition } from "@/lib/create/design-worlds/perfume-maison-world";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { isPublicTemplateSlug } from "@/lib/create/templates-seed";
import { isAestheticTypeLocked, USER_AESTHETICS_BY_TYPE } from "@/lib/create/user-aesthetics-catalog";

describe("perfume-maison design world (Phase D)", () => {
  it("validates multipage fragrance IA", () => {
    const def = perfumeMaisonWorldDefinition();
    expect(def.pages.map((p) => p.slug)).toEqual([
      "home",
      "shop",
      "story",
      "stockists",
      "faq",
      "contact",
    ]);
    expect(validateWebsiteDefinition(def).ok).toBe(true);
  });

  it("is public as perfume-brand and fragrance type is locked", () => {
    expect(isPublicTemplateSlug("perfume-brand")).toBe(true);
    expect(isAestheticTypeLocked("fragrance")).toBe(true);
    const frag = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "fragrance");
    expect(frag?.pair.some((p) => p.slug === "perfume-brand")).toBe(true);
  });
});
