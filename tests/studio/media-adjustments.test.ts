import { describe, expect, it } from "vitest";
import { canvasLayerSchema } from "@/lib/studio/canvas-document";
import { mediaFilterCss, normalizeMediaAdjustments } from "@/lib/studio/media-adjustments";

describe("Studio media adjustments", () => {
  it("keeps neutral media unfiltered", () => {
    expect(mediaFilterCss({})).toBeUndefined();
    expect(mediaFilterCss({ brightness: 1, contrast: 1, saturation: 1, grayscale: 0, blur: 0 })).toBeUndefined();
  });

  it("builds one adjustment contract for image/video preview and export", () => {
    expect(mediaFilterCss({ brightness: 1.15, contrast: 0.9, saturation: 1.4, grayscale: 0.25, blur: 2 }))
      .toBe("brightness(1.15) contrast(0.9) saturate(1.4) grayscale(0.25) blur(2px)");
  });

  it("clamps media adjustment values", () => {
    expect(normalizeMediaAdjustments({ brightness: 9, contrast: -1, saturation: 8, grayscale: 3, blur: 90 }))
      .toEqual({ brightness: 2, contrast: 0, saturation: 3, grayscale: 1, blur: 40 });
  });

  it("persists adjustments through the validated canvas layer schema", () => {
    const layer = canvasLayerSchema.parse({
      id: "ly_test",
      type: "image",
      name: "Photo",
      x: 0,
      y: 0,
      width: 300,
      height: 300,
      rotation: 0,
      opacity: 1,
      locked: false,
      imageUrl: "https://example.com/photo.jpg",
      brightness: 1.2,
      contrast: 0.85,
      saturation: 1.5,
      grayscale: 0.1,
      blur: 3,
    });
    expect(layer.brightness).toBe(1.2);
    expect(layer.blur).toBe(3);
  });
});
