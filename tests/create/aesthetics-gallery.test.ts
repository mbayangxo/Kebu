import { describe, expect, it } from "vitest";
import {
  getAestheticGalleryGroups,
  getAestheticGalleryItem,
  listAestheticGallerySlugs,
} from "@/lib/create/aesthetics-gallery";

describe("aesthetics gallery", () => {
  it("builds category pairs with distinct layout chrome", () => {
    const groups = getAestheticGalleryGroups();
    expect(groups.length).toBeGreaterThan(5);
    const beauty = groups.find((g) => g.type === "beauty");
    expect(beauty?.items).toHaveLength(2);
    expect(beauty?.items.some((i) => i.slug === "layers-beauty")).toBe(true);
    const layouts = new Set(beauty!.items.map((i) => i.cardVisual.layout));
    expect(layouts.size).toBe(2);
    for (const item of beauty!.items) {
      expect(item.detailPath).toBe(`/create/aesthetics/${item.slug}`);
      expect(item.demoPath).toContain("/create/demo/");
      expect(item.previewGradient.length).toBeGreaterThan(10);
      expect(item.cardVisual.layout).toBeTruthy();
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
