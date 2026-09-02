import { describe, expect, it } from "vitest";
import {
  defaultMaylecorPhotoGalleryItems,
  defaultMaylecorShopProducts,
} from "@/lib/create/maylecor-content-defaults";
import {
  defaultMaylecorKsendrProps,
  maylecorHeroUsesPlaceholderAssets,
} from "@/lib/create/maylecor-ksendr-defaults";
import { maylecorMotionSitePages } from "@/lib/create/maylecor-site-pages";

describe("maylecor content defaults", () => {
  it("ships real May photos in gallery and shop seeds", () => {
    const photos = defaultMaylecorPhotoGalleryItems();
    expect(photos.length).toBeGreaterThanOrEqual(4);
    expect(photos.every((p) => p.src.startsWith("https://"))).toBe(true);

    const products = defaultMaylecorShopProducts();
    expect(products.length).toBeGreaterThanOrEqual(2);
    expect(products[0]?.name).toMatch(/album/i);
  });

  it("uses May assets in ksendr hero defaults (not Tilda Russian placeholders)", () => {
    const props = defaultMaylecorKsendrProps("MAY LECOR");
    expect(props.backgroundLayer).toContain("wixstatic.com");
    expect(maylecorHeroUsesPlaceholderAssets(props)).toBe(false);
    expect(maylecorHeroUsesPlaceholderAssets({ cutoutLeft: "https://static.tildacdn.com/x.png" })).toBe(
      true,
    );
  });

  it("seeds music, photos, and shop pages with editable sections", () => {
    const pages = maylecorMotionSitePages("MAY LECOR");
    const music = pages.find((p) => p.slug === "music");
    const photos = pages.find((p) => p.slug === "photos");
    const shop = pages.find((p) => p.slug === "shop");

    expect(music?.sections.some((s) => s.type === "maylecor-music")).toBe(true);
    expect(music?.sections.some((s) => s.type === "audio")).toBe(true);
    expect(photos?.sections.some((s) => s.type === "gallery")).toBe(true);
    expect(shop?.sections.some((s) => s.type === "products")).toBe(true);
  });
});
