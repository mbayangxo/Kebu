import { describe, expect, it } from "vitest";
import { canvasLayerSchema } from "@/lib/studio/canvas-document";
import {
  elementsByKind,
  getElementDef,
  searchStudioElements,
  STUDIO_ELEMENTS_PACK,
  STUDIO_VECTOR_ELEMENTS,
  type StudioElementCategory,
} from "@/lib/studio/elements-pack";

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

describe("Studio real vector elements (S20)", () => {
  it("has no duplicate ids across the whole catalog", () => {
    const ids = STUDIO_ELEMENTS_PACK.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every vector element a non-empty SVG path, a view box, a fill color, and a glyph fallback", () => {
    expect(STUDIO_VECTOR_ELEMENTS.length).toBeGreaterThanOrEqual(30);
    for (const el of STUDIO_VECTOR_ELEMENTS) {
      expect(el.defaults.iconSvgPath, el.id).toMatch(/^M[-0-9.,A-Za-z\s]+Z$/);
      expect(el.defaults.iconViewBox, el.id).toBe("0 0 24 24");
      expect(el.defaults.fill, el.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(el.glyph, el.id).toBeTruthy();
    }
  });

  it("parses every vector element into a valid canvas layer", () => {
    for (const el of STUDIO_VECTOR_ELEMENTS) {
      const layer = canvasLayerSchema.parse({
        id: `t-${el.id}`,
        type: el.kind,
        name: el.label,
        x: 0,
        y: 0,
        width: 72,
        height: 72,
        ...el.defaults,
      });
      expect(layer.iconSvgPath, el.id).toBe(el.defaults.iconSvgPath);
    }
  });

  it("covers business, education, and creator categories with real vector elements", () => {
    for (const category of ["business", "education", "creator", "shapes"] as StudioElementCategory[]) {
      const matches = searchStudioElements("", category);
      expect(matches.length, category).toBeGreaterThan(0);
      expect(matches.some((e) => e.defaults.iconSvgPath), category).toBe(true);
    }
  });

  it("finds real elements by audience-relevant search terms", () => {
    expect(searchStudioElements("deadline").some((e) => e.id === "biz-clock")).toBe(true);
    expect(searchStudioElements("graduation").some((e) => e.id === "edu-graduation-cap")).toBe(true);
    expect(searchStudioElements("podcast").some((e) => e.id === "creator-microphone")).toBe(true);
  });
});
