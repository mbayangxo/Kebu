import { describe, expect, it } from "vitest";
import { canvasDocumentSchema } from "@/lib/studio/canvas-document";
import { designDocumentToComposition } from "@/lib/studio/design-to-composition";
import { studioLayerFillCss, studioCanvasCompositeOperation } from "@/lib/studio/layer-paint";

describe("Studio gradient and blend depth", () => {
  const doc = canvasDocumentSchema.parse({
    version: 2,
    width: 1080,
    height: 1080,
    backgroundColor: "#FFFCF8",
    layers: [],
    pages: [{
      id: "pg_one",
      name: "Page 1",
      width: 1080,
      height: 1080,
      backgroundColor: "#FFFCF8",
      layers: [{
        id: "ly_gradient",
        type: "rect",
        name: "Gradient block",
        x: 120,
        y: 160,
        width: 600,
        height: 420,
        rotation: 0,
        opacity: 0.92,
        locked: false,
        fill: "#FF6A00",
        fillType: "linear_gradient",
        gradientFrom: "#FF6A00",
        gradientTo: "#FF1F1F",
        gradientAngle: 42,
        blendMode: "multiply",
      }],
    }],
  });

  it("persists gradient and blend properties in the canvas schema", () => {
    const layer = doc.pages[0]!.layers[0]!;
    expect(layer.fillType).toBe("linear_gradient");
    expect(layer.gradientFrom).toBe("#FF6A00");
    expect(layer.gradientTo).toBe("#FF1F1F");
    expect(layer.gradientAngle).toBe(42);
    expect(layer.blendMode).toBe("multiply");
    expect(studioLayerFillCss(layer)).toContain("linear-gradient(42deg");
    expect(studioCanvasCompositeOperation(layer.blendMode)).toBe("multiply");
  });

  it("carries editable paint into semantic design-to-video clips", () => {
    const composition = designDocumentToComposition(doc);
    const clip = composition.clips.find((item) => item.sourceDesignLayerId === "ly_gradient");
    expect(clip?.designLayer?.fillType).toBe("linear_gradient");
    expect(clip?.designLayer?.gradientFrom).toBe("#FF6A00");
    expect(clip?.designLayer?.gradientTo).toBe("#FF1F1F");
    expect(clip?.designLayer?.gradientAngle).toBe(42);
    expect(clip?.designLayer?.blendMode).toBe("multiply");
  });
});
