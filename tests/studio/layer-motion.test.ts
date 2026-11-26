import { describe, expect, it } from "vitest";
import { canvasLayerSchema } from "@/lib/studio/canvas-document";
import { layerMotionAtTime } from "@/lib/studio/layer-motion";
import { designDocumentToComposition } from "@/lib/studio/design-to-composition";
import { defaultCanvasDocument } from "@/lib/studio/canvas-document";

describe("Studio layer motion", () => {
  it("keeps motion deterministic and bounded", () => {
    const layer = canvasLayerSchema.parse({
      id: "ly_motion",
      type: "rect",
      name: "Motion",
      x: 10,
      y: 20,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 0.8,
      fill: "#FF6A00",
      animationPreset: "fade_up",
      animationDelayMs: 200,
      animationDurationMs: 800,
    });
    expect(layerMotionAtTime(layer, 0).opacityMultiplier).toBe(0);
    expect(layerMotionAtTime(layer, 0).translateY).toBeGreaterThan(0);
    expect(layerMotionAtTime(layer, 1000)).toEqual({
      opacityMultiplier: 1,
      translateX: 0,
      translateY: 0,
      scale: 1,
    });
  });

  it("turns design motion into editable video keyframes", () => {
    const doc = defaultCanvasDocument("instagram_post");
    const first = doc.pages[0]!;
    const animated = {
      ...doc,
      layers: first.layers.map((layer, index) => index === 0 ? {
        ...layer,
        animationPreset: "slide_left" as const,
        animationDurationMs: 500,
        animationDelayMs: 100,
      } : layer),
      pages: [{
        ...first,
        layers: first.layers.map((layer, index) => index === 0 ? {
          ...layer,
          animationPreset: "slide_left" as const,
          animationDurationMs: 500,
          animationDelayMs: 100,
        } : layer),
      }],
    };
    const composition = designDocumentToComposition(animated);
    const source = composition.clips.find((clip) => clip.sourceDesignLayerId === first.layers[0]!.id);
    expect(source).toBeTruthy();
    const keyframes = composition.keyframes.filter((kf) => kf.clipId === source!.id);
    expect(keyframes.some((kf) => kf.property === "x")).toBe(true);
    expect(keyframes.some((kf) => kf.property === "opacity")).toBe(true);
  });
});
