import { describe, expect, it } from "vitest";
import {
  addAssetToComposition,
  addClipFromAsset,
  addTrack,
  compileStoryboardToClips,
  emptyStudioComposition,
  everyNthBeat,
  parseStudioComposition,
  removeTrack,
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

  describe("addTrack / removeTrack — the fixed-6-track gap", () => {
    it("adds a new track of the requested kind, ordered after the existing tracks", () => {
      const c = emptyStudioComposition({ width: 1080, height: 1920 });
      const maxOrder = Math.max(...c.tracks.map((t) => t.order));
      const next = addTrack(c, { kind: "video", name: "V3" });
      expect("error" in next).toBe(false);
      if ("error" in next) return;
      expect(next.tracks).toHaveLength(c.tracks.length + 1);
      const added = next.tracks.find((t) => t.name === "V3")!;
      expect(added.kind).toBe("video");
      expect(added.order).toBe(maxOrder + 1);
      expect(studioCompositionSchema.safeParse(next).success).toBe(true);
    });

    it("refuses to add a track past the 32-track schema limit", () => {
      let c = emptyStudioComposition({ width: 1080, height: 1920 });
      for (let i = c.tracks.length; i < 32; i++) {
        const next = addTrack(c, { kind: "overlay" });
        expect("error" in next).toBe(false);
        if ("error" in next) return;
        c = next;
      }
      expect(c.tracks).toHaveLength(32);
      const overflow = addTrack(c, { kind: "overlay" });
      expect(overflow).toEqual({ error: "Track limit reached (32)." });
    });

    it("removes an empty track", () => {
      const c = emptyStudioComposition({ width: 1080, height: 1920 });
      const trackId = c.tracks.find((t) => t.kind === "overlay")!.id;
      const next = removeTrack(c, trackId);
      expect("error" in next).toBe(false);
      if ("error" in next) return;
      expect(next.tracks.some((t) => t.id === trackId)).toBe(false);
    });

    it("refuses to remove a track that still holds a clip — no silent data loss", () => {
      let c = emptyStudioComposition({ width: 1080, height: 1920 });
      const videoTrackId = c.tracks.find((t) => t.kind === "video")!.id;
      c = addAssetToComposition(c, {
        id: "as1",
        kind: "video",
        url: "https://example.com/a.mp4",
        fileName: "a.mp4",
        durationMs: 8000,
      });
      const placed = addClipFromAsset(c, "as1", { trackId: videoTrackId, atMs: 0 });
      expect("error" in placed).toBe(false);
      if ("error" in placed) return;
      const result = removeTrack(placed, videoTrackId);
      expect(result).toEqual({ error: "Move or delete this track's clips before removing it." });
    });

    it("errors on an unknown track id", () => {
      const c = emptyStudioComposition({ width: 1080, height: 1920 });
      expect(removeTrack(c, "not-a-real-track")).toEqual({ error: "Track not found." });
    });
  });
});
