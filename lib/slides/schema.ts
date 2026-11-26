/**
 * Real data model for Slides (completion audit K061). Deliberately a leaner,
 * independent schema rather than importing Studio's canvas-document.ts
 * wholesale: that schema's extra fields (video trim, motion timeline,
 * soundtrack, brand-kit coaching) are Studio-specific concerns that don't
 * belong in a deck persisted to slide_bodies. The geometry primitives that
 * *are* genuinely shared (resize math) are imported directly from
 * lib/creative-core/resize.ts, which has no Studio-specific entanglement.
 */
import { z } from "zod";

export const SLIDE_LAYER_TYPES = ["text", "rect", "ellipse", "line", "image"] as const;
export type SlideLayerType = (typeof SLIDE_LAYER_TYPES)[number];

export const SLIDE_TRANSITIONS = ["cut", "fade", "dissolve", "slide"] as const;
export type SlideTransition = (typeof SLIDE_TRANSITIONS)[number];

export const slideLayerSchema = z.object({
  id: z.string().trim().min(1).max(40),
  type: z.enum(SLIDE_LAYER_TYPES),
  x: z.number().min(-4000).max(8000),
  y: z.number().min(-4000).max(8000),
  width: z.number().min(1).max(8000),
  height: z.number().min(1).max(8000),
  rotation: z.number().min(-360).max(360).default(0),
  opacity: z.number().min(0).max(1).default(1),
  // text
  text: z.string().max(2000).optional(),
  fontSize: z.number().min(6).max(400).optional(),
  fontFamily: z.string().trim().max(80).optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  fontStyle: z.enum(["normal", "italic"]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  color: z.string().trim().max(40).optional(),
  // shapes (rect/ellipse/line)
  fill: z.string().trim().max(40).optional(),
  stroke: z.string().trim().max(40).optional(),
  strokeWidth: z.number().min(0).max(80).optional(),
  cornerRadius: z.number().min(0).max(2000).optional(),
  // image -- https only; anything else (javascript:, data:, file:) is rejected
  // at the schema boundary rather than relying on every downstream consumer
  // (editor render, PDF export fetch) to re-check the scheme itself.
  imageUrl: z.union([z.literal(""), z.string().trim().max(1000).refine((v) => /^https:\/\/[^\s]+$/i.test(v), "imageUrl must be an https URL")]).optional(),
});
export type SlideLayer = z.infer<typeof slideLayerSchema>;

export const slideSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().max(80).default("Slide"),
  backgroundColor: z.string().trim().max(40).default("#FFFFFF"),
  layers: z.array(slideLayerSchema).max(80).default([]),
  transitionKind: z.enum(SLIDE_TRANSITIONS).default("fade"),
  transitionDurationMs: z.number().int().min(0).max(3000).default(400),
});
export type Slide = z.infer<typeof slideSchema>;

export const DEFAULT_DECK_WIDTH = 1920;
export const DEFAULT_DECK_HEIGHT = 1080;

export const deckPatchSchema = z.object({
  slides: z.array(slideSchema).min(1).max(200),
  width: z.number().int().min(200).max(4096).optional(),
  height: z.number().int().min(200).max(4096).optional(),
});
export type DeckPatch = z.infer<typeof deckPatchSchema>;

export function blankSlide(id: string, name = "Slide"): Slide {
  return { id, name, backgroundColor: "#FFFFFF", layers: [], transitionKind: "fade", transitionDurationMs: 400 };
}

export function blankLayer(id: string, type: SlideLayerType, center: { x: number; y: number }): SlideLayer {
  const base = { id, type, rotation: 0, opacity: 1 } as const;
  if (type === "text") {
    return { ...base, x: center.x - 300, y: center.y - 60, width: 600, height: 120, text: "Text", fontSize: 48, fontFamily: "sans-serif", fontWeight: "normal", fontStyle: "normal", textAlign: "left", color: "#111111" };
  }
  if (type === "line") {
    return { ...base, x: center.x - 200, y: center.y, width: 400, height: 2, stroke: "#111111", strokeWidth: 4 };
  }
  if (type === "image") {
    return { ...base, x: center.x - 240, y: center.y - 160, width: 480, height: 320, imageUrl: "" };
  }
  return { ...base, x: center.x - 180, y: center.y - 120, width: 360, height: 240, fill: "#FF6A00", stroke: "", strokeWidth: 0, cornerRadius: type === "ellipse" ? 0 : 8 };
}

/** Validates a raw deck payload shape before persisting, mirroring Sheets' isValidCellsMap gate. */
export function isValidDeckPatch(value: unknown): value is DeckPatch {
  return deckPatchSchema.safeParse(value).success;
}

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function newSlideId(): string {
  return newId("s");
}

export function newLayerId(): string {
  return newId("l");
}
