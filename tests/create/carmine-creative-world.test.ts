import { describe, expect, it } from "vitest";
import { carmineCreativeWorldDefinition } from "@/lib/create/design-worlds/carmine-creative-world";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { TEMPLATE_CARD_VISUALS } from "@/lib/create/template-visuals";
import { isPublicTemplateSlug } from "@/lib/create/templates-seed";
import { USER_AESTHETICS_BY_TYPE } from "@/lib/create/user-aesthetics-catalog";

describe("carmine-creative design world", () => {
  it("validates multipage agency IA", () => {
    const def = carmineCreativeWorldDefinition();
    expect(def.pages.map((p) => p.slug)).toEqual([
      "home",
      "work",
      "services",
      "about",
      "journal",
      "contact",
    ]);
    expect(validateWebsiteDefinition(def).ok).toBe(true);
  });

  it("is public and listed in agency aesthetics pair", () => {
    expect(isPublicTemplateSlug("carmine-creative")).toBe(true);
    expect(TEMPLATE_CARD_VISUALS["carmine-creative"]?.wordmark).toBe("CARMINE");
    const agency = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "agency");
    expect(agency?.pair.some((p) => p.slug === "carmine-creative")).toBe(true);
  });
});
