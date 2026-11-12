import { describe, expect, it } from "vitest";
import { blankLayer, blankSlide, deckPatchSchema, isValidDeckPatch, slideSchema } from "@/lib/slides/schema";

describe("Slides schema", () => {
  it("blankSlide/blankLayer produce values that pass their own zod schemas", () => {
    const slide = blankSlide("s1");
    expect(slideSchema.safeParse(slide).success).toBe(true);
    const text = blankLayer("l1", "text", { x: 100, y: 100 });
    const rect = blankLayer("l2", "rect", { x: 100, y: 100 });
    const ellipse = blankLayer("l3", "ellipse", { x: 100, y: 100 });
    const line = blankLayer("l4", "line", { x: 100, y: 100 });
    const image = blankLayer("l5", "image", { x: 100, y: 100 });
    for (const layer of [text, rect, ellipse, line, image]) {
      const full = slideSchema.safeParse({ ...slide, layers: [layer] });
      expect(full.success, JSON.stringify(full)).toBe(true);
    }
  });

  it("rejects a deck with zero slides", () => {
    expect(isValidDeckPatch({ slides: [] })).toBe(false);
  });

  it("rejects a layer with an out-of-range opacity or rotation", () => {
    const slide = blankSlide("s1");
    const layer = blankLayer("l1", "text", { x: 0, y: 0 });
    const bad1 = { ...slide, layers: [{ ...layer, opacity: 2 }] };
    const bad2 = { ...slide, layers: [{ ...layer, rotation: 999 }] };
    expect(slideSchema.safeParse(bad1).success).toBe(false);
    expect(slideSchema.safeParse(bad2).success).toBe(false);
  });

  it("accepts a real multi-slide deck patch and caps at 200 slides", () => {
    const slides = Array.from({ length: 200 }, (_, i) => blankSlide(`s${i}`));
    expect(deckPatchSchema.safeParse({ slides }).success).toBe(true);
    expect(deckPatchSchema.safeParse({ slides: [...slides, blankSlide("s200")] }).success).toBe(false);
  });

  it("rejects a non-https image URL (schema requires a real absolute url)", () => {
    const slide = blankSlide("s1");
    const layer = blankLayer("l1", "image", { x: 0, y: 0 });
    const bad = { ...slide, layers: [{ ...layer, imageUrl: "javascript:alert(1)" }] };
    expect(slideSchema.safeParse(bad).success).toBe(false);
  });
});
