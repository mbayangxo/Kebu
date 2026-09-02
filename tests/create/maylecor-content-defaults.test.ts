import { describe, expect, it } from "vitest";
import {
  defaultMaylecorPhotoGalleryItems,
  defaultMaylecorShopProducts,
} from "@/lib/create/maylecor-content-defaults";
import {
  defaultMaylecorKsendrProps,
  maylecorHeroNeedsRussianRestore,
  maylecorHeroUsesPlaceholderAssets,
} from "@/lib/create/maylecor-ksendr-defaults";
import { maylecorMotionSitePages } from "@/lib/create/maylecor-site-pages";
import { defaultLegallyBlondeHeroProps } from "@/lib/create/legally-blonde-defaults";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { defaultKdirectionHomeProps } from "@/lib/create/kdirection-defaults";
import { kdirectionWixSitePages } from "@/lib/create/kdirection-site-pages";

describe("maylecor content defaults", () => {
  it("ships real May photos in gallery and shop seeds", () => {
    const photos = defaultMaylecorPhotoGalleryItems();
    expect(photos.length).toBeGreaterThanOrEqual(4);
    expect(photos.every((p) => p.src.startsWith("https://"))).toBe(true);

    const products = defaultMaylecorShopProducts();
    expect(products.length).toBeGreaterThanOrEqual(2);
    expect(products[0]?.name).toMatch(/album/i);
  });

  it("uses exact Russian Tilda cutouts/bg/font (editable in builder)", () => {
    const props = defaultMaylecorKsendrProps("MAY LECOR");
    const russian = defaultLegallyBlondeHeroProps();
    expect(props.backgroundLayer).toBe(russian.backgroundLayer);
    expect(props.cutoutLeft).toBe(russian.cutoutLeft);
    expect(props.cutoutRight).toBe(russian.cutoutRight);
    expect(props.cutoutAccent).toBe(russian.cutoutAccent);
    expect(props.titleLogo).toBe(russian.titleLogo);
    expect(props.cutoutLeft).toContain("/templates/legally-blonde/");
    expect(props.displayFont).toBe("Steelfish");
    expect(props.scrollMode).toBe("parallax");
    expect(maylecorHeroNeedsRussianRestore(props)).toBe(false);
    expect(maylecorHeroUsesPlaceholderAssets({ cutoutLeft: "https://static.wixstatic.com/x.png" })).toBe(
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

describe("kdirection Wix template", () => {
  it("defaults match Wix home: Oswald, yellow nav, collage, radial gradient", () => {
    const props = defaultKdirectionHomeProps();
    expect(props.displayFont).toBe("Oswald");
    expect(props.navButtonBg).toBe("#FFF86B");
    expect(props.backgroundCss).toContain("radial-gradient");
    expect(props.collagePhotos.length).toBeGreaterThanOrEqual(4);
    expect(props.showMirrorLogo).toBe(true);
  });

  it("multipage site definition validates", () => {
    const pages = kdirectionWixSitePages();
    const result = validateWebsiteDefinition({
      schemaVersion: "website-v1",
      title: "K-Direction",
      theme: {
        primary: "#0A0A0A",
        accent: "#FFF86B",
        background: "#e8e0f0",
        text: "#0A0A0A",
        fontDisplay: "Oswald",
        fontBody: "Arial",
        spacing: "comfortable",
      },
      pages: pages.map((p) => ({
        slug: p.slug,
        title: p.title,
        sections: p.sections.map((s, i) => ({
          id: `${p.slug}-${i}`,
          type: s.type,
          props: s.props,
        })),
      })),
    });
    expect(result.ok).toBe(true);
  });
});
