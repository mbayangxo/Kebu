import { describe, expect, it } from "vitest";
import { defaultKdirectionHomeProps } from "@/lib/create/kdirection-defaults";

/** Pure upgrade-merge logic mirrored from upgrade-portfolio-kdirection (unit, no DB). */
function mergeKdirectionHomeProps(existing: Record<string, unknown>) {
  const next = defaultKdirectionHomeProps();
  const missingCollage =
    !Array.isArray(existing.collagePhotos) || (existing.collagePhotos as unknown[]).length === 0;
  const missingWixBg = !String(existing.backgroundCss ?? "").includes("radial-gradient");
  return {
    ...next,
    ...existing,
    backgroundCss: missingWixBg ? next.backgroundCss : existing.backgroundCss,
    collagePhotos: missingCollage ? next.collagePhotos : existing.collagePhotos,
    displayFont: existing.displayFont ?? next.displayFont,
    navButtonBg: existing.navButtonBg ?? next.navButtonBg,
    logoColor: existing.logoColor ?? next.logoColor,
    logoMirrorColor: existing.logoMirrorColor ?? next.logoMirrorColor,
    logoImage: existing.logoImage ?? "",
    showHomeIcon: existing.showHomeIcon ?? true,
    showArrows: existing.showArrows ?? true,
    showOverlay: existing.showOverlay ?? false,
  };
}

describe("kdirection portfolio upgrade merge", () => {
  it("upgrades generic agency-like props to Wix canvas fields", () => {
    const merged = mergeKdirectionHomeProps({
      brandLine1: "K",
      brandLine2: "DIRECTION",
      mission: "Keep this mission",
    });
    expect(merged.mission).toBe("Keep this mission");
    expect(String(merged.backgroundCss)).toContain("radial-gradient");
    expect(Array.isArray(merged.collagePhotos) && merged.collagePhotos.length > 0).toBe(true);
    expect(merged.displayFont).toBe("Oswald");
    expect(merged.showHomeIcon).toBe(true);
  });

  it("keeps user collage positions when already present", () => {
    const collage = [
      {
        src: "https://example.com/a.jpg",
        rotate: -20,
        topPct: 11,
        leftPct: 22,
        widthPct: 19,
        zIndex: 4,
      },
    ];
    const merged = mergeKdirectionHomeProps({
      backgroundCss: defaultKdirectionHomeProps().backgroundCss,
      collagePhotos: collage,
      displayFont: "Oswald",
    });
    expect(merged.collagePhotos).toEqual(collage);
  });
});
