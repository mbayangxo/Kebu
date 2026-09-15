import { describe, expect, it } from "vitest";
import {
  isAestheticTypeLocked,
  LOCKED_AESTHETIC_TYPES,
  USER_AESTHETICS_BY_TYPE,
} from "@/lib/create/user-aesthetics-catalog";
import { isPublicTemplateSlug } from "@/lib/create/templates-seed";

describe("locked aesthetic pairs", () => {
  it("locks beauty to hair-salon + layers-beauty, plus two explicit overrides (clarte-compatible-skin, nuance-beauty)", () => {
    expect(isAestheticTypeLocked("beauty")).toBe(true);
    const beauty = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "beauty");
    // Owner decision, 2026-09: beauty exceptionally ships a 3rd, then a 4th, deliberately distinct
    // look instead of swapping out an already-shipped one. See AESTHETICS-PHASE-SLICES.md (A5, A6).
    expect(beauty?.pair.map((p) => p.slug).sort()).toEqual(
      ["clarte-compatible-skin", "hair-salon", "layers-beauty", "nuance-beauty"].sort(),
    );
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

  it("locks fashion to fashion-atelier + clothing-company, plus an explicit 3rd override (nuee-intimates)", () => {
    expect(isAestheticTypeLocked("fashion")).toBe(true);
    const fashion = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "fashion");
    // Owner decision, 2026-09: fashion exceptionally ships a 3rd, deliberately distinct look.
    // See AESTHETICS-PHASE-SLICES.md (A7).
    expect(fashion?.pair.map((p) => p.slug).sort()).toEqual(
      ["clothing-company", "fashion-atelier", "nuee-intimates"].sort(),
    );
  });

  it("locks production to production-company + film-studio, plus an explicit 3rd override (meridian-films)", () => {
    expect(isAestheticTypeLocked("production")).toBe(true);
    const production = USER_AESTHETICS_BY_TYPE.find((t) => t.type === "production");
    // Owner decision, 2026-09: production exceptionally ships a 3rd, deliberately distinct look.
    // See AESTHETICS-PHASE-SLICES.md (A8).
    expect(production?.pair.map((p) => p.slug).sort()).toEqual(
      ["film-studio", "meridian-films", "production-company"].sort(),
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
