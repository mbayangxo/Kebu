import { describe, expect, it } from "vitest";
import {
  cutoutScrollOffset,
  cutoutScrollTransform,
  MAYLECOR_DEFAULT_LAYER_MOTIONS,
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
});
