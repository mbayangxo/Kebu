import { describe, expect, it } from "vitest";
import {
  builderLayerStorageKey,
  patchBuilderLayerPresentation,
  readBuilderLayerPresentation,
} from "@/lib/create/builder-layer-model";

describe("builder layer model", () => {
  it("normalizes extra cutout ids", () => {
    expect(builderLayerStorageKey("extra:city-1")).toBe("city-1");
    expect(builderLayerStorageKey("titleLogo")).toBe("titleLogo");
  });

  it("reads defaults and clamps presentation patches", () => {
    const props: Record<string, unknown> = {};
    expect(readBuilderLayerPresentation(props, "titleLogo")).toEqual({
      scale: 1,
      zIndex: 10,
      opacity: 1,
      rotation: 0,
      locked: false,
      hidden: false,
    });

    const next = {
      ...props,
      ...patchBuilderLayerPresentation(props, "titleLogo", {
        scale: 9,
        zIndex: 999,
        opacity: -2,
        rotation: 400,
        locked: true,
        hidden: true,
      }),
    };

    expect(readBuilderLayerPresentation(next, "titleLogo")).toEqual({
      scale: 3,
      zIndex: 80,
      opacity: 0,
      rotation: 180,
      locked: true,
      hidden: true,
    });
  });

  it("unlocks and unhides without disturbing other layer state", () => {
    const props = {
      lockedLayers: ["titleLogo", "cutoutLeft"],
      hiddenLayers: ["titleLogo", "cutoutRight"],
    };
    const patch = patchBuilderLayerPresentation(props, "titleLogo", {
      locked: false,
      hidden: false,
    });

    expect(patch.lockedLayers).toEqual(["cutoutLeft"]);
    expect(patch.hiddenLayers).toEqual(["cutoutRight"]);
  });
});
