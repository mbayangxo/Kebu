import { describe, expect, it } from "vitest";
import { canvasLayerSchema } from "@/lib/studio/canvas-document";
import { layerSnapTargets, snapLayerPosition } from "@/lib/studio/editor-craft";

const layer = (id: string, x: number, y: number, width = 100, height = 40, rotation = 0) =>
  canvasLayerSchema.parse({ id, type: "rect", x, y, width, height, rotation });
const board = { width: 640, height: 640 };

describe("Studio dragging snaps visible selection bounds", () => {
  it("snaps a rotated moving frame's visible edge", () => {
    const moving = layer("moving", 100, 100, 200, 40, 90);
    // At 90 degrees the visible left is x+80. Proposed visible left is 3.
    const result = snapLayerPosition(moving, -177, 11, [moving], new Set([moving.id]), board);
    expect(result.x).toBeCloseTo(-80);
    expect(result.guides.v).toBe(0);
  });

  it("snaps the whole moving selection instead of the clicked member", () => {
    const a = layer("a", 100, 101), b = layer("b", 250, 191);
    // Group right is 350; +287 brings it to 637, near artboard right 640.
    const result = snapLayerPosition(a, 287, 13, [a,b], new Set([a.id,b.id]), board);
    expect(result.x-a.x).toBe(290);
    expect(result.guides.v).toBe(640);
    const fromOtherMember = snapLayerPosition(b,287,13,[a,b],new Set([a.id,b.id]),board);
    expect(fromOtherMember.x-b.x).toBe(290);
  });

  it("chooses the nearest edge or center instead of always preferring left", () => {
    const moving = layer("moving", 313, 101, 325, 40);
    // Left needs +7 to center; right needs +2 to artboard edge.
    const result = snapLayerPosition(moving,0,13,[moving],new Set([moving.id]),board);
    expect(result.x).toBe(315);
    expect(result.guides.v).toBe(640);
  });

  it("targets rotated visible edges and omits invisible or moving artwork", () => {
    const rotated = layer("target",100,100,200,40,90);
    const hidden = {...layer("hidden",333,333),opacity:0};
    const moving = layer("moving",222,222);
    const targets = layerSnapTargets([rotated,hidden,moving],new Set([moving.id]),board);
    expect(targets.x).toContain(180); expect(targets.x).toContain(220);
    expect(targets.x).not.toContain(100); expect(targets.x).not.toContain(333); expect(targets.x).not.toContain(222);
    expect(targets.y).toContain(20); expect(targets.y).toContain(220);
  });

  it("leaves unsnapped motion and the immutable source unchanged", () => {
    const moving = layer("moving",111,111,70,40,31), target = layer("target",440,440);
    const snapshot = structuredClone([moving,target]);
    const result = snapLayerPosition(moving,13,17,[moving,target],new Set([moving.id]),board,0.1);
    expect(result).toEqual({x:124,y:128,guides:{v:null,h:null}});
    expect([moving,target]).toEqual(snapshot);
  });

  it("uses the supplied threshold independently on both axes", () => {
    const moving = layer("moving",3,5,100,40);
    const tight = snapLayerPosition(moving,0,0,[moving],new Set([moving.id]),board,2);
    expect(tight).toEqual({x:3,y:5,guides:{v:null,h:null}});
    const wide = snapLayerPosition(moving,0,0,[moving],new Set([moving.id]),board,6);
    expect(wide).toEqual({x:0,y:0,guides:{v:0,h:0}});
  });
});
