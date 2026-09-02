import { describe, expect, it } from "vitest";
import { fitDesignHeight, fitDesignScale } from "@/lib/create/responsive-scale";

describe("responsive design scale", () => {
  it("fits tablet and phone into the design width", () => {
    expect(fitDesignScale(768, 1200)).toBeCloseTo(768 / 1200);
    expect(fitDesignScale(390, 1200)).toBeCloseTo(390 / 1200);
  });

  it("does not upscale past the design width", () => {
    expect(fitDesignScale(1400, 1200)).toBe(1);
    expect(fitDesignScale(1280, 1200)).toBe(1);
  });

  it("computes frame height after scale", () => {
    expect(fitDesignHeight(390, 1200, 700)).toBeCloseTo(700 * (390 / 1200));
  });
});
