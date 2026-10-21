import { describe, expect, it } from "vitest";
import { resizeCollageSource, visibleCollageBounds, type CollageCorner } from "@/lib/create/collage-frame-geometry";
import type { CreativeBounds } from "@/lib/creative-core/resize";

const original: CreativeBounds = { x: 105, y: 72, width: 320, height: 580, rotation: 0 };
function point(b: CreativeBounds, x: number, y: number) {
  const dx = b.width * (x - 0.5), dy = b.height * (y - 0.5), a = b.rotation * Math.PI / 180;
  return { x: b.x + b.width / 2 + Math.cos(a) * dx - Math.sin(a) * dy,
    y: b.y + b.height / 2 + Math.sin(a) * dx + Math.cos(a) * dy };
}
function samePoint(actual: { x: number; y: number }, expected: { x: number; y: number }) {
  expect(actual.x).toBeCloseTo(expected.x, 8); expect(actual.y).toBeCloseTo(expected.y, 8);
}

describe("actual collage crop frame geometry", () => {
  it("retains the source pivot and actual portrait ratio", () => {
    const visible = visibleCollageBounds(original, 20);
    expect(visible).toEqual({ x: 169, y: 188, width: 192, height: 348, rotation: 0 });
    samePoint(point(visible, 0.5, 0.5), point(original, 0.5, 0.5));
    expect(visible.width / visible.height).toBeCloseTo(original.width / original.height);
  });
  for (const rotation of [0, 30, -45, 135]) {
    for (const corner of ["nw", "ne", "sw", "se"] as CollageCorner[]) {
      it(`anchors the opposite cropped corner at ${rotation}deg from ${corner}`, () => {
        const source = { ...original, rotation }, before = visibleCollageBounds(source, 27);
        const result = resizeCollageSource(source, 1, 27, corner, { x: 45, y: -38 });
        const x = corner.includes("e") ? 0 : 1, y = corner.includes("s") ? 0 : 1;
        samePoint(point(visibleCollageBounds(result.source, 27), x, y), point(before, x, y));
        expect(result.source.width / result.source.height).toBeCloseTo(source.width / source.height);
      });
      it(`retains source and crop centers with Alt at ${rotation}deg from ${corner}`, () => {
        const source = { ...original, rotation };
        const result = resizeCollageSource(source, 1, 27, corner, { x: 45, y: -38 }, { fromCenter: true });
        samePoint(point(result.source, 0.5, 0.5), point(source, 0.5, 0.5));
        samePoint(point(visibleCollageBounds(result.source, 27), 0.5, 0.5), point(source, 0.5, 0.5));
      });
    }
  }
  it.each([0, 20, 45])("enforces scale bounds while keeping the opposite anchor at %s%% crop", crop => {
    const before = visibleCollageBounds(original, crop);
    for (const [delta, expected] of [[100000, 3], [-100000, 0.15]]) {
      const result = resizeCollageSource(original, 1, crop, "se", { x: delta, y: delta });
      expect(result.scale).toBeCloseTo(expected, 10);
      samePoint(point(visibleCollageBounds(result.source, crop), 0, 0), point(before, 0, 0));
    }
  });
  it("honors the existing minimum source width during an explicit resize", () => {
    const result = resizeCollageSource(original, 1, 20, "nw", { x: 10000, y: 10000 }, { minimumScale: 4 / 14 });
    expect(result.scale).toBeCloseTo(4 / 14);
    samePoint(point(visibleCollageBounds(result.source, 20), 1, 1), point(visibleCollageBounds(original, 20), 1, 1));
  });
});
