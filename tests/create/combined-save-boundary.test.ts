import { describe, expect, it } from "vitest";
import { sectionPropsForSave } from "@/lib/create/section-props-boundary";
import { defaultSectionProps } from "@/lib/create/section-defaults";

describe("Combined legacy and native Builder save boundary", () => {
  it("preserves newer section layout and animation fields through the recovered save boundary", () => {
    const saved = sectionPropsForSave("hero", {
      ...defaultSectionProps("hero"), minHeightPx: 800, maxWidthPx: 1100,
      marginTopPx: 20, overflow: "hidden",
      builderMotion: { preset: "slide-left", durationMs: 700, delayMs: 100, trigger: "scroll" },
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) throw Error(saved.error);
    expect(saved.props).toMatchObject({ minHeightPx: 800, maxWidthPx: 1100, marginTopPx: 20, overflow: "hidden", builderMotion: { preset: "slide-left", durationMs: 700, delayMs: 100 } });
  });
  it("refuses invalid presentation fields instead of silently stripping a failed edit", () => {
    expect(sectionPropsForSave("hero", { ...defaultSectionProps("hero"), minHeightPx: -100 }).ok).toBe(false);
  });
});
