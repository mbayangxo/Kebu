import { describe, expect, it } from "vitest";
import { canvasLayerSchema } from "@/lib/studio/canvas-document";
import { elementsByKind, getElementDef, STUDIO_ELEMENTS_PACK } from "@/lib/studio/elements-pack";

describe("Studio elements pack (S19)", () => {
  it("ships curated lines, frames, and icons", () => {
    expect(elementsByKind("line").length).toBeGreaterThan(0);
    expect(elementsByKind("frame").length).toBeGreaterThan(0);
    expect(elementsByKind("icon").length).toBeGreaterThanOrEqual(5);
    expect(STUDIO_ELEMENTS_PACK.every((e) => e.id && e.label)).toBe(true);
  });

  it("builds valid canvas layers from pack defaults", () => {
    const star = getElementDef("icon-star");
    expect(star?.glyph).toBe("★");
    const layer = canvasLayerSchema.parse({
      id: "el1",
      type: "icon",
      name: star!.label,
      x: 10,
      y: 10,
      width: 72,
      height: 72,
      ...star!.defaults,
      text: star!.glyph,
      iconKey: "star",
    });
    expect(layer.type).toBe("icon");
    expect(layer.iconKey).toBe("star");

    const frame = canvasLayerSchema.parse({
      id: "fr1",
      type: "frame",
      name: "Frame",
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      frameStyle: "rounded",
      stroke: "#fff",
      strokeWidth: 6,
      fill: "transparent",
    });
    expect(frame.frameStyle).toBe("rounded");
  });
});
