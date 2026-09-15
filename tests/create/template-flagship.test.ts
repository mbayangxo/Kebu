import { describe, expect, it } from "vitest";
import { getFlagshipGalleryTemplates, getGalleryTemplates } from "@/lib/create/template-gallery";
import { isPublicTemplateSlug, publicTemplateSeeds } from "@/lib/create/templates-seed";
import { FLAGSHIP_TEMPLATE_SLUGS } from "@/lib/create/template-visuals";
import {
  OWNER_PORTFOLIO_AESTHETIC_SLUGS,
  USER_AESTHETICS_BY_TYPE,
  userAestheticSlugs,
} from "@/lib/create/user-aesthetics-catalog";

describe("user aesthetics gallery", () => {
  it("offers 2 aesthetics per business type, except the documented overrides (owner decisions)", () => {
    // Owner decisions, 2026-09 — see AESTHETICS-PHASE-SLICES.md (A5–A8):
    // beauty ships 2 documented overrides (CLARTÉ, then NUANCE) → 4 total;
    // fashion and production each ship one documented override → 3 total.
    const EXPECTED_PAIR_LENGTH: Record<string, number> = {
      beauty: 4,
      fashion: 3,
      production: 3,
    };
    for (const group of USER_AESTHETICS_BY_TYPE) {
      const expectedLength = EXPECTED_PAIR_LENGTH[group.type] ?? 2;
      expect(group.pair).toHaveLength(expectedLength);
      const slugs = group.pair.map((p) => p.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("keeps every user aesthetic in the public seed list", () => {
    const publicSlugs = new Set(publicTemplateSeeds().map((t) => t.slug));
    for (const slug of userAestheticSlugs()) {
      expect(publicSlugs.has(slug), slug).toBe(true);
      expect(isPublicTemplateSlug(slug)).toBe(true);
    }
  });

  it("hides owner portfolio brands from the public catalog", () => {
    for (const slug of OWNER_PORTFOLIO_AESTHETIC_SLUGS) {
      expect(isPublicTemplateSlug(slug)).toBe(false);
    }
  });

  it("recommends shop + agency starters — not May Lecor / K-Direction", () => {
    expect([...FLAGSHIP_TEMPLATE_SLUGS]).toEqual(["shopping-store", "carmine-creative"]);
    const flagship = getFlagshipGalleryTemplates();
    expect(flagship).toHaveLength(2);
    expect(flagship.map((t) => t.slug)).toEqual(["shopping-store", "carmine-creative"]);
  });

  it("gives featured user aesthetics distinct card chrome", () => {
    const gallery = getGalleryTemplates().filter((t) => t.featured);
    expect(gallery.length).toBe(userAestheticSlugs().length);
    expect(gallery.every((t) => Boolean(t.cardVisual?.previewGradient))).toBe(true);
    const salon = gallery.find((t) => t.slug === "hair-salon");
    const store = gallery.find((t) => t.slug === "shopping-store");
    expect(salon?.cardVisual?.layout).toBe("bold-salon");
    expect(store?.cardVisual?.layout).toBe("store");
    expect(salon?.cardVisual?.previewGradient).not.toBe(store?.cardVisual?.previewGradient);
  });
});
