import { describe, expect, it } from "vitest";
import {
  isAestheticTypeLocked,
  LOCKED_AESTHETIC_TYPES,
  USER_AESTHETICS_BY_TYPE,
} from "@/lib/create/user-aesthetics-catalog";
import { isPublicTemplateSlug } from "@/lib/create/templates-seed";

describe("locked aesthetic pairs", () => {
  it("locks beauty to hair-salon + layers-beauty", () => {
    expect(isAestheticTypeLocked("beauty")).toBe(true);
    const beauty = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "beauty");
    expect(beauty?.pair.map((p) => p.slug).sort()).toEqual(["hair-salon", "layers-beauty"].sort());
    for (const p of beauty?.pair ?? []) {
      expect(isPublicTemplateSlug(p.slug)).toBe(true);
    }
  });

  it("locks agency to carmine-creative + professional-services", () => {
    expect(isAestheticTypeLocked("agency")).toBe(true);
    expect(LOCKED_AESTHETIC_TYPES).toContain("agency");
    const agency = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "agency");
    expect(agency?.pair.some((p) => p.slug === "carmine-creative")).toBe(true);
  });

  it("locks fashion to fashion-atelier + clothing-company", () => {
    expect(isAestheticTypeLocked("fashion")).toBe(true);
    const fashion = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "fashion");
    expect(fashion?.pair.map((p) => p.slug).sort()).toEqual(
      ["clothing-company", "fashion-atelier"].sort(),
    );
  });

  it("locks fragrance to perfume-brand + scent-boutique", () => {
    expect(isAestheticTypeLocked("fragrance")).toBe(true);
    const frag = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "fragrance");
    expect(frag?.pair.map((p) => p.slug).sort()).toEqual(["perfume-brand", "scent-boutique"].sort());
  });

  it("locks food to restaurant-table + hotel-stay", () => {
    expect(isAestheticTypeLocked("food")).toBe(true);
    const food = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "food");
    expect(food?.pair.map((p) => p.slug).sort()).toEqual(["hotel-stay", "restaurant-table"].sort());
  });
});
