import { describe, expect, it } from "vitest";
import { canvasLayerSchema } from "@/lib/studio/canvas-document";
import { layersInRect } from "@/lib/studio/editor-craft";

const layer = (patch: Record<string, unknown> = {}) => canvasLayerSchema.parse({
  id: "shape", type: "rect", x: 100, y: 100, width: 100, height: 20, ...patch,
});

describe("Studio marquee geometry", () => {
  it("selects a partially intersected layer while leaving distant layers alone", () => {
    expect(layersInRect([layer(), layer({ id: "far", x: 400 })], { left: 90, top: 90, right: 110, bottom: 110 })).toEqual(["shape"]);
  });
  it("accepts a marquee drawn in either direction", () => {
    expect(layersInRect([layer()], { left: 110, top: 110, right: 90, bottom: 90 })).toEqual(["shape"]);
  });
  it("does not select locked or fully transparent artwork", () => {
    expect(layersInRect([layer({ locked: true }), layer({ id: "hidden", opacity: 0 })], { left: 0, top: 0, right: 300, bottom: 300 })).toEqual([]);
  });
  it("does not select an object merely touched along its edge", () => {
    expect(layersInRect([layer()], { left: 0, top: 0, right: 100, bottom: 120 })).toEqual([]);
  });
  it("selects a rotated visible edge outside the unrotated frame", () => {
    expect(layersInRect([layer({ rotation: 90 })], { left: 145, top: 65, right: 155, bottom: 75 })).toEqual(["shape"]);
  });
  it("rejects empty corners of a rotated object's enclosing box", () => {
    expect(layersInRect([layer({ height: 10, rotation: 45 })], { left: 112, top: 137, right: 116, bottom: 141 })).toEqual([]);
  });
  it("handles artwork and a marquee outside the artboard origin", () => {
    expect(layersInRect([layer({ x: -40, y: -40 })], { left: -35, top: -35, right: -25, bottom: -25 })).toEqual(["shape"]);
  });
  it.each([
    { left: 100, top: 100, right: 100, bottom: 120 },
    { left: NaN, top: 0, right: 200, bottom: 200 },
    { left: 0, top: 0, right: Infinity, bottom: 200 },
  ])("refuses a degenerate or invalid marquee %j", rect => {
    expect(layersInRect([layer()], rect)).toEqual([]);
  });
});
