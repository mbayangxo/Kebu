import { describe, expect, it } from "vitest";
import { resizeCreativeBounds, type CreativeBounds, type ResizeHandle } from "@/lib/creative-core/resize";

function point(box: CreativeBounds, x: number, y: number) {
  const a = box.rotation * Math.PI / 180;
  return [box.x + box.width / 2 + Math.cos(a) * x * box.width / 2 - Math.sin(a) * y * box.height / 2,
    box.y + box.height / 2 + Math.sin(a) * x * box.width / 2 + Math.cos(a) * y * box.height / 2];
}
const start = { x: 100, y: 80, width: 240, height: 120, rotation: 0 };
const handles: ResizeHandle[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
describe("creative resize anchors", () => {
  it.each(handles)("preserves the opposite anchor for rotated %s resize", handle => {
    const box = { ...start, rotation: 37 };
    const next = resizeCreativeBounds(box, handle, { x: 35, y: -20 });
    const oppositeX = handle.includes("e") ? -1 : handle.includes("w") ? 1 : 0;
    const oppositeY = handle.includes("s") ? -1 : handle.includes("n") ? 1 : 0;
    point(next, oppositeX, oppositeY).forEach((value, i) => expect(value).toBeCloseTo(point(box, oppositeX, oppositeY)[i]!, 8));
  });
  it.each(handles)("Alt keeps the center fixed for %s", handle => {
    const next = resizeCreativeBounds(start, handle, { x: 35, y: -20 }, { fromCenter: true });
    expect(point(next, 0, 0)).toEqual(point(start, 0, 0));
  });
  it.each(handles)("Shift preserves ratio and dimensions within schema bounds for %s", handle => {
    const next = resizeCreativeBounds(start, handle, { x: 10000, y: -10000 }, { keepRatio: true });
    expect(next.width / next.height).toBeCloseTo(2);
    expect(Math.min(next.width, next.height)).toBeGreaterThanOrEqual(24);
    expect(Math.max(next.width, next.height)).toBeLessThanOrEqual(4000);
  });
  it("east and south sides alter only their own dimensions without Shift", () => {
    expect(resizeCreativeBounds(start, "e", { x: 30, y: 60 })).toMatchObject({ x: 100, y: 80, width: 270, height: 120 });
    expect(resizeCreativeBounds(start, "s", { x: 30, y: 60 })).toMatchObject({ x: 100, y: 80, width: 240, height: 180 });
  });
  it("uses local axes for a 90-degree object", () => {
    const next = resizeCreativeBounds({ ...start, rotation: 90 }, "e", { x: 0, y: 60 });
    expect(next.width).toBeCloseTo(300);
    expect(next.height).toBe(120);
  });
  it("accepts real document layers with string metadata", () => {
    const layer = { ...start, id: "text-1", type: "text", text: "Hello", locked: false };
    expect(resizeCreativeBounds(layer, "e", { x: 30, y: 0 }).width).toBe(270);
  });
  it("rejects invalid pointer coordinates without corrupting the object", () => {
    expect(resizeCreativeBounds(start, "se", { x: NaN, y: 0 })).toEqual(start);
  });
});
