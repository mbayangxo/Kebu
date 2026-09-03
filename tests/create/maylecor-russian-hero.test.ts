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

  it("forces local Russian cutouts when remote or empty", () => {
    const normalized = normalizeMaylecorRussianHeroProps(
      {
        cutoutLeft: "https://static.tildacdn.com/old.png",
        cutoutRight: "",
        backgroundLayer: "https://images.wixstatic.com/photo.jpg",
      },
      "MAY LECOR",
    );
    expect(normalized.cutoutLeft).toBe("/templates/legally-blonde/cutout-left.png");
    expect(normalized.cutoutRight).toBe("/templates/legally-blonde/cutout-right.png");
    expect(normalized.backgroundLayer).toBe("/templates/legally-blonde/background.png");
    expect(normalized.title).toBe("MAY LECOR");
    expect(normalized.scrollMode).toBe("parallax");
  });

  it("preserves user-uploaded site assets", () => {
    const uploaded =
      "https://example.supabase.co/storage/v1/object/public/site-assets/user-cutout.png";
    expect(isUserUploadedSiteAsset(uploaded)).toBe(true);
    const normalized = normalizeMaylecorRussianHeroProps({ cutoutLeft: uploaded }, "MAY LECOR");
    expect(normalized.cutoutLeft).toBe(uploaded);
  });
});
