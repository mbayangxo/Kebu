import { describe, expect, it } from "vitest";
import {
  cutoutScrollOffset,
  cutoutScrollTransform,
  MAYLECOR_DEFAULT_LAYER_MOTIONS,
  maylecorScrollTransform,
} from "@/lib/create/maylecor-cutout-motion";

describe("maylecor cutout scroll motion", () => {
  it("returns zero offset at scroll start", () => {
    const start = cutoutScrollOffset("cutoutLeft", 0);
    expect(Math.abs(start.x)).toBe(0);
    expect(Math.abs(start.y)).toBe(0);
    expect(Math.abs(start.rotate)).toBe(0);
  });

  it("moves cutouts at full scroll progress", () => {
    const end = cutoutScrollOffset("cutoutLeft", 1);
    expect(end.y).toBeLessThan(0);
    expect(end.x).toBeLessThan(0);
  });

  it("builds combined transform string with base rotation", () => {
    const t = cutoutScrollTransform("cutoutRight", 0.5, 5);
    expect(t).toContain("rotate");
    expect(t).toContain("translate3d");
  });

  it("ships default loop motions for hero slots", () => {
    expect(MAYLECOR_DEFAULT_LAYER_MOTIONS.cutoutLeft).toBe("bob");
    expect(MAYLECOR_DEFAULT_LAYER_MOTIONS.titleLogo).toBe("spin");
  });

  it("clears the May title by one canvas width on phone and ultrawide screens", () => {
    expect(maylecorScrollTransform("titleLogo", 1, 0, undefined, 390)).toBe("translate3d(-390px, 0px, 0)");
    expect(maylecorScrollTransform("titleLogo", 1, 0, undefined, 2560)).toBe("translate3d(-2560px, 0px, 0)");
  });

  it("respects explicit stationary title settings instead of applying the default exit", () => {
    expect(maylecorScrollTransform("titleLogo", 1, 12, { x: 0, y: 0 }, 390)).toBe("rotate(12deg)");
  });

  it("preserves authored travel and base rotation, scaling travel on narrow canvases", () => {
    expect(maylecorScrollTransform("cutoutAccent", 1, 7, { x: -120, y: 60 }, 600))
      .toBe("rotate(7deg) translate3d(-60px, 30px, 0)");
    expect(maylecorScrollTransform("cutoutAccent", 0, 7, { x: -120, y: 60 }, 600)).toBe("rotate(7deg)");
  });
});

