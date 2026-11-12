import { describe, expect, it } from "vitest";
import {
  clearDeviceOverrideKeys,
  hasDeviceOverrideKeys,
  mergeDeviceAwareSectionProps,
  patchDeviceProp,
} from "@/lib/create/device-overrides";

describe("builder responsive overrides", () => {
  it("keeps desktop base untouched when editing mobile", () => {
    const base = {
      titleTextFontSize: 18,
      layerScales: { titleLogo: 1 },
    };
    const next = patchDeviceProp(base, "mobile", {
      titleTextFontSize: 24,
      layerScales: { titleLogo: 1.4 },
    });

    expect(next.titleTextFontSize).toBe(18);
    expect(mergeDeviceAwareSectionProps(next, "mobile")).toMatchObject({
      titleTextFontSize: 24,
      layerScales: { titleLogo: 1.4 },
    });
  });

  it("detects and clears only the selected mobile override keys", () => {
    const props = {
      titleTextFontSize: 18,
      sectionMinHeightPx: 720,
      deviceOverrides: {
        mobile: {
          titleTextFontSize: 26,
          sectionMinHeightPx: 900,
        },
      },
    };

    expect(hasDeviceOverrideKeys(props, "mobile", ["titleTextFontSize"])).toBe(true);

    const patch = clearDeviceOverrideKeys(props, "mobile", ["titleTextFontSize"]);
    const next = { ...props, ...patch };

    expect(hasDeviceOverrideKeys(next, "mobile", ["titleTextFontSize"])).toBe(false);
    expect(hasDeviceOverrideKeys(next, "mobile", ["sectionMinHeightPx"])).toBe(true);
    expect(mergeDeviceAwareSectionProps(next, "mobile").titleTextFontSize).toBe(18);
    expect(mergeDeviceAwareSectionProps(next, "mobile").sectionMinHeightPx).toBe(900);
  });
});
