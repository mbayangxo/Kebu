import { describe, expect, it } from "vitest";
import { getFlagshipGalleryTemplates, getGalleryTemplates } from "@/lib/create/template-gallery";
import { isPublicTemplateSlug, publicTemplateSeeds } from "@/lib/create/templates-seed";
import { FLAGSHIP_TEMPLATE_SLUGS } from "@/lib/create/template-visuals";

describe("flagship template gallery", () => {
  it("exposes Russian, May Lecor, and K-Direction as public templates", () => {
    for (const slug of FLAGSHIP_TEMPLATE_SLUGS) {
      expect(isPublicTemplateSlug(slug)).toBe(true);
    }
  });

  it("returns three visually distinct flagship cards", () => {
    const flagship = getFlagshipGalleryTemplates();
    expect(flagship).toHaveLength(3);
    expect(flagship.map((t) => t.slug)).toEqual([...FLAGSHIP_TEMPLATE_SLUGS]);
    expect(flagship.every((t) => t.cardVisual?.badge)).toBe(true);
    expect(flagship[0]?.name.toLowerCase()).toContain("russian");
    expect(flagship[1]?.name.toLowerCase()).toContain("may lecor");
    expect(flagship[2]?.name.toLowerCase()).toContain("k-direction");
  });

  it("finds Russian template by search keyword", () => {
    const russian = getGalleryTemplates().filter((t) =>
      t.cardVisual?.keywords.some((k) => k.includes("russian")),
    );
    expect(russian.some((t) => t.slug === "showcase-legally-blonde")).toBe(true);
    expect(russian.some((t) => t.slug === "musician-maylecor-ksendr")).toBe(true);
  });

  it("does not hide flagship templates as owner-only portfolio seeds", () => {
    const publicSlugs = new Set(publicTemplateSeeds().map((t) => t.slug));
    for (const slug of FLAGSHIP_TEMPLATE_SLUGS) {
      expect(publicSlugs.has(slug)).toBe(true);
    }
  });
});
