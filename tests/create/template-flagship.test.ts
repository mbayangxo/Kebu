import { describe, expect, it } from "vitest";
import { getFlagshipGalleryTemplates, getGalleryTemplates } from "@/lib/create/template-gallery";
import { isPublicTemplateSlug, publicTemplateSeeds } from "@/lib/create/templates-seed";
import { FLAGSHIP_TEMPLATE_SLUGS } from "@/lib/create/template-visuals";

describe("flagship template gallery", () => {
  it("exposes May Lecor + K-Direction as the two public flagship templates", () => {
    expect([...FLAGSHIP_TEMPLATE_SLUGS]).toEqual(["musician-maylecor-ksendr", "agency-kdirection"]);
    for (const slug of FLAGSHIP_TEMPLATE_SLUGS) {
      expect(isPublicTemplateSlug(slug)).toBe(true);
    }
  });

  it("does not advertise a separate public Russian demo (May Lecor IS the Russian layout)", () => {
    expect(isPublicTemplateSlug("showcase-legally-blonde")).toBe(false);
    const flagship = getFlagshipGalleryTemplates();
    expect(flagship).toHaveLength(2);
    expect(flagship[0]?.slug).toBe("musician-maylecor-ksendr");
    expect(flagship[0]?.name).toBe("May Lecor");
    expect(flagship[0]?.cardVisual?.badge.toLowerCase()).toContain("russian");
    expect(flagship[1]?.slug).toBe("agency-kdirection");
  });

  it("finds May Lecor when searching russian", () => {
    const russian = getGalleryTemplates().filter((t) =>
      t.cardVisual?.keywords.some((k) => k.includes("russian")),
    );
    expect(russian.some((t) => t.slug === "musician-maylecor-ksendr")).toBe(true);
    expect(russian.some((t) => t.slug === "showcase-legally-blonde")).toBe(false);
  });

  it("keeps flagship templates in the public seed list", () => {
    const publicSlugs = new Set(publicTemplateSeeds().map((t) => t.slug));
    for (const slug of FLAGSHIP_TEMPLATE_SLUGS) {
      expect(publicSlugs.has(slug)).toBe(true);
    }
  });

  it("gives every public template a card visual so gallery cards are not identical", () => {
    const gallery = getGalleryTemplates();
    expect(gallery.every((t) => Boolean(t.cardVisual?.previewGradient))).toBe(true);
    const may = gallery.find((t) => t.slug === "musician-maylecor-ksendr");
    const kd = gallery.find((t) => t.slug === "agency-kdirection");
    const salon = gallery.find((t) => t.slug === "hair-salon");
    const store = gallery.find((t) => t.slug === "shopping-store");
    expect(may?.cardVisual?.layout).toBe("russian-cutouts");
    expect(kd?.cardVisual?.layout).toBe("wix-collage");
    expect(salon?.cardVisual?.layout).toBe("salon");
    expect(store?.cardVisual?.layout).toBe("store");
    expect(may?.cardVisual?.previewGradient).not.toBe(kd?.cardVisual?.previewGradient);
    expect(salon?.cardVisual?.previewGradient).not.toBe(store?.cardVisual?.previewGradient);
  });
});
