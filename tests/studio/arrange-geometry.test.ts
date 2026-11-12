import { describe, expect, it } from "vitest";
import { alignLayers, alignmentSelectionCount, canvasLayerSchema, type CanvasLayer } from "@/lib/studio/canvas-document";

const layer = (id: string, x: number, y: number, width = 100, height = 40, rotation = 0, groupId?: string) =>
  canvasLayerSchema.parse({ id, type: "rect", name: id, x, y, width, height, rotation, groupId });

// Independent corner rotation measures the footprint the visitor actually sees.
function painted(l: CanvasLayer) {
  const a = l.rotation * Math.PI / 180, cx = l.x + l.width / 2, cy = l.y + l.height / 2;
  const corners = [[-l.width/2,-l.height/2],[l.width/2,-l.height/2],[l.width/2,l.height/2],[-l.width/2,l.height/2]]
    .map(([x,y]) => [cx + x! * Math.cos(a) - y! * Math.sin(a), cy + x! * Math.sin(a) + y! * Math.cos(a)]);
  return { left: Math.min(...corners.map(p => p[0]!)), right: Math.max(...corners.map(p => p[0]!)), top: Math.min(...corners.map(p => p[1]!)), bottom: Math.max(...corners.map(p => p[1]!)) };
}

describe("Studio arrange uses visible geometry and rigid groups", () => {
  it("moves a selected group to the artboard edge without collapsing its members", () => {
    const original = [layer("a",100,100,100,40,0,"pair"), layer("b",250,180,50,80,0,"pair")];
    const moved = alignLayers(original, ["a","b"], "left", {width:640,height:640});
    expect(moved.map(l => l.x)).toEqual([0,150]);
    expect(moved.map(l => l.y)).toEqual([100,180]);
    expect(original.map(l => l.x)).toEqual([100,250]);
  });

  it("aligns the visible edge of a rotated object rather than its unrotated frame", () => {
    const original = layer("tilted",100,100,200,40,90);
    const moved = alignLayers([original], [original.id], "left", {width:640,height:640})[0]!;
    expect(painted(moved).left).toBeCloseTo(0);
    expect(moved).toMatchObject({width:200,height:40,rotation:90,y:100});
  });

  it("distributes the visible gaps of three rotated objects, preserving the outer edges", () => {
    const original = [layer("a",50,100,100,40,30), layer("b",190,120,80,120,-45), layer("c",450,160,70,90,60)];
    const result = alignLayers(original, original.map(l => l.id), "distribute-h", {width:640,height:640});
    const [a,b,c] = result.map(painted);
    expect(b!.left-a!.right).toBeCloseTo(c!.left-b!.right);
    expect(a!.left).toBeCloseTo(painted(original[0]!).left);
    expect(c!.right).toBeCloseTo(painted(original[2]!).right);
    expect(result.map(l => [l.y,l.width,l.height,l.rotation])).toEqual(original.map(l => [l.y,l.width,l.height,l.rotation]));
  });

  it.each(["left","right","top","bottom","center-x","center-y"] as const)("aligns a rotated visible frame using %s", mode => {
    const original = layer("tilted",80,130,200,70,37);
    const result = alignLayers([original], [original.id], mode, {width:640,height:600})[0]!;
    const box = painted(result);
    const actual = mode === "center-x" ? (box.left+box.right)/2 : mode === "center-y" ? (box.top+box.bottom)/2 : box[mode];
    const expected = {left:0,right:640,top:0,bottom:600,"center-x":320,"center-y":300}[mode];
    expect(actual).toBeCloseTo(expected);
    expect(result.rotation).toBe(37);
  });

  it("distributes vertical visible gaps and counts a group as one target", () => {
    const original = [layer("a",20,30,100,40,30,"g"),layer("a2",30,90,80,20,-30,"g"),layer("b",150,230,40,100,45),layer("c",200,480,60,80,20)];
    expect(alignmentSelectionCount(original,["a","b","c"])).toBe(3);
    const moved = alignLayers(original,["a","b","c"],"distribute-v",{width:640,height:640});
    const groupBottom = Math.max(painted(moved[0]!).bottom,painted(moved[1]!).bottom);
    const b = painted(moved[2]!), c = painted(moved[3]!);
    expect(b.top-groupBottom).toBeCloseTo(c.top-b.bottom);
    expect(moved[0]!.y-original[0]!.y).toBeCloseTo(moved[1]!.y-original[1]!.y);
    expect(moved.map(l=>l.x)).toEqual(original.map(l=>l.x));
    expect(alignLayers(original,["a","b"],"distribute-v",{width:640,height:640})).toBe(original);
  });

  it("does not move locked members or unrelated artwork", () => {
    const original = [layer("a",100,100,100,40,0,"g"),{...layer("locked",200,100,100,40,0,"g"),locked:true},layer("other",300,200)];
    const moved = alignLayers(original,["a"],"left",{width:640,height:640});
    expect(moved[0]!.x).toBe(0);
    expect(moved[1]).toBe(original[1]); expect(moved[2]).toBe(original[2]);
    expect(alignmentSelectionCount(original,["locked"])).toBe(1);
    expect(alignmentSelectionCount([original[1]!],["locked"])).toBe(0);
  });

  it("rejects unsupported translations atomically, retaining the original document", () => {
    const original = [layer("a",-2000,100,100,40,0,"g"),layer("b",4000,180,50,80,0,"g")];
    const snapshot = structuredClone(original);
    expect(()=>alignLayers(original,["a"],"left",{width:640,height:640})).toThrow(/supported canvas range/);
    expect(original).toEqual(snapshot);
    expect(alignLayers([layer("at-edge",0,10)],["at-edge"],"left",{width:640,height:640})[0]!.x).toBe(0);
  });
});
