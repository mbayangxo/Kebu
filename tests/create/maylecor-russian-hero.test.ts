import { describe, expect, it } from "vitest";
import {
  isUserUploadedSiteAsset,
  normalizeMaylecorRussianHeroProps,
  projectUsesMaylecorRussianLayout,
  remapHeroAssetUrls,
} from "@/lib/create/maylecor-russian-hero";

describe("maylecor-russian-hero", () => {
  it("detects May Lecor layout from hero sections or portfolio tag", () => {
    expect(projectUsesMaylecorRussianLayout("portfolio:maylecor", [])).toBe(true);
    expect(projectUsesMaylecorRussianLayout(null, ["legally-blonde-hero"])).toBe(true);
    expect(projectUsesMaylecorRussianLayout(null, ["maylecor-home"])).toBe(true);
    expect(projectUsesMaylecorRussianLayout(null, ["hero"])).toBe(false);
  });

  it("remaps Tilda CDN URLs to local Kebu assets", () => {
    const remapped = remapHeroAssetUrls({
      cutoutLeft: "https://static.tildacdn.com/tild6538-3665-4232-b661-376339363635/Group_556.png",
    });
    expect(remapped.cutoutLeft).toBe("/templates/legally-blonde/cutout-left.png");
  });

  it("forces May Lecor cutouts instead of Elle stock when remote or empty", () => {
    const normalized = normalizeMaylecorRussianHeroProps(
      {
        cutoutLeft: "https://static.tildacdn.com/old.png",
        cutoutRight: "",
        backgroundLayer: "https://images.wixstatic.com/photo.jpg",
      },
      "MAY LECOR",
    );
    expect(normalized.cutoutLeft).toBe("/templates/maylecor/may-figure.png");
    expect(normalized.cutoutRight).toBe("/templates/maylecor/portrait.jpg");
    expect(normalized.backgroundLayer).toBe("/templates/legally-blonde/background.png");
    expect(normalized.titleLogo).toBe("/templates/maylecor/logo-circle-seal.png");
    expect(normalized.titleAsText).toBe(false);
    expect(normalized.title).toBe("MAY LECOR");
    expect(normalized.scrollMode).toBe("parallax");
    expect(Array.isArray(normalized.navLinks) && normalized.navLinks.length).toBeGreaterThan(0);
    const extras = normalized.extraCutouts as { id: string }[];
    expect(extras.some((e) => e.id === "may-city-skyline")).toBe(true);
    expect(extras.some((e) => e.id === "may-logo-banner")).toBe(false);
  });

  it("replaces Elle stock paths with May cutout on upgrade normalize", () => {
    const normalized = normalizeMaylecorRussianHeroProps(
      {
        cutoutAccent: "/templates/legally-blonde/cutout-accent.png",
        heroPhoto: "/templates/legally-blonde/hero-photo.png",
      },
      "MAY LECOR",
    );
    expect(normalized.cutoutAccent).toBe("/templates/maylecor/may-figure.png");
    expect(normalized.heroPhoto).toBe("/templates/maylecor/portrait.jpg");
  });

  it("treats stock /templates/maylecor paths as refreshable (not user uploads)", () => {
    expect(isUserUploadedSiteAsset("/templates/maylecor/may-cutout-full.jpg")).toBe(false);
  });
});
