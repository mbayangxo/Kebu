import { describe, expect, it } from "vitest";
import { defaultCanvasDocument, canvasDocumentSchema, newLayerId } from "@/lib/studio/canvas-document";
import {
  buildTimelineClips,
  pageLocalTimeMs,
  timelineTotalMs,
  videoSourceTimeSec,
} from "@/lib/studio/timeline";
import { estimateTimelineDurationSeconds } from "@/lib/studio/motion-export";

describe("Studio S8b timeline", () => {
  it("builds sequential page clips from durationMs", () => {
    const doc = defaultCanvasDocument("instagram_story");
    doc.pages[0]!.durationMs = 3000;
    const page2 = {
      ...doc.pages[0]!,
      id: "pg_two",
      name: "Page 2",
      durationMs: 1500,
      layers: [],
    };
    const multi = { ...doc, pages: [doc.pages[0]!, page2] };
    const clips = buildTimelineClips(multi);
    expect(clips).toHaveLength(2);
    expect(clips[0]!.durationMs).toBe(3000);
    expect(clips[1]!.startMs).toBe(3000);
    expect(timelineTotalMs(multi)).toBe(4500);
    expect(estimateTimelineDurationSeconds(multi)).toBe(4.5);
  });

  it("resolves page-local time and video source seek", () => {
    const doc = defaultCanvasDocument("instagram_post");
    doc.pages[0]!.durationMs = 2000;
    const at = pageLocalTimeMs(doc, 500);
    expect(at?.localMs).toBe(500);
    expect(videoSourceTimeSec({ trimStartMs: 1000 }, 500)).toBe(1.5);
    expect(videoSourceTimeSec({ trimStartMs: 0, trimDurationMs: 400 }, 900)).toBe(0.4);
  });

  it("accepts durationMs and video trim on schema", () => {
    const doc = defaultCanvasDocument("flyer");
    const withVideo = {
      ...doc,
      pages: [
        {
          ...doc.pages[0]!,
          durationMs: 4000,
          layers: [
            {
              id: newLayerId(),
              type: "video" as const,
              name: "Clip",
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              rotation: 0,
              opacity: 1,
              locked: false,
              videoUrl: "https://example.com/a.mp4",
              trimStartMs: 250,
              trimDurationMs: 3000,
            },
          ],
        },
      ],
    };
    expect(canvasDocumentSchema.safeParse(withVideo).success).toBe(true);
  });
});
