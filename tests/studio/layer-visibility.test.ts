import { describe, expect, it } from "vitest";
import { canvasLayerSchema } from "@/lib/studio/canvas-document";

describe("Studio layer visibility", () => {
  it("defaults legacy layers to visible", () => {
    const parsed = canvasLayerSchema.parse({
      id: "layer-1",
      type: "rect",
      name: "Shape",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      locked: false,
    });
    expect(parsed.hidden).toBe(false);
  });

  it("persists hidden state explicitly", () => {
    const parsed = canvasLayerSchema.parse({
      id: "layer-2",
      type: "text",
      name: "Hidden",
      x: 0,
      y: 0,
      width: 100,
      height: 30,
      rotation: 0,
      opacity: 1,
      locked: false,
      hidden: true,
      text: "Private draft text",
    });
    expect(parsed.hidden).toBe(true);
  });
});
