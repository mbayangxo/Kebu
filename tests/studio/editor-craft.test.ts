import { describe, expect, it } from "vitest";
import {
  canvasDocumentSchema,
  defaultCanvasDocument,
  newLayerId,
  type CanvasLayer,
} from "@/lib/studio/canvas-document";
import {
  clipboardPayloadFromLayers,
  layersFromClipboardPayload,
  normalizeCrop,
  resizeCanvasDocument,
  snapLayerPosition,
  snapValue,
} from "@/lib/studio/editor-craft";

describe("S12b crop normalize", () => {
  it("defaults to full frame and clamps invalid windows", () => {
    expect(normalizeCrop({})).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    const tight = normalizeCrop({ cropX: 0.8, cropY: 0.8, cropW: 1, cropH: 1 });
    expect(tight.x).toBe(0.8);
    expect(tight.y).toBe(0.8);
    expect(tight.w).toBeCloseTo(0.2);
    expect(tight.h).toBeCloseTo(0.2);
  });

  it("accepts crop fields on image layers in schema", () => {
    const doc = defaultCanvasDocument("instagram_post");
    const layer = {
      id: newLayerId(),
      type: "image" as const,
      name: "Photo",
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 1,
      locked: false,
      imageUrl: "https://example.com/a.jpg",
      cropX: 0.1,
      cropY: 0.2,
      cropW: 0.5,
      cropH: 0.4,
    };
    const next = {
      ...doc,
      layers: [layer],
      pages: [{ ...doc.pages[0]!, layers: [layer] }],
    };
    expect(canvasDocumentSchema.safeParse(next).success).toBe(true);
  });
});

describe("S13 snap + clipboard", () => {
  it("snaps values within threshold", () => {
    expect(snapValue(102, [0, 100, 200], 8).value).toBe(100);
    expect(snapValue(102, [0, 100, 200], 1).snapped).toBe(false);
  });

  it("snaps layer edges to artboard center", () => {
    const layer = {
      id: "a",
      type: "rect" as const,
      name: "Box",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: "#000",
    };
    const out = snapLayerPosition(layer, 490, 0, [], new Set(["a"]), { width: 1080, height: 1080 }, 12);
    expect(out.x).toBe(490); // 490+0 left not near; center of layer at 540 when x=490? wait 490+50=540
    // left edge 490 — artboard center is 540; layer center = 490+50 = 540 → cx snap
    expect(out.guides.v).toBe(540);
  });

  it("round-trips clipboard payload with new ids", () => {
    const layer: CanvasLayer = {
      id: "orig",
      type: "text",
      name: "Hello",
      x: 10,
      y: 20,
      width: 100,
      height: 40,
      rotation: 0,
      opacity: 1,
      locked: false,
      text: "Hi",
      fontSize: 24,
      fontFamily: "Georgia",
      fontWeight: "700",
      color: "#000",
      textAlign: "left",
    };
    const raw = clipboardPayloadFromLayers([layer]);
    const pasted = layersFromClipboardPayload(raw);
    expect(pasted).toHaveLength(1);
    expect(pasted![0]!.id).not.toBe("orig");
    expect(pasted![0]!.x).toBe(34);
    expect(pasted![0]!.text).toBe("Hi");
  });
});

describe("S14 resize", () => {
  it("scales pages and layers to new artboard", () => {
    const doc = defaultCanvasDocument("instagram_post");
    const before = doc.pages[0]!;
    const layer = before.layers[0]!;
    const next = resizeCanvasDocument(doc, { width: before.width * 2, height: before.height * 2 });
    expect(next.width).toBe(before.width * 2);
    expect(next.height).toBe(before.height * 2);
    expect(next.pages[0]!.layers[0]!.x).toBeCloseTo(layer.x * 2);
    expect(next.pages[0]!.layers[0]!.width).toBeCloseTo(layer.width * 2);
  });

  it("resizes via design type preset", () => {
    const doc = defaultCanvasDocument("instagram_post");
    const next = resizeCanvasDocument(doc, { designType: "instagram_story" });
    expect(next.width).toBe(1080);
    expect(next.height).toBe(1920);
  });
});
