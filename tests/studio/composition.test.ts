import { describe, expect, it } from "vitest";
import {
  addAssetToComposition,
  addClipFromAsset,
  compileStoryboardToClips,
  emptyStudioComposition,
  everyNthBeat,
  parseStudioComposition,
  snapCompositionTimeToBeats,
  splitClipAt,
  studioCompositionSchema,
  updateClip,
} from "@/lib/studio/composition";

describe("Studio composition architecture", () => {
  it("creates empty composition with video + audio + music tracks", () => {
    const c = emptyStudioComposition({ width: 1080, height: 1920, editMode: "full_timeline" });
    expect(c.editMode).toBe("full_timeline");
    expect(c.tracks.filter((t) => t.kind === "video")).toHaveLength(2);
    expect(c.tracks.some((t) => t.kind === "audio")).toBe(true);
    expect(c.tracks.some((t) => t.kind === "music")).toBe(true);
    expect(c.tracks.some((t) => t.kind === "overlay")).toBe(true);
    expect(c.tracks.some((t) => t.kind === "caption")).toBe(true);
    expect(c.assets).toEqual([]);
    expect(studioCompositionSchema.safeParse(c).success).toBe(true);
  });

  it("compiles storyboard scenes into sequential clips", () => {
    let c = emptyStudioComposition({ width: 1080, height: 1080 });
    const videoTrackId = c.tracks.find((t) => t.kind === "video")!.id;
    c = {
      ...c,
      storyboard: [
        { id: "s1", name: "Open", durationMs: 2000, order: 0 },
        { id: "s2", name: "Product", durationMs: 3000, order: 1 },
        { id: "s3", name: "Logo", durationMs: 1500, order: 2 },
      ],
    };
    const next = compileStoryboardToClips(c, videoTrackId);
    expect(next.clips).toHaveLength(3);
    expect(next.clips[0]!.startMs).toBe(0);
    expect(next.clips[1]!.startMs).toBe(2000);
    expect(next.clips[2]!.startMs).toBe(5000);
  });

  it("adds asset, places clip, moves, splits", () => {
    let c = emptyStudioComposition({ width: 1080, height: 1920 });
    c = addAssetToComposition(c, {
      id: "as1",
      kind: "video",
      url: "https://example.com/a.mp4",
      fileName: "a.mp4",
      durationMs: 8000,
    });
    const placed = addClipFromAsset(c, "as1", { atMs: 0 });
    expect("error" in placed).toBe(false);
    if ("error" in placed) return;
    c = placed;
    expect(c.clips).toHaveLength(1);
    const moved = updateClip(c, c.clips[0]!.id, { startMs: 1000 });
    expect("error" in moved).toBe(false);
    if ("error" in moved) return;
    c = moved;
    const split = splitClipAt(c, c.clips[0]!.id, 3000);
    expect("error" in split).toBe(false);
    if ("error" in split) return;
    expect(split.clips).toHaveLength(2);
    expect(parseStudioComposition(split).clips).toHaveLength(2);
  });

  it("supports beat-aligned cut helpers", () => {
    const beats = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];
    expect(snapCompositionTimeToBeats(480, beats, 80)).toBe(500);
    expect(everyNthBeat(beats, 4)).toEqual([0, 2000]);
  });
});
