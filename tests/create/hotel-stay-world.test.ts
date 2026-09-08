import { describe, expect, it } from "vitest";
import { hotelStayWorldDefinition } from "@/lib/create/design-worlds/hotel-stay-world";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { isPublicTemplateSlug } from "@/lib/create/templates-seed";
import { USER_AESTHETICS_BY_TYPE } from "@/lib/create/user-aesthetics-catalog";

describe("hotel-stay design world", () => {
  it("validates multipage hospitality IA", () => {
    const def = hotelStayWorldDefinition();
    expect(def.pages.map((p) => p.slug)).toEqual([
      "home",
      "rooms",
      "amenities",
      "stay",
      "faq",
      "contact",
    ]);
    expect(validateWebsiteDefinition(def).ok).toBe(true);
  });

  it("is public and listed in food aesthetics pair", () => {
    expect(isPublicTemplateSlug("hotel-stay")).toBe(true);
    const food = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "food");
    expect(food?.pair.some((p) => p.slug === "hotel-stay")).toBe(true);
  });
});
