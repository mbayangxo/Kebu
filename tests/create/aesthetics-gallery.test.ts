import { describe, expect, it } from "vitest";
import {
  getAestheticGalleryGroups,
  getAestheticGalleryItem,
  listAestheticGallerySlugs,
} from "@/lib/create/aesthetics-gallery";

describe("aesthetics gallery", () => {
  it("builds category items with distinct layout chrome", () => {
    const groups = getAestheticGalleryGroups();
    expect(groups.length).toBeGreaterThan(5);
    const beauty = groups.find((g) => g.type === "beauty");
    expect(beauty?.items.some((i) => i.slug === "layers-beauty")).toBe(true);
    expect(beauty?.items.some((i) => i.slug === "clarte-compatible-skin")).toBe(true);
    expect(beauty?.items.some((i) => i.slug === "nuance-beauty")).toBe(true);
    const beautyLayouts = new Set(beauty!.items.map((i) => i.cardVisual.layout));
    expect(beautyLayouts.size).toBe(beauty!.items.length);

    const fashion = groups.find((g) => g.type === "fashion");
    expect(fashion?.items.some((i) => i.slug === "nuee-intimates")).toBe(true);

    const production = groups.find((g) => g.type === "production");
    expect(production?.items.some((i) => i.slug === "meridian-films")).toBe(true);

    for (const group of [beauty, fashion, production]) {
      for (const item of group!.items) {
        expect(item.detailPath).toBe(`/create/aesthetics/${item.slug}`);
        expect(item.demoPath).toContain("/create/demo/");
        expect(item.previewGradient.length).toBeGreaterThan(10);
        expect(item.cardVisual.layout).toBeTruthy();
      }
    }
  });

  it("resolves LAYERS Beauty detail", () => {
    const item = getAestheticGalleryItem("layers-beauty");
    expect(item?.name).toMatch(/LAYERS/i);
    expect(item?.previewImage).toBeTruthy();
  });

  it("lists unique slugs", () => {
    const slugs = listAestheticGallerySlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain("hair-salon");
  });
});
