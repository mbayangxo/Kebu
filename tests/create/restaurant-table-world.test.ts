import { describe, expect, it } from "vitest";
import { restaurantTableWorldDefinition } from "@/lib/create/design-worlds/restaurant-table-world";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { isPublicTemplateSlug } from "@/lib/create/templates-seed";
import { isAestheticTypeLocked, USER_AESTHETICS_BY_TYPE } from "@/lib/create/user-aesthetics-catalog";

describe("restaurant-table design world (Phase E)", () => {
  it("validates multipage hospitality IA", () => {
    const def = restaurantTableWorldDefinition();
    expect(def.pages.map((p) => p.slug)).toEqual(["home", "menu", "about", "reserve", "faq"]);
    expect(validateWebsiteDefinition(def).ok).toBe(true);
  });

  it("is public and food type is locked", () => {
    expect(isPublicTemplateSlug("restaurant-table")).toBe(true);
    expect(isAestheticTypeLocked("food")).toBe(true);
    const food = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "food");
    expect(food?.pair.some((p) => p.slug === "restaurant-table")).toBe(true);
  });
});
