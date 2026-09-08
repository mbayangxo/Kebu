import { describe, expect, it } from "vitest";
import {
  analyzeBeatsFromSamples,
  snapTimeToBeat,
} from "@/lib/studio/music-analysis";
import { canvasDocumentSchema, defaultCanvasDocument } from "@/lib/studio/canvas-document";

/** Synthetic click-track at 120 BPM (0.5s period). */
function clickTrack(sampleRate: number, seconds: number, bpm: number): Float32Array {
  const n = Math.floor(sampleRate * seconds);
  const out = new Float32Array(n);
  const period = sampleRate * (60 / bpm);
  for (let i = 0; i < n; i++) {
    const phase = i % period;
    if (phase < sampleRate * 0.01) {
      out[i] = Math.sin((phase / (sampleRate * 0.01)) * Math.PI) * 0.9;
    }
  }
  return out;
}

describe("Studio S8c-lite music analysis", () => {
  it("estimates BPM near a synthetic 120 BPM click track", () => {
    const sr = 22050;
    const samples = clickTrack(sr, 8, 120);
    const result = analyzeBeatsFromSamples(samples, sr);
    expect(result.durationMs).toBeGreaterThan(7000);
    expect(result.bpm).toBeGreaterThanOrEqual(100);
    expect(result.bpm).toBeLessThanOrEqual(140);
    expect(result.beatsMs.length).toBeGreaterThan(8);
  });

  it("snaps playhead to nearest beat within threshold", () => {
    const beats = [0, 500, 1000, 1500];
    expect(snapTimeToBeat(480, beats, 80).timeMs).toBe(500);
    expect(snapTimeToBeat(480, beats, 80).snapped).toBe(true);
    expect(snapTimeToBeat(200, beats, 50).snapped).toBe(false);
  });

  it("persists soundtrack on canvas schema", () => {
    const doc = defaultCanvasDocument("instagram_post");
    const withMusic = {
      ...doc,
      soundtrack: {
        url: "https://example.com/track.mp3",
        fileName: "track.mp3",
        durationMs: 8000,
        bpm: 120,
        beatsMs: [0, 500, 1000],
        snapToBeats: true,
        confidence: 0.8,
        analyzedAt: "2026-09-07T00:00:00.000Z",
      },
    };
    expect(canvasDocumentSchema.safeParse(withMusic).success).toBe(true);
  });
});
