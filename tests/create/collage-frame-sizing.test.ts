import { describe, expect, it } from "vitest";
import { resizeCollageFrame } from "@/lib/create/collage-frame-sizing";
import { visibleCollageBounds } from "@/lib/create/collage-frame-geometry";
import type { CreativeBounds, ResizeHandle } from "@/lib/creative-core/resize";
const point = (box: CreativeBounds, x: number, y: number) => {
  const angle = box.rotation * Math.PI / 180;
  return { x: box.x + box.width / 2 + Math.cos(angle) * x * box.width / 2 - Math.sin(angle) * y * box.height / 2,
    y: box.y + box.height / 2 + Math.sin(angle) * x * box.width / 2 + Math.cos(angle) * y * box.height / 2 };
};
describe("independent cropped image frame geometry", () => {
  for (const rotation of [0, 30, 90, 247]) for (const handle of ["n","e","s","w"] as ResizeHandle[]) it(`${handle} at ${rotation} degrees keeps opposite visible anchor and independent axis`, () => {
    const source = { x: 120, y: 210, width: 300, height: 200, rotation }, angle = rotation * Math.PI / 180;
    const horizontal = handle === "e" ? 1 : handle === "w" ? -1 : 0, vertical = handle === "s" ? 1 : handle === "n" ? -1 : 0;
    const result = resizeCollageFrame(source, 1, 23, handle, { x: Math.cos(angle) * horizontal * 20 - Math.sin(angle) * vertical * 20, y: Math.sin(angle) * horizontal * 20 + Math.cos(angle) * vertical * 20 });
    if (horizontal) { expect(result.source.width).toBeGreaterThan(source.width); expect(result.source.height).toBeCloseTo(source.height); }
    else { expect(result.source.height).toBeGreaterThan(source.height); expect(result.source.width).toBeCloseTo(source.width); }
    const a = point(visibleCollageBounds(source,23), -horizontal, -vertical), b = point(visibleCollageBounds(result.source,23), -horizontal, -vertical);
    expect(a.x).toBeCloseTo(b.x,8); expect(a.y).toBeCloseTo(b.y,8);
    expect(result.aspectRatio).toBeCloseTo(result.source.width / result.source.height);
  });
  it("keeps center and constrained proportions at scale boundary", () => {
    const source = { x: 10, y: 20, width: 300, height: 180, rotation: 35 };
    const result = resizeCollageFrame(source,2.9,10,"e",{x:2000,y:2000},{fromCenter:true,keepRatio:true});
    expect(result.scale).toBeCloseTo(3); expect(result.aspectRatio).toBeCloseTo(300/180);
    expect(point(result.source,0,0)).toEqual(point(source,0,0));
  });
  it("limits source position by shortening the anchored resize trajectory", () => {
    const source = { x: 10, y: 20, width: 300, height: 180, rotation: 0 };
    const result = resizeCollageFrame(source,1,20,"w",{x:-10000,y:0},{positionBounds:{minX:0,maxX:1000,minY:0,maxY:1000}});
    expect(result.source.x).toBeCloseTo(0); expect(result.scale).toBeLessThan(3);
    expect(point(visibleCollageBounds(result.source,20),1,0).x).toBeCloseTo(point(visibleCollageBounds(source,20),1,0).x);
  });
  it("refuses nonfinite input instead of poisoning persisted geometry", () => {
    const source = { x: 10, y: 20, width: 300, height: 180, rotation: 0 };
    expect(resizeCollageFrame(source,1,0,"e",{x:NaN,y:0}).source).toEqual(source);
  });
});
