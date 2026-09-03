import { describe, expect, it } from "vitest";
import { normalizeKdirectionHomeProps } from "@/lib/create/kdirection-defaults";
import { KDIRECTION_PORTRAIT } from "@/lib/create/kdirection-local-assets";

describe("kdirection portfolio upgrade merge", () => {
  it("upgrades generic agency-like props to Wix canvas fields", () => {
    const merged = normalizeKdirectionHomeProps({
      brandLine1: "K",
      brandLine2: "DIRECTION",
      mission: "Keep this mission",
    });
    expect(merged.mission).toBe("Keep this mission");
    expect(String(merged.backgroundCss)).toContain("radial-gradient");
    expect(Array.isArray(merged.collagePhotos) && (merged.collagePhotos as unknown[]).length > 0).toBe(
      true,
    );
    expect(merged.displayFont).toBe("Oswald");
    expect(merged.showHomeIcon).toBe(true);
  });

  it("keeps user collage positions when already present and local", () => {
    const collage = [
      {
        src: KDIRECTION_PORTRAIT,
        rotate: -20,
        topPct: 11,
        leftPct: 22,
        widthPct: 19,
        zIndex: 4,
      },
    ];
    const merged = normalizeKdirectionHomeProps({
      backgroundCss: "radial-gradient(circle, #000 0%, transparent 100%)",
      collagePhotos: collage,
      displayFont: "Oswald",
    });
    const photos = merged.collagePhotos as { src: string; topPct: number; leftPct: number }[];
    expect(photos[0]!.src).toBe(KDIRECTION_PORTRAIT);
    expect(photos[0]!.topPct).toBe(11);
    expect(photos[0]!.leftPct).toBe(22);
  });
});
