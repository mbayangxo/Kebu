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
  it("offers exactly 2 aesthetics per business type", () => {
    for (const group of USER_AESTHETICS_BY_TYPE) {
      expect(group.pair).toHaveLength(2);
      expect(group.pair[0]?.slug).not.toBe(group.pair[1]?.slug);
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
    expect(salon?.cardVisual?.layout).toBe("salon");
    expect(store?.cardVisual?.layout).toBe("store");
    expect(salon?.cardVisual?.previewGradient).not.toBe(store?.cardVisual?.previewGradient);
  });
});
