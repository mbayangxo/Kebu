import { describe, expect, it } from "vitest";
import {
  normalizeKdirectionHomeProps,
  normalizeKdirectionPageProps,
} from "@/lib/create/kdirection-defaults";
import {
  isBlockedRemoteMedia,
  localizeKdirectionAssetUrl,
  projectUsesKdirectionLayout,
  KDIRECTION_PORTRAIT,
} from "@/lib/create/kdirection-local-assets";

describe("kdirection local assets / upgrade", () => {
  it("detects K-Direction layout from sections or portfolio tag", () => {
    expect(projectUsesKdirectionLayout("portfolio:kdirection", [])).toBe(true);
    expect(projectUsesKdirectionLayout(null, ["kdirection-home"])).toBe(true);
    expect(projectUsesKdirectionLayout(null, ["kdirection-page"])).toBe(true);
    expect(projectUsesKdirectionLayout(null, ["hero"])).toBe(false);
  });

  it("remaps blocked Wix CDN URLs to local portrait", () => {
    expect(isBlockedRemoteMedia("https://static.wixstatic.com/media/abc.jpg")).toBe(true);
    expect(localizeKdirectionAssetUrl("https://static.wixstatic.com/media/abc.jpg")).toBe(
      KDIRECTION_PORTRAIT,
    );
  });

  it("restores collage + social when props still use Wix 403 URLs", () => {
    const merged = normalizeKdirectionHomeProps({
      brandLine1: "K",
      brandLine2: "DIRECTION",
      mission: "Keep this mission",
      collagePhotos: [
        {
          src: "https://static.wixstatic.com/media/0380b3_dead.jpg",
          rotate: -18,
          topPct: 12,
          leftPct: 8,
          widthPct: 18,
        },
      ],
      socialLinks: [
        {
          label: "Instagram",
          iconUrl: "https://static.wixstatic.com/media/81af.png",
          href: "https://instagram.com/",
        },
      ],
    });
    expect(merged.mission).toBe("Keep this mission");
    expect(String(merged.backgroundCss)).toContain("radial-gradient");
    const collage = merged.collagePhotos as { src: string }[];
    expect(collage.every((p) => p.src === KDIRECTION_PORTRAIT)).toBe(true);
    const social = merged.socialLinks as { iconUrl: string }[];
    expect(social[0]!.iconUrl).toBe("/templates/kdirection/icons/instagram.svg");
  });

  it("fills missing gradient on inner pages instead of solid black", () => {
    const page = normalizeKdirectionPageProps({
      title: "About us",
      body: "Hello",
      heroImage: "https://static.wixstatic.com/media/x.jpg",
    });
    expect(String(page.backgroundCss)).toContain("radial-gradient");
    expect(page.heroImage).toBe(KDIRECTION_PORTRAIT);
  });
});
