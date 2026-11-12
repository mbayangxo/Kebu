import { describe, expect, it } from "vitest";
import { collageSceneProgress, maylecorLayerProgress } from "@/lib/create/collage-scroll-scene";

describe("sticky collage scene geometry", () => {
  it("finishes at release even when the artboard is taller than the viewport", () => {
    // A 900px artboard on a 600px phone: release is at 1980 - 900, not 1980 - 600.
    expect(collageSceneProgress(-1080, 1980, 900)).toBe(1);
    expect(collageSceneProgress(-540, 1980, 900)).toBe(0.5);
  });

  it("uses the panel's viewport origin rather than the outer window", () => {
    expect(collageSceneProgress(-350, 1800, 800, 150)).toBe(0.5);
  });

  it("clamps before entry and after release, and reverses with scrolling", () => {
    const positions = [100, 0, -500, -1000, -1500, -500, 0];
    expect(positions.map(top => collageSceneProgress(top, 1800, 800))).toEqual([0, 0, 0.5, 1, 1, 0.5, 0]);
    expect(collageSceneProgress(-20, 800, 800)).toBe(0);
  });
});

describe("May reference choreography", () => {
  it("holds the opening composition before starting movement", () => {
    for (const key of ["titleLogo", "cutoutLeft", "cutoutAccent", "macbook"]) {
      expect(maylecorLayerProgress(key, 0)).toBe(0);
      expect(maylecorLayerProgress(key, 0.05)).toBe(0);
    }
  });

  it("clears the title before the skyline completes its drift", () => {
    expect(maylecorLayerProgress("titleLogo", 0.7)).toBe(1);
    expect(maylecorLayerProgress("macbook", 0.7)).toBeLessThan(1);
    expect(maylecorLayerProgress("macbook", 0.15)).toBe(0);
    expect(maylecorLayerProgress("cutoutLeft", 0.15)).toBeGreaterThan(0);
  });

  it("settles every layer before the pin releases without overshoot", () => {
    for (const key of ["titleLogo", "cutoutLeft", "cutoutAccent", "macbook", "custom-upload"]) {
      const samples = Array.from({ length: 101 }, (_, i) => maylecorLayerProgress(key, i / 100));
      expect(samples[100]).toBe(1);
      expect(samples.every((v, i) => v >= 0 && v <= 1 && (!i || v >= samples[i - 1]))).toBe(true);
      expect(maylecorLayerProgress(key, -1)).toBe(0);
      expect(maylecorLayerProgress(key, 2)).toBe(1);
    }
  });
});
