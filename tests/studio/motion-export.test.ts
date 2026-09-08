import { describe, expect, it } from "vitest";
import {
  canvasDocumentSchema,
  defaultCanvasDocument,
  newLayerId,
} from "@/lib/studio/canvas-document";
import { estimateMotionDurationSeconds } from "@/lib/studio/motion-export";

describe("Studio S8a video / motion", () => {
  it("accepts video layers with public URL", () => {
    const doc = defaultCanvasDocument("instagram_story");
    const withVideo = {
      ...doc,
      layers: [
        ...doc.layers,
        {
          id: newLayerId(),
          type: "video" as const,
          name: "Clip",
          x: 40,
          y: 80,
          width: 400,
          height: 700,
          rotation: 0,
          opacity: 1,
          locked: false,
          videoUrl: "https://example.com/clip.mp4",
        },
      ],
      pages: [
        {
          ...doc.pages[0]!,
          layers: [
            ...doc.pages[0]!.layers,
            {
              id: newLayerId(),
              type: "video" as const,
              name: "Clip",
              x: 40,
              y: 80,
              width: 400,
              height: 700,
              rotation: 0,
              opacity: 1,
              locked: false,
              videoUrl: "https://example.com/clip.mp4",
            },
          ],
        },
      ],
    };
    expect(canvasDocumentSchema.safeParse(withVideo).success).toBe(true);
  });

  it("estimates motion duration from page count", () => {
    expect(estimateMotionDurationSeconds(3, 2)).toBe(6);
    expect(estimateMotionDurationSeconds(1, 2)).toBe(2);
    expect(estimateMotionDurationSeconds(2, 0.25)).toBe(1); // clamped min 0.5 → 1s
  });
});
