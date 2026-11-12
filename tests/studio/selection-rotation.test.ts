import { describe, expect, it } from "vitest";
import { canvasLayerSchema } from "@/lib/studio/canvas-document";
import { rotateSelectionLayers, selectionRotationGeometry } from "@/lib/studio/selection-rotation";

const layer = (id: string, x: number, y: number, width = 100, height = 40, rotation = 0, groupId?: string) =>
  canvasLayerSchema.parse({id,type:"rect",x,y,width,height,rotation,groupId});
const pair = () => [layer("a",120,120,100,40,0,"pair"),layer("b",300,240,80,100,30,"pair")];

function center(l: ReturnType<typeof layer>) { return {x:l.x+l.width/2,y:l.y+l.height/2}; }

describe("Studio shared selection rotation", () => {
  it("expands a selected group and rotates all centers around the same visible pivot", () => {
    const original = pair(), next = rotateSelectionLayers(original,["a"],90);
    expect(selectionRotationGeometry(original,["a"])?.pivot).toEqual({x:255,y:215});
    expect(next.map(l=>l.rotation)).toEqual([90,120]);
    expect(next[0]!.x).toBeCloseTo(280); expect(next[0]!.y).toBeCloseTo(110);
    expect(next[1]!.x).toBeCloseTo(140); expect(next[1]!.y).toBeCloseTo(250);
    expect(original).toEqual(pair());
  });

  it.each([1,15,37,90,-90,180,359,-359])("preserves distance, size, style and pivot for a %s-degree rotation", degrees => {
    const original = pair(), next = rotateSelectionLayers(original,["a"],degrees);
    const [a,b] = original.map(center), [c,d] = next.map(center);
    expect(Math.hypot(d!.x-c!.x,d!.y-c!.y)).toBeCloseTo(Math.hypot(b!.x-a!.x,b!.y-a!.y));
    expect(selectionRotationGeometry(next,["a"])?.pivot.x).toBeCloseTo(255);
    expect(selectionRotationGeometry(next,["a"])?.pivot.y).toBeCloseTo(215);
    for(let i=0;i<original.length;i++) {
      for (const key of Object.keys(original[i]!) as (keyof ReturnType<typeof layer>)[]) {
        if (!["x","y","rotation"].includes(key)) expect(next[i]![key]).toEqual(original[i]![key]);
      }
      expect(canvasLayerSchema.safeParse(next[i]).success).toBe(true);
    }
    const restored = rotateSelectionLayers(next,["a"],-degrees);
    for(let i=0;i<original.length;i++) {
      expect(restored[i]!.x).toBeCloseTo(original[i]!.x);
      expect(restored[i]!.y).toBeCloseTo(original[i]!.y);
      expect(restored[i]!.rotation).toBeCloseTo(original[i]!.rotation);
    }
  });

  it("rotates an ungrouped multi-selection without changing group membership", () => {
    const original = pair().map(l=>({...l,groupId:null}));
    const next = rotateSelectionLayers(original,["a","b"],90);
    expect(next.map(l=>l.rotation)).toEqual([90,120]);
    expect(next.every(l=>l.groupId===null)).toBe(true);
  });

  it("keeps locked and unrelated members unchanged by reference", () => {
    const locked = {...layer("locked",20,20,20,20,0,"pair"),locked:true}, other = layer("other",500,500);
    const original = [...pair(),locked,other], next = rotateSelectionLayers(original,["a"],90);
    expect(next[2]).toBe(locked); expect(next[3]).toBe(other);
    expect(selectionRotationGeometry(original,["a"])?.layerIds).toEqual(["a","b"]);
  });

  it("moves hidden group content with the visible composition without attracting its pivot", () => {
    const hidden = {...layer("hidden",400,400,20,20,0,"pair"),opacity:0};
    const original = [...pair(),hidden], next = rotateSelectionLayers(original,["a"],90);
    expect(selectionRotationGeometry(original,["a"])?.pivot).toEqual({x:255,y:215});
    expect(next[2]!.x).not.toBe(hidden.x); expect(next[2]!.opacity).toBe(0);
    expect(selectionRotationGeometry(next,["a"])?.pivot.x).toBeCloseTo(255);
    expect(selectionRotationGeometry(pair().map(l=>({...l,opacity:0})),["a"])?.pivot).toEqual({x:255,y:215});
  });

  it("rejects the entire operation when one member leaves the persisted coordinate range", () => {
    const original = [layer("a",-2000,-2000,100,100,0,"pair"),layer("b",4000,4000,100,100,0,"pair")];
    const snapshot = structuredClone(original);
    expect(()=>rotateSelectionLayers(original,["a"],45)).toThrow(/supported canvas range/);
    expect(original).toEqual(snapshot);
  });

  it("retains no-op identity and rejects nonfinite input", () => {
    const original = pair();
    for(const degrees of [0,360,-360,720]) expect(rotateSelectionLayers(original,["a"],degrees)).toBe(original);
    expect(rotateSelectionLayers(original,[],90)).toBe(original);
    expect(rotateSelectionLayers([original[0]!],["a"],90)).toEqual([original[0]]);
    expect(selectionRotationGeometry(original.map(l=>({...l,locked:true})),["a"])).toBeNull();
    for(const degrees of [NaN,Infinity,-Infinity]) expect(()=>rotateSelectionLayers(original,["a"],degrees)).toThrow(/finite/);
  });
});
