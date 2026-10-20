import { describe, expect, it } from "vitest";
import { canvasLayerSchema, emptyCanvasDocument } from "@/lib/studio/canvas-document";
import { studioNeedsTimeline } from "@/lib/studio/timeline";

describe("content-driven timeline visibility", () => {
  it("does not turn a static image/text design into a video editor", () => {
    const doc = emptyCanvasDocument({ width: 640, height: 640 });
    doc.pages[0]!.layers = [canvasLayerSchema.parse({ id: "text", type: "text", text: "Hello", x: 0, y: 0, width: 200, height: 50, animationPreset: "none" })];
    expect(studioNeedsTimeline(doc)).toBe(false);
  });
  it.each(["video", "framed video", "animation", "soundtrack", "page transition"])("opens time tools for %s", kind => {
    const doc = emptyCanvasDocument({ width: 640, height: 640 });
    const layer = canvasLayerSchema.parse({ id: "media", type: kind === "video" ? "video" : "frame", x: 0, y: 0, width: 200, height: 100 });
    if (kind === "framed video") layer.frameMediaKind = "video";
    if (kind === "animation") layer.animationPreset = "fade";
    if (kind === "soundtrack") doc.soundtrack = { url: "https://example.test/audio.wav", durationMs: 2000, bpm: null, beatsMs: [], snapToBeats: true };
    if (kind === "page transition") doc.pages[0]!.transitionKind = "dissolve";
    doc.pages[0]!.layers = [layer];
    expect(studioNeedsTimeline(doc)).toBe(true);
  });
});
