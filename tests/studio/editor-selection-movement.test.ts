import { describe, expect, it } from "vitest";
import { nudgeLayersWithinArtboard, selectionBounds } from "@/lib/studio/editor-craft";
import type { CanvasLayer } from "@/lib/studio/canvas-document";

function layer(id: string, x: number, y: number, locked = false, groupId?: string): CanvasLayer {
  return {
    id, type: "rect", name: id, x, y, width: 100, height: 80,
    rotation: 0, opacity: 1, locked, fill: "#000", groupId,
  };
}

describe("Studio editor selection movement", () => {
  it("computes a multi-layer selection box", () => {
    expect(selectionBounds([layer("a", 10, 20), layer("b", 150, 120)], ["a", "b"])).toEqual({
      left: 10, top: 20, right: 250, bottom: 200, width: 240, height: 180,
    });
  });

  it("keeps keyboard nudges inside the artboard", () => {
    const layers = [layer("a", 10, 10)];
    expect(nudgeLayersWithinArtboard(layers, ["a"], -50, -50, { width: 300, height: 300 })[0]).toMatchObject({ x: 0, y: 0 });
    expect(nudgeLayersWithinArtboard([layer("a", 250, 250)], ["a"], 50, 50, { width: 300, height: 300 })[0]).toMatchObject({ x: 200, y: 220 });
  });

  it("moves grouped unlocked layers together while leaving locked members fixed", () => {
    const layers = [layer("a", 10, 10, false, "g1"), layer("b", 120, 10, false, "g1"), layer("c", 230, 10, true, "g1")];
    const next = nudgeLayersWithinArtboard(layers, ["a"], 10, 0, { width: 400, height: 300 });
    expect(next[0]!.x).toBe(20);
    expect(next[1]!.x).toBe(130);
    expect(next[2]!.x).toBe(230);
  });
});
