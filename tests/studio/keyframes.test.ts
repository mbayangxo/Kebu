import { describe, expect, it } from "vitest";
import { emptyStudioComposition, addAssetToComposition, addClipFromAsset } from "@/lib/studio/composition";
import {
  addTransition,
  applyAudioReactivePreset,
  clipTransformAtTime,
  interpolateKeyframes,
  transitionOpacityBoost,
  upsertKeyframe,
} from "@/lib/studio/keyframes";

function compositionWithOneClip() {
  let c = emptyStudioComposition({ width: 1080, height: 1920 });
  const trackId = c.tracks.find((t) => t.kind === "video")!.id;
  c = addAssetToComposition(c, {
    id: "as1",
    kind: "video",
    url: "https://example.com/a.mp4",
    fileName: "a.mp4",
    durationMs: 8000,
  });
  const placed = addClipFromAsset(c, "as1", { trackId, atMs: 0 });
  if ("error" in placed) throw new Error(placed.error);
  return { c: placed, clipId: placed.clips[0]!.id };
}

describe("Studio keyframes — interpolation, easing, transforms (previously zero test coverage)", () => {
  it("returns the fallback when no keyframes exist for a property", () => {
    expect(interpolateKeyframes([], "clip1", "opacity", 500, 0.5)).toBe(0.5);
  });

  it("holds the first keyframe's value before it, and the last keyframe's value after it", () => {
    const kfs = [
      { id: "k1", clipId: "clip1", property: "opacity" as const, timeMs: 1000, value: 0.2, easing: "linear" as const },
      { id: "k2", clipId: "clip1", property: "opacity" as const, timeMs: 2000, value: 0.9, easing: "linear" as const },
    ];
    expect(interpolateKeyframes(kfs, "clip1", "opacity", 0, 0)).toBe(0.2);
    expect(interpolateKeyframes(kfs, "clip1", "opacity", 3000, 0)).toBe(0.9);
  });

  it("interpolates linearly between two keyframes", () => {
    const kfs = [
      { id: "k1", clipId: "clip1", property: "x" as const, timeMs: 0, value: 0, easing: "linear" as const },
      { id: "k2", clipId: "clip1", property: "x" as const, timeMs: 1000, value: 100, easing: "linear" as const },
    ];
    expect(interpolateKeyframes(kfs, "clip1", "x", 500, 0)).toBeCloseTo(50, 5);
  });

  it("ease_in starts slow (below the linear midpoint before the halfway point)", () => {
    const kfs = [
      { id: "k1", clipId: "clip1", property: "scale" as const, timeMs: 0, value: 0, easing: "linear" as const },
      { id: "k2", clipId: "clip1", property: "scale" as const, timeMs: 1000, value: 100, easing: "ease_in" as const },
    ];
    expect(interpolateKeyframes(kfs, "clip1", "scale", 250, 0)).toBeLessThan(25);
  });

  it("ease_out starts fast (above the linear midpoint before the halfway point)", () => {
    const kfs = [
      { id: "k1", clipId: "clip1", property: "scale" as const, timeMs: 0, value: 0, easing: "linear" as const },
      { id: "k2", clipId: "clip1", property: "scale" as const, timeMs: 1000, value: 100, easing: "ease_out" as const },
    ];
    expect(interpolateKeyframes(kfs, "clip1", "scale", 250, 0)).toBeGreaterThan(25);
  });

  it("ignores keyframes belonging to a different clip or a different property", () => {
    const kfs = [
      { id: "k1", clipId: "other-clip", property: "opacity" as const, timeMs: 0, value: 1, easing: "linear" as const },
      { id: "k2", clipId: "clip1", property: "x" as const, timeMs: 0, value: 999, easing: "linear" as const },
    ];
    expect(interpolateKeyframes(kfs, "clip1", "opacity", 500, 0.5)).toBe(0.5);
  });

  describe("upsertKeyframe", () => {
    it("rejects a keyframe on a clip that doesn't exist in the composition", () => {
      const { c } = compositionWithOneClip();
      const result = upsertKeyframe(c, { clipId: "nope", property: "opacity", timeMs: 0, value: 1 });
      expect(result).toEqual({ error: "Clip not found." });
    });

    it("adds a new keyframe, then updates it in place on a second call at the same time", () => {
      const { c, clipId } = compositionWithOneClip();
      const first = upsertKeyframe(c, { clipId, property: "opacity", timeMs: 500, value: 0.5 });
      expect("error" in first).toBe(false);
      if ("error" in first) return;
      expect(first.keyframes).toHaveLength(1);

      const second = upsertKeyframe(first, { clipId, property: "opacity", timeMs: 500, value: 0.9 });
      expect("error" in second).toBe(false);
      if ("error" in second) return;
      // Same clip/property/time replaces the row rather than duplicating it.
      expect(second.keyframes).toHaveLength(1);
      expect(second.keyframes[0]!.value).toBe(0.9);
    });

    it("clamps a negative timeMs to zero", () => {
      const { c, clipId } = compositionWithOneClip();
      const next = upsertKeyframe(c, { clipId, property: "x", timeMs: -500, value: 10 });
      expect("error" in next).toBe(false);
      if ("error" in next) return;
      expect(next.keyframes[0]!.timeMs).toBe(0);
    });
  });

  describe("clipTransformAtTime", () => {
    it("is fully transparent and silent before a clip starts and after it ends", () => {
      const { c, clipId } = compositionWithOneClip();
      const clip = c.clips.find((cl) => cl.id === clipId)!;
      const before = clipTransformAtTime(c, clip, clip.startMs - 1);
      expect(before.opacity).toBe(0);
      expect(before.volume).toBe(0);
      const after = clipTransformAtTime(c, clip, clip.startMs + clip.durationMs);
      expect(after.opacity).toBe(0);
    });

    it("resolves keyframed opacity at a point inside the clip", () => {
      const { c, clipId } = compositionWithOneClip();
      const withKf = upsertKeyframe(c, { clipId, property: "opacity", timeMs: 0, value: 0 });
      expect("error" in withKf).toBe(false);
      if ("error" in withKf) return;
      const withKf2 = upsertKeyframe(withKf, { clipId, property: "opacity", timeMs: 2000, value: 1 });
      expect("error" in withKf2).toBe(false);
      if ("error" in withKf2) return;
      const clip = withKf2.clips.find((cl) => cl.id === clipId)!;
      const mid = clipTransformAtTime(withKf2, clip, clip.startMs + 1000);
      expect(mid.opacity).toBeCloseTo(0.5, 1);
    });

    it("applies fade-in by multiplying opacity/volume near the clip's start", () => {
      const { c, clipId } = compositionWithOneClip();
      const withFade = { ...c, clips: c.clips.map((cl) => (cl.id === clipId ? { ...cl, fadeInMs: 1000 } : cl)) };
      const clip = withFade.clips.find((cl) => cl.id === clipId)!;
      const quarterIn = clipTransformAtTime(withFade, clip, clip.startMs + 250);
      // 25% through a 1000ms fade-in: opacity should be roughly a quarter of full.
      expect(quarterIn.opacity).toBeCloseTo(0.25, 1);
    });

    it("clamps opacity to [0,1] and volume to [0,2] even if keyframe values overshoot", () => {
      const { c, clipId } = compositionWithOneClip();
      const withKf = upsertKeyframe(c, { clipId, property: "opacity", timeMs: 0, value: 5 });
      expect("error" in withKf).toBe(false);
      if ("error" in withKf) return;
      const clip = withKf.clips.find((cl) => cl.id === clipId)!;
      const xf = clipTransformAtTime(withKf, clip, clip.startMs);
      expect(xf.opacity).toBe(1);
    });
  });

  describe("addTransition / transitionOpacityBoost", () => {
    it("rejects a transition referencing a clip that doesn't exist", () => {
      const { c, clipId } = compositionWithOneClip();
      const result = addTransition(c, { fromClipId: clipId, toClipId: "nope" });
      expect(result).toEqual({ error: "Clips not found." });
    });

    it("returns full opacity (no boost needed) for a clip with no transition", () => {
      const { c, clipId } = compositionWithOneClip();
      expect(transitionOpacityBoost(c, clipId, 0)).toBe(1);
    });
  });

  describe("applyAudioReactivePreset", () => {
    it("refuses to bake a preset onto a clip with no soundtrack beats/energy", () => {
      const { c, clipId } = compositionWithOneClip();
      const result = applyAudioReactivePreset(c, clipId, "pulse_scale");
      expect(result).toEqual({ error: "Add a soundtrack with beats first." });
    });

    it("bakes real scale keyframes at each beat for pulse_scale", () => {
      const { c, clipId } = compositionWithOneClip();
      const withMusic = {
        ...c,
        music: {
          bpm: 120,
          beatsMs: [0, 500, 1000, 1500],
          downbeatsMs: [],
          sections: [],
          peaks: [],
          energyMs: [],
          energyValues: [],
        },
      };
      const result = applyAudioReactivePreset(withMusic, clipId, "pulse_scale");
      expect("error" in result).toBe(false);
      if ("error" in result) return;
      const scaleKfs = result.keyframes.filter((k) => k.clipId === clipId && k.property === "scale");
      // Two keyframes (up + settle) per beat inside the clip's duration.
      expect(scaleKfs.length).toBeGreaterThanOrEqual(4 * 2 - 1);
    });
  });
});
