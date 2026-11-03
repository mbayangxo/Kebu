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
    // Gallery items are empty placeholder slots — founder uploads photos via the builder.
    expect(photos.every((p) => typeof p.src === "string")).toBe(true);

    const products = defaultMaylecorShopProducts();
    expect(products.length).toBeGreaterThanOrEqual(2);
    expect(products[0]?.name).toMatch(/album/i);

    // Every product must show its own image — the T-shirt and the poster used to both resolve
    // to MAYLECOR_WIX.collageTop/bottomLeft, two names aliasing the exact same underlying asset,
    // so two unrelated products rendered the identical photo side by side on the live Shop page.
    const imageUrls = products.map((p) => p.imageUrl);
    expect(new Set(imageUrls).size).toBe(imageUrls.length);
  });

  it("uses May portrait cutouts with Russian motion layout (editable in builder)", () => {
    const props = defaultMaylecorKsendrProps("MAY LECOR");
    const russian = defaultLegallyBlondeHeroProps();
    expect(props.backgroundLayer).toBe(russian.backgroundLayer);
    // cutoutLeft points at may-figure.png, not may-cutout-full.jpg: the latter is a plain JPEG
    // (no alpha channel at all) with a checkerboard "no background" placeholder baked into its
    // opaque pixels, so it rendered fully broken (visible checker + a stray black artifact) on
    // the live Home hero. may-figure.png is the same photo, correctly re-cut with real alpha.
    expect(props.cutoutLeft).toContain("/templates/maylecor/may-figure.png");
    expect(props.cutoutRight).toContain("/templates/maylecor/portrait.jpg");
    expect(props.cutoutAccent).toContain("/templates/maylecor/");
    expect(props.heroPhoto).toContain("/templates/maylecor/portrait.jpg");
    expect(props.titleLogo).toContain("/templates/maylecor/");
    expect(props.titleAsText).toBe(false);
    expect(props.displayFont).toBe("Steelfish");
    expect(props.scrollMode).toBe("parallax");
    expect(props.navLinks?.length).toBeGreaterThan(0);
    expect(maylecorHeroNeedsRussianRestore(props)).toBe(false);
    expect(maylecorHeroUsesPlaceholderAssets({ cutoutLeft: "https://static.wixstatic.com/x.png" })).toBe(
      true,
    );
    expect(
      maylecorHeroNeedsRussianRestore({ cutoutLeft: "/templates/legally-blonde/cutout-left.png" }),
    ).toBe(true);
  });

  it("seeds music, maygazine (photos live here), and shop pages with editable sections", () => {
    const pages = maylecorMotionSitePages("MAY LECOR");
    const music = pages.find((p) => p.slug === "music");
    // Maygazine absorbs the photo gallery — there is no separate bare "photos" page/nav entry.
    const maygazine = pages.find((p) => p.slug === "maygazine");
    const shop = pages.find((p) => p.slug === "shop");

    expect(pages.some((p) => p.slug === "photos")).toBe(false);
    expect(music?.sections.some((s) => s.type === "maylecor-music")).toBe(true);
    expect(music?.sections.some((s) => s.type === "audio")).toBe(true);
    expect(maygazine?.sections.some((s) => s.type === "gallery")).toBe(true);
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
