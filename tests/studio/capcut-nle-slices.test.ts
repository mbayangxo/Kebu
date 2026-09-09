import { describe, expect, it } from "vitest";
import { emptyStudioComposition, addAssetToComposition } from "@/lib/studio/composition";
import { buildQuickEditMontage, quickEditSummary } from "@/lib/studio/quick-edit";
import { applyCaptionSegments, segmentsFromPlainTranscript } from "@/lib/studio/captions";
import { chromaDistance, cssFilterFromGrade, parseHexColor } from "@/lib/studio/clip-color";
import { nestProjectAsClip } from "@/lib/studio/nested-sequence";

describe("Quick Edit montage", () => {
  it("builds sequential clips from assets", () => {
    let c = emptyStudioComposition({ width: 1080, height: 1920 });
    c = addAssetToComposition(c, {
      id: "a1",
      kind: "video",
      url: "https://example.com/a.mp4",
      fileName: "a.mp4",
      durationMs: 8000,
    });
    c = addAssetToComposition(c, {
      id: "a2",
      kind: "image",
      url: "https://example.com/b.jpg",
      fileName: "b.jpg",
      durationMs: 3000,
    });
    const next = buildQuickEditMontage(c, {
      assetIds: ["a1", "a2"],
      clipDurationMs: 2000,
      replaceVideoTrack: true,
    });
    expect("error" in next).toBe(false);
    if ("error" in next) return;
    expect(next.editMode).toBe("quick_edit");
    const videoTrack = next.tracks.find((t) => t.kind === "video")!;
    const clips = next.clips.filter((cl) => cl.trackId === videoTrack.id);
    expect(clips).toHaveLength(2);
    expect(quickEditSummary(c, ["a1", "a2"], 2000).clipCount).toBe(2);
  });
});

describe("Captions", () => {
  it("applies transcript segments to caption track", () => {
    const c = emptyStudioComposition({ width: 1080, height: 1080 });
    const segs = segmentsFromPlainTranscript("Hello world. Second line.", 4000);
    expect(segs.length).toBeGreaterThanOrEqual(2);
    const next = applyCaptionSegments(c, segs);
    expect("error" in next).toBe(false);
    if ("error" in next) return;
    const capTrack = next.tracks.find((t) => t.kind === "caption")!;
    expect(next.clips.filter((cl) => cl.trackId === capTrack.id).length).toBe(segs.length);
    expect(next.clips.some((cl) => cl.captionText?.includes("Hello"))).toBe(true);
  });
});

describe("Color / chroma helpers", () => {
  it("builds css filters and chroma distance", () => {
    expect(cssFilterFromGrade({ brightness: 0.1, contrast: 0, saturation: -0.2 })).toContain("brightness");
    expect(parseHexColor("#00FF00")).toEqual({ r: 0, g: 255, b: 0 });
    expect(chromaDistance({ r: 0, g: 255, b: 0 }, { r: 0, g: 255, b: 0 })).toBe(0);
  });
});

describe("Nested sequences", () => {
  it("places a nested project clip on the host timeline", () => {
    const host = emptyStudioComposition({ width: 1080, height: 1920 });
    const nested = emptyStudioComposition({ width: 1080, height: 1920 });
    nested.clips.push({
      id: "n1",
      trackId: nested.tracks.find((t) => t.kind === "video")!.id,
      name: "Inner",
      sourceUrl: "https://example.com/inner.mp4",
      startMs: 0,
      durationMs: 5000,
      sourceInMs: 0,
      speed: 1,
      volume: 1,
      opacity: 1,
      fadeInMs: 0,
      fadeOutMs: 0,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
    });
    const next = nestProjectAsClip(host, {
      nestedProjectId: "00000000-0000-4000-8000-000000000099",
      nestedTitle: "B-roll pack",
      nestedComposition: nested,
      atMs: 0,
    });
    expect("error" in next).toBe(false);
    if ("error" in next) return;
    expect(next.clips.some((c) => c.nestedProjectId?.endsWith("099"))).toBe(true);
    expect(next.clips[0]?.name).toContain("Nested");
  });
});
