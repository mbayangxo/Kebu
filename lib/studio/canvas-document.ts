import { z } from "zod";
import { creativeTextGraphemes, wrapCreativeText } from "@/lib/creative-core/text-layout";
import { mediaFilterCss } from "@/lib/studio/media-adjustments";
import { layerMotionAtTime } from "@/lib/studio/layer-motion";
import { applyStudioCanvasFill, studioCanvasCompositeOperation } from "@/lib/studio/layer-paint";

export const CANVAS_DOC_VERSION = 2 as const;

export const CANVAS_LAYER_TYPES = [
  "text",
  "rect",
  "ellipse",
  "image",
  "video",
  "line",
  "icon",
  "frame",
] as const;
export type CanvasLayerType = (typeof CANVAS_LAYER_TYPES)[number];

export const canvasLayerSchema = z.object({
  id: z.string().trim().min(1).max(40),
  type: z.enum(CANVAS_LAYER_TYPES),
  name: z.string().trim().max(80).default("Layer"),
  x: z.number().min(-2000).max(4000),
  y: z.number().min(-2000).max(4000),
  width: z.number().min(1).max(4000),
  height: z.number().min(1).max(4000),
  rotation: z.number().min(-360).max(360).default(0),
  opacity: z.number().min(0).max(1).default(1),
  locked: z.boolean().optional().default(false),
  /** Shared id = group (move/align/delete together) */
  groupId: z.string().trim().max(40).nullable().optional(),
  text: z.string().max(500).optional(),
  fontSize: z.number().min(8).max(200).optional(),
  fontFamily: z.string().trim().max(80).optional(),
  fontWeight: z.string().trim().max(20).optional(),
  fontStyle: z.enum(["normal", "italic"]).optional(),
  color: z.string().trim().max(40).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  letterSpacing: z.number().min(-20).max(100).optional(),
  lineHeight: z.number().min(0.6).max(3).optional(),
  textDecoration: z.enum(["none", "underline", "line-through"]).optional(),
  textTransform: z.enum(["none", "uppercase", "lowercase"]).optional(),
  fill: z.string().trim().max(40).optional(),
  fillType: z.enum(["solid", "linear_gradient"]).optional(),
  gradientFrom: z.string().trim().max(40).optional(),
  gradientTo: z.string().trim().max(40).optional(),
  gradientAngle: z.number().min(-360).max(360).optional(),
  blendMode: z.enum(["normal","multiply","screen","overlay","darken","lighten","soft-light"]).optional(),
  stroke: z.string().trim().max(40).optional(),
  strokeWidth: z.number().min(0).max(40).optional(),
  cornerRadius: z.number().min(0).max(1000).optional(),
  shadowColor: z.string().trim().max(40).optional(),
  shadowBlur: z.number().min(0).max(200).optional(),
  shadowX: z.number().min(-200).max(200).optional(),
  shadowY: z.number().min(-200).max(200).optional(),
  imageUrl: z.union([z.literal(""), z.string().trim().url().max(500)]).optional(),
  /** Short clip URL (mp4/webm) — Studio S8a video layer */
  videoUrl: z.union([z.literal(""), z.string().trim().url().max(500)]).optional(),
  /** Timeline trim (S8b) — start offset inside the source clip */
  trimStartMs: z.number().min(0).max(600_000).optional(),
  /** Max length of this clip on the timeline; null = follow page duration */
  trimDurationMs: z.number().min(100).max(600_000).nullable().optional(),
  /** Image craft (S12) */
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
  objectFit: z.enum(["cover", "contain"]).optional(),
  /** Source crop window 0–1 (S12b) */
  cropX: z.number().min(0).max(1).optional(),
  cropY: z.number().min(0).max(1).optional(),
  cropW: z.number().min(0.05).max(1).optional(),
  cropH: z.number().min(0.05).max(1).optional(),
  /** Non-destructive image/video adjustments. Neutral = 1/1/1/0/0. */
  brightness: z.number().min(0).max(2).optional(),
  contrast: z.number().min(0).max(2).optional(),
  saturation: z.number().min(0).max(3).optional(),
  grayscale: z.number().min(0).max(1).optional(),
  blur: z.number().min(0).max(40).optional(),
  /** Custom inline SVG path for social/custom icons */
  iconSvgPath: z.string().trim().max(2000).optional(),
  iconViewBox: z.string().trim().max(40).optional(),
  /** Outline (border around the layer) */
  outlineWidth: z.number().min(0).max(40).optional(),
  /** Glow effect blur radius */
  glowBlur: z.number().min(0).max(200).optional(),
  /** Elements pack (S19) */
  iconKey: z.string().trim().max(40).optional(),
  frameStyle: z.enum(["corner", "rounded", "polaroid"]).optional(),
  frameMediaKind: z.enum(["image","video"]).nullable().optional(),
  frameMediaUrl: z.union([z.literal(""),z.string().trim().url().max(500)]).nullable().optional(),
  frameFocalX: z.number().min(0).max(1).optional(),
  frameFocalY: z.number().min(0).max(1).optional(),
  sourceAssetId: z.string().trim().max(80).nullable().optional(),
  /** Non-destructive entrance motion used by Studio preview and design→video conversion. */
  animationPreset: z.enum(["none","fade","fade_up","slide_left","slide_right","scale","pop"]).optional(),
  animationDurationMs: z.number().int().min(100).max(5000).optional(),
  animationDelayMs: z.number().int().min(0).max(10000).optional(),
});

export type CanvasLayer = z.infer<typeof canvasLayerSchema>;

export const canvasPageSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().max(80).default("Page"),
  width: z.number().int().min(200).max(4096),
  height: z.number().int().min(200).max(4096),
  backgroundColor: z.string().trim().max(40).default("#0F0D33"),
  layers: z.array(canvasLayerSchema).max(64).default([]),
  /** How long this page stays on the timeline (S8b) */
  durationMs: z.number().int().min(500).max(30_000).optional(),
  /** Transition into this page when played/exported as motion. */
  transitionKind: z.enum(["cut","fade","dissolve","slide"]).optional(),
  transitionDurationMs: z.number().int().min(0).max(3000).optional(),
});

export type CanvasPage = z.infer<typeof canvasPageSchema>;

/** Soundtrack + beat grid (S8c-lite) — persisted on the design canvas. */
export const canvasSoundtrackSchema = z.object({
  url: z.string().trim().url().max(500),
  fileName: z.string().trim().max(200).optional().nullable(),
  durationMs: z.number().int().min(100).max(600_000),
  bpm: z.number().min(40).max(220).nullable(),
  beatsMs: z.array(z.number().int().min(0).max(600_000)).max(800).default([]),
  snapToBeats: z.boolean().default(true),
  confidence: z.number().min(0).max(1).optional().nullable(),
  analyzedAt: z.string().trim().max(40).optional().nullable(),
});

export type CanvasSoundtrack = z.infer<typeof canvasSoundtrackSchema>;

/**
 * Multi-page canvas document (v2).
 * `width` / `height` / `backgroundColor` / `layers` mirror the first page for
 * backward-compatible readers; prefer page helpers for new code.
 */
export const canvasDocumentSchema = z.object({
  version: z.literal(CANVAS_DOC_VERSION),
  width: z.number().int().min(200).max(4096),
  height: z.number().int().min(200).max(4096),
  backgroundColor: z.string().trim().max(40).default("#0F0D33"),
  layers: z.array(canvasLayerSchema).max(64).default([]),
  pages: z.array(canvasPageSchema).min(1).max(20),
  soundtrack: canvasSoundtrackSchema.nullable().optional(),
  /** Create-for-me vs Teach-me coaching (persisted with the design) */
  coach: z
    .object({
      mode: z.enum(["create_for_me", "teach_me"]),
      lessons: z
        .array(
          z.object({
            id: z.string().trim().min(1).max(40),
            topic: z.enum([
              "layout",
              "color",
              "typography",
              "branding",
              "marketing",
              "hierarchy",
              "format",
            ]),
            title: z.string().trim().min(1).max(120),
            why: z.string().trim().min(1).max(500),
            tip: z.string().trim().max(300).optional(),
          }),
        )
        .max(12)
        .default([]),
      generatedAt: z.string().trim().max(40).optional().nullable(),
    })
    .nullable()
    .optional(),
});

export type CanvasDocument = z.infer<typeof canvasDocumentSchema>;

export const STUDIO_DESIGN_TYPES = [
  "poster",
  "social_square",
  "flyer",
  "instagram_post",
  "instagram_story",
  "facebook_post",
  "whatsapp_status",
  "banner",
  "business_card",
  "tiktok_video_cover",
  "linkedin_post",
  "linkedin_banner",
  "pinterest_pin",
  "twitter_post",
  "youtube_thumbnail",
  "youtube_banner",
  "menu",
  "pitch_deck_slide",
  "proposal",
  "resume",
  "invoice",
  "digital_planner",
  "spotify_banner",
  "book_cover",
  "invitation",
  "newsletter",
  "certificate_landscape",
  "email_header",
  "postcard",
  "lesson_plan",
] as const;

export type StudioDesignType = (typeof STUDIO_DESIGN_TYPES)[number];

export function artboardSize(designType: StudioDesignType): { width: number; height: number } {
  switch (designType) {
    case "instagram_story":
    case "whatsapp_status":
    case "tiktok_video_cover":
      return { width: 1080, height: 1920 };
    case "instagram_post":
    case "social_square":
    case "facebook_post":
    case "linkedin_post":
      return { width: 1080, height: 1080 };
    case "flyer":
    case "menu":
    case "proposal":
    case "resume":
    case "invoice":
    case "newsletter":
    case "lesson_plan":
      return { width: 816, height: 1056 };
    case "banner":
      return { width: 1500, height: 500 };
    case "business_card":
      return { width: 1050, height: 600 };
    case "pinterest_pin":
      return { width: 1000, height: 1500 };
    case "twitter_post":
      return { width: 1200, height: 675 };
    case "youtube_thumbnail":
      return { width: 1280, height: 720 };
    case "youtube_banner":
      return { width: 2560, height: 1440 };
    case "linkedin_banner":
      return { width: 1584, height: 396 };
    case "pitch_deck_slide":
      return { width: 1920, height: 1080 };
    case "digital_planner":
      return { width: 1536, height: 2048 };
    case "spotify_banner":
      // Spotify for Artists header image — 2660x1140, not a clean 16:9 despite some guides' claims.
      return { width: 2660, height: 1140 };
    case "book_cover":
      return { width: 1600, height: 2400 };
    case "invitation":
      return { width: 1200, height: 1680 };
    case "certificate_landscape":
      return { width: 1056, height: 816 };
    case "email_header":
      return { width: 600, height: 200 };
    case "postcard":
      return { width: 1200, height: 800 };
    case "poster":
    default:
      return { width: 900, height: 1200 };
  }
}

export function newLayerId(): string {
  return `ly_${Math.random().toString(36).slice(2, 10)}`;
}

export function newPageId(): string {
  return `pg_${Math.random().toString(36).slice(2, 10)}`;
}

export function newGroupId(): string {
  return `gp_${Math.random().toString(36).slice(2, 10)}`;
}

/** Sync top-level width/height/bg/layers from a page (for readers + export). */
export function mirrorPageToDocument(doc: CanvasDocument, page: CanvasPage): CanvasDocument {
  return canvasDocumentSchema.parse({
    ...doc,
    width: page.width,
    height: page.height,
    backgroundColor: page.backgroundColor,
    layers: page.layers,
    pages: doc.pages.map((p) => (p.id === page.id ? page : p)),
  });
}

export function getPage(doc: CanvasDocument, pageId: string | null | undefined): CanvasPage {
  const found = pageId ? doc.pages.find((p) => p.id === pageId) : undefined;
  return found ?? doc.pages[0]!;
}

export function updatePage(
  doc: CanvasDocument,
  pageId: string,
  patch: Partial<Pick<CanvasPage, "name" | "width" | "height" | "backgroundColor" | "layers" | "durationMs" | "transitionKind" | "transitionDurationMs">>,
): CanvasDocument {
  const pages = doc.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p));
  const active = pages.find((p) => p.id === pageId) ?? pages[0]!;
  return mirrorPageToDocument({ ...doc, pages }, active);
}

export function addCanvasPage(doc: CanvasDocument, name?: string): { doc: CanvasDocument; pageId: string } {
  const template = doc.pages[0]!;
  const page: CanvasPage = {
    id: newPageId(),
    name: (name ?? `Page ${doc.pages.length + 1}`).slice(0, 80),
    width: template.width,
    height: template.height,
    backgroundColor: template.backgroundColor,
    layers: [],
  };
  const pages = [...doc.pages, page];
  return { doc: mirrorPageToDocument({ ...doc, pages }, page), pageId: page.id };
}

export function duplicateCanvasPage(
  doc: CanvasDocument,
  pageId: string,
): { doc: CanvasDocument; pageId: string } | null {
  const src = doc.pages.find((p) => p.id === pageId);
  if (!src) return null;
  const page: CanvasPage = {
    ...src,
    id: newPageId(),
    name: `${src.name} copy`.slice(0, 80),
    layers: duplicateLayers(src.layers).map((layer, i) => ({
      ...layer, name: src.layers[i]!.name, x: src.layers[i]!.x, y: src.layers[i]!.y,
    })),
  };
  const pages = [...doc.pages];
  const idx = pages.findIndex((p) => p.id === pageId);
  pages.splice(idx + 1, 0, page);
  return { doc: mirrorPageToDocument({ ...doc, pages }, page), pageId: page.id };
}

/** Reject blank or oversized names without recording a spurious history change. */
export function renameCanvasPage(doc: CanvasDocument, pageId: string, name: string): CanvasDocument {
  const page = doc.pages.find((p) => p.id === pageId);
  const trimmed = name.trim();
  if (!page || !trimmed || trimmed.length > 80 || page.name === trimmed) return doc;
  return updatePage(doc, pageId, { name: trimmed });
}

/** Reordering preserves IDs, authored page content and the active-page mirror. */
export function moveCanvasPage(doc: CanvasDocument, pageId: string, toIndex: number): CanvasDocument {
  const fromIndex = doc.pages.findIndex((p) => p.id === pageId);
  if (fromIndex < 0 || !Number.isInteger(toIndex) || toIndex < 0 || toIndex >= doc.pages.length || fromIndex === toIndex) return doc;
  const pages = [...doc.pages];
  const [page] = pages.splice(fromIndex, 1);
  pages.splice(toIndex, 0, page!);
  return mirrorPageToDocument({ ...doc, pages }, page!);
}

export function deleteCanvasPage(doc: CanvasDocument, pageId: string, activePageId = pageId): CanvasDocument | null {
  const index = doc.pages.findIndex((p) => p.id === pageId);
  if (doc.pages.length <= 1 || index < 0) return null;
  const pages = doc.pages.filter((p) => p.id !== pageId);
  const active = pages.find((p) => p.id === activePageId) ?? pages[Math.min(index, pages.length - 1)]!;
  return mirrorPageToDocument({ ...doc, pages }, active);
}

export type AlignMode =
  | "left"
  | "center-x"
  | "right"
  | "top"
  | "center-y"
  | "bottom"
  | "distribute-h"
  | "distribute-v";

/** Axis-aligned footprint of the rotated frame, matching the browser's painted box. */
export function studioLayerBounds(layer: Pick<CanvasLayer, "x" | "y" | "width" | "height" | "rotation">) {
  const angle = layer.rotation * Math.PI / 180;
  const width = Math.abs(layer.width * Math.cos(angle)) + Math.abs(layer.height * Math.sin(angle));
  const height = Math.abs(layer.width * Math.sin(angle)) + Math.abs(layer.height * Math.cos(angle));
  const left = layer.x + (layer.width - width) / 2;
  const top = layer.y + (layer.height - height) / 2;
  return { left, top, right: left + width, bottom: top + height, width, height };
}

function alignmentUnits(layers: CanvasLayer[], selectedIds: string[]) {
  const ids = new Set(expandSelectionWithGroups(layers, selectedIds));
  const grouped = new Map<string, CanvasLayer[]>();
  for (const layer of layers) {
    if (!ids.has(layer.id) || layer.locked) continue;
    const key = layer.groupId ? `group:${layer.groupId}` : `layer:${layer.id}`;
    const members = grouped.get(key) ?? [];
    members.push(layer);
    grouped.set(key, members);
  }
  return [...grouped.values()].map(members => {
    const boxes = members.map(studioLayerBounds);
    const left = Math.min(...boxes.map(b => b.left)), right = Math.max(...boxes.map(b => b.right));
    const top = Math.min(...boxes.map(b => b.top)), bottom = Math.max(...boxes.map(b => b.bottom));
    return { members, left, right, top, bottom, width: right - left, height: bottom - top };
  });
}

/** A selected group is one arrange target, regardless of its member count. */
export function alignmentSelectionCount(layers: CanvasLayer[], selectedIds: string[]): number {
  return alignmentUnits(layers, selectedIds).length;
}

/** Align visible bounds; translate grouped members together without changing their geometry. */
export function alignLayers(
  layers: CanvasLayer[],
  selectedIds: string[],
  mode: AlignMode,
  artboard: { width: number; height: number },
): CanvasLayer[] {
  const units = alignmentUnits(layers, selectedIds);
  if (!units.length) return layers;
  const distribute = mode === "distribute-h" || mode === "distribute-v";
  if (distribute && units.length < 3) return layers;
  const single = units.length === 1;
  const minX = single ? 0 : Math.min(...units.map(u => u.left));
  const maxX = single ? artboard.width : Math.max(...units.map(u => u.right));
  const minY = single ? 0 : Math.min(...units.map(u => u.top));
  const maxY = single ? artboard.height : Math.max(...units.map(u => u.bottom));
  const moves = new Map<string, { x: number; y: number }>();
  const move = (unit: typeof units[number], dx: number, dy: number) => {
    for (const member of unit.members) moves.set(member.id, { x: member.x + dx, y: member.y + dy });
  };
  if (distribute) {
    const horizontal = mode === "distribute-h";
    const sorted = [...units].sort((a,b) => horizontal ? a.left - b.left : a.top - b.top);
    const total = sorted.reduce((sum,u) => sum + (horizontal ? u.width : u.height), 0);
    const gap = ((horizontal ? maxX-minX : maxY-minY) - total) / (sorted.length-1);
    let cursor = horizontal ? minX : minY;
    for (const unit of sorted) {
      move(unit, horizontal ? cursor-unit.left : 0, horizontal ? 0 : cursor-unit.top);
      cursor += (horizontal ? unit.width : unit.height) + gap;
    }
  } else {
    for (const unit of units) {
      switch (mode) {
        case "left": move(unit, minX-unit.left, 0); break;
        case "center-x": move(unit, (minX+maxX-unit.left-unit.right)/2, 0); break;
        case "right": move(unit, maxX-unit.right, 0); break;
        case "top": move(unit, 0, minY-unit.top); break;
        case "center-y": move(unit, 0, (minY+maxY-unit.top-unit.bottom)/2); break;
        case "bottom": move(unit, 0, maxY-unit.bottom); break;
      }
    }
  }
  let changed = false;
  const result = layers.map(layer => {
    const target = moves.get(layer.id);
    if (!target || (Math.abs(target.x-layer.x)<1e-9 && Math.abs(target.y-layer.y)<1e-9)) return layer;
    if (![target.x,target.y].every(n => Number.isFinite(n) && n>=-2000 && n<=4000)) {
      throw new Error("These objects would move outside the supported canvas range. Move them closer together and try again.");
    }
    changed = true;
    return { ...layer, ...target };
  });
  return changed ? result : layers;
}

export function groupLayers(layers: CanvasLayer[], selectedIds: string[]): CanvasLayer[] {
  const ids = selectedIds.filter((id) => layers.some((l) => l.id === id && !l.locked));
  if (ids.length < 2) return layers;
  const gid = newGroupId();
  const set = new Set(ids);
  return layers.map((l) => (set.has(l.id) ? { ...l, groupId: gid } : l));
}

export function ungroupLayers(layers: CanvasLayer[], selectedIds: string[]): CanvasLayer[] {
  const selected = layers.filter((l) => selectedIds.includes(l.id));
  const groupIds = new Set(selected.map((l) => l.groupId).filter(Boolean) as string[]);
  if (!groupIds.size) {
    return layers.map((l) => (selectedIds.includes(l.id) ? { ...l, groupId: null } : l));
  }
  return layers.map((l) => (l.groupId && groupIds.has(l.groupId) ? { ...l, groupId: null } : l));
}

/** Expand selection to full groups when any member is selected. */
export function expandSelectionWithGroups(layers: CanvasLayer[], selectedIds: string[]): string[] {
  const set = new Set(selectedIds);
  const groupIds = new Set(
    layers.filter((l) => set.has(l.id) && l.groupId).map((l) => l.groupId as string),
  );
  for (const l of layers) {
    if (l.groupId && groupIds.has(l.groupId)) set.add(l.id);
  }
  return [...set];
}

function pageFromLayers(
  width: number,
  height: number,
  backgroundColor: string,
  layers: CanvasLayer[],
  name = "Page 1",
): CanvasPage {
  return canvasPageSchema.parse({
    id: newPageId(),
    name,
    width,
    height,
    backgroundColor,
    layers,
  });
}

function defaultBgForDesignType(designType: StudioDesignType): string {
  switch (designType) {
    case "flyer":
    case "poster":
    case "business_card":
    case "menu":
    case "proposal":
    case "resume":
    case "invoice":
    case "pitch_deck_slide":
    case "digital_planner":
    case "newsletter":
    case "certificate_landscape":
    case "email_header":
    case "postcard":
    case "lesson_plan":
    case "book_cover":
    case "invitation":
      return "#FFFFFF";
    case "banner":
    case "youtube_banner":
    case "linkedin_banner":
    case "spotify_banner":
      return "#F8F4EF";
    case "instagram_post":
    case "instagram_story":
    case "whatsapp_status":
    case "facebook_post":
    case "social_square":
    case "tiktok_video_cover":
    case "linkedin_post":
    case "pinterest_pin":
    case "twitter_post":
    case "youtube_thumbnail":
    default:
      return "#0F0D33";
  }
}

export function defaultCanvasDocument(
  designType: StudioDesignType,
  opts?: { backgroundColor?: string; businessName?: string },
): CanvasDocument {
  const { width, height } = artboardSize(designType);
  const bg = opts?.backgroundColor ?? defaultBgForDesignType(designType);
  const business = opts?.businessName?.trim() || "My business";

  if (designType === "banner") {
    const layers: CanvasLayer[] = [
      {
        id: newLayerId(),
        type: "rect",
        name: "Accent band",
        x: 0,
        y: 0,
        width: 28,
        height,
        rotation: 0,
        opacity: 1,
        locked: false,
        fill: "#E05A2B",
        stroke: "",
        strokeWidth: 0,
      },
      {
        id: newLayerId(),
        type: "text",
        name: "Business",
        x: 56,
        y: height * 0.18,
        width: width * 0.5,
        height: 36,
        rotation: 0,
        opacity: 1,
        locked: false,
        text: business,
        fontSize: 18,
        fontFamily: "system-ui",
        fontWeight: "600",
        color: "#FFFFFFAA",
        textAlign: "left",
      },
      {
        id: newLayerId(),
        type: "text",
        name: "Headline",
        x: 56,
        y: height * 0.32,
        width: width * 0.55,
        height: 90,
        rotation: 0,
        opacity: 1,
        locked: false,
        text: "Shop the new collection",
        fontSize: 42,
        fontFamily: "Fraunces",
        fontWeight: "700",
        color: "#FFFFFF",
        textAlign: "left",
      },
      {
        id: newLayerId(),
        type: "rect",
        name: "CTA",
        x: width * 0.72,
        y: height * 0.4,
        width: 220,
        height: 56,
        rotation: 0,
        opacity: 1,
        locked: false,
        fill: "#E05A2B",
        stroke: "",
        strokeWidth: 0,
      },
      {
        id: newLayerId(),
        type: "text",
        name: "CTA label",
        x: width * 0.72,
        y: height * 0.4,
        width: 220,
        height: 56,
        rotation: 0,
        opacity: 1,
        locked: false,
        text: "Order now",
        fontSize: 16,
        fontFamily: "system-ui",
        fontWeight: "700",
        color: "#FFFFFF",
        textAlign: "center",
      },
    ];
    const page = pageFromLayers(width, height, bg, layers);
    return canvasDocumentSchema.parse({
      version: CANVAS_DOC_VERSION,
      width,
      height,
      backgroundColor: bg,
      layers,
      pages: [page],
    });
  }

  if (designType === "business_card") {
    const layers: CanvasLayer[] = [
      {
        id: newLayerId(),
        type: "rect",
        name: "Accent panel",
        x: 0,
        y: 0,
        width: width * 0.32,
        height,
        rotation: 0,
        opacity: 1,
        locked: false,
        fill: "#E05A2B",
        stroke: "",
        strokeWidth: 0,
      },
      {
        id: newLayerId(),
        type: "text",
        name: "Business",
        x: width * 0.38,
        y: height * 0.28,
        width: width * 0.55,
        height: 48,
        rotation: 0,
        opacity: 1,
        locked: false,
        text: business,
        fontSize: 28,
        fontFamily: "Fraunces",
        fontWeight: "700",
        color: "#FFFFFF",
        textAlign: "left",
      },
      {
        id: newLayerId(),
        type: "text",
        name: "Headline",
        x: width * 0.38,
        y: height * 0.48,
        width: width * 0.55,
        height: 40,
        rotation: 0,
        opacity: 1,
        locked: false,
        text: "Founder · Dakar",
        fontSize: 16,
        fontFamily: "system-ui",
        fontWeight: "500",
        color: "#FFFFFFCC",
        textAlign: "left",
      },
      {
        id: newLayerId(),
        type: "text",
        name: "CTA label",
        x: width * 0.38,
        y: height * 0.72,
        width: width * 0.55,
        height: 32,
        rotation: 0,
        opacity: 1,
        locked: false,
        text: "hello@yourbrand.africa",
        fontSize: 14,
        fontFamily: "system-ui",
        fontWeight: "400",
        color: "#FFFFFFAA",
        textAlign: "left",
      },
    ];
    const page = pageFromLayers(width, height, bg, layers);
    return canvasDocumentSchema.parse({
      version: CANVAS_DOC_VERSION,
      width,
      height,
      backgroundColor: bg,
      layers,
      pages: [page],
    });
  }

  const lightBg = bg === "#FFFFFF" || bg === "#F8F4EF" || bg.toLowerCase() === "#fff";
  const headlineColor = lightBg ? "#111111" : "#FFFFFF";
  const subColor = lightBg ? "#555555" : "#FFFFFFAA";

  const layers: CanvasLayer[] = [
    {
      id: newLayerId(),
      type: "text",
      name: "Headline",
      x: width * 0.08,
      y: height * 0.12,
      width: width * 0.84,
      height: 120,
      rotation: 0,
      opacity: 1,
      locked: false,
      text: "Grand opening",
      fontSize: designType.includes("story") ? 56 : 48,
      fontFamily: "Fraunces",
      fontWeight: "700",
      color: headlineColor,
      textAlign: "left",
    },
    {
      id: newLayerId(),
      type: "text",
      name: "Business",
      x: width * 0.08,
      y: height * 0.08,
      width: width * 0.84,
      height: 40,
      rotation: 0,
      opacity: 1,
      locked: false,
      text: business,
      fontSize: 18,
      fontFamily: "system-ui",
      fontWeight: "600",
      color: subColor,
      textAlign: "left",
    },
    {
      id: newLayerId(),
      type: "rect",
      name: "CTA",
      x: width * 0.08,
      y: height * 0.78,
      width: 220,
      height: 52,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: "#E05A2B",
      stroke: "",
      strokeWidth: 0,
    },
    {
      id: newLayerId(),
      type: "text",
      name: "CTA label",
      x: width * 0.08,
      y: height * 0.78,
      width: 220,
      height: 52,
      rotation: 0,
      opacity: 1,
      locked: false,
      text: "Order now",
      fontSize: 16,
      fontFamily: "system-ui",
      fontWeight: "700",
      color: "#FFFFFF",
      textAlign: "center",
    },
  ];
  const page = pageFromLayers(width, height, bg, layers);
  return canvasDocumentSchema.parse({
    version: CANVAS_DOC_VERSION,
    width,
    height,
    backgroundColor: bg,
    layers,
    pages: [page],
  });
}

/** Accept legacy flat / v1 / v2 documents → always v2. */
/** Backward-compatible blank-square helper retained for older Studio callers/tests. */
export function emptyCanvasDocument(opts: { width: number; height: number }): CanvasDocument {
  const doc = defaultCanvasDocument("instagram_post");
  const page = doc.pages[0]!;
  return canvasDocumentSchema.parse({
    ...doc,
    width: opts.width,
    height: opts.height,
    pages: [{ ...page, width: opts.width, height: opts.height }],
  });
}

export function parseCanvasDocument(
  raw: unknown,
  designType: StudioDesignType = "poster",
): CanvasDocument {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;

    if (obj.version === 2 && Array.isArray(obj.pages)) {
      const parsed = canvasDocumentSchema.safeParse(obj);
      if (parsed.success) {
        const page = parsed.data.pages[0]!;
        return mirrorPageToDocument(parsed.data, page);
      }
    }

    if ((obj.version === 1 || obj.version === CANVAS_DOC_VERSION) && Array.isArray(obj.layers)) {
      const width = typeof obj.width === "number" ? obj.width : artboardSize(designType).width;
      const height = typeof obj.height === "number" ? obj.height : artboardSize(designType).height;
      const bg = typeof obj.backgroundColor === "string" ? obj.backgroundColor : "#0F0D33";
      const layersParse = z.array(canvasLayerSchema).safeParse(obj.layers);
      if (layersParse.success) {
        const page = pageFromLayers(width, height, bg, layersParse.data);
        return canvasDocumentSchema.parse({
          version: CANVAS_DOC_VERSION,
          width,
          height,
          backgroundColor: bg,
          layers: layersParse.data,
          pages: [page],
        });
      }
    }

    const legacy = obj as {
      headline?: string;
      subheadline?: string;
      cta?: string;
      accentColor?: string;
      backgroundColor?: string;
      imageUrl?: string;
      businessName?: string;
    };
    const doc = defaultCanvasDocument(designType, {
      backgroundColor: legacy.backgroundColor,
      businessName: legacy.businessName,
    });
    const layers = [...doc.layers];
    const headline = layers.find((l) => l.name === "Headline");
    if (headline && legacy.headline) headline.text = legacy.headline;
    const business = layers.find((l) => l.name === "Business");
    if (business && legacy.businessName) business.text = legacy.businessName;
    if (legacy.subheadline?.trim()) {
      layers.splice(2, 0, {
        id: newLayerId(),
        type: "text",
        name: "Subheadline",
        x: doc.width * 0.08,
        y: doc.height * 0.28,
        width: doc.width * 0.84,
        height: 80,
        rotation: 0,
        opacity: 1,
        locked: false,
        text: legacy.subheadline,
        fontSize: 20,
        fontFamily: "system-ui",
        fontWeight: "400",
        color: "#FFFFFFCC",
        textAlign: "left",
      });
    }
    if (legacy.imageUrl?.trim()) {
      layers.push({
        id: newLayerId(),
        type: "image",
        name: "Image",
        x: doc.width * 0.1,
        y: doc.height * 0.4,
        width: doc.width * 0.8,
        height: doc.height * 0.3,
        rotation: 0,
        opacity: 1,
        locked: false,
        imageUrl: legacy.imageUrl,
      });
    }
    const ctaRect = layers.find((l) => l.name === "CTA");
    if (ctaRect && legacy.accentColor) ctaRect.fill = legacy.accentColor;
    const ctaText = layers.find((l) => l.name === "CTA label");
    if (ctaText && legacy.cta) ctaText.text = legacy.cta;
    const page = pageFromLayers(doc.width, doc.height, doc.backgroundColor, layers);
    return canvasDocumentSchema.parse({
      version: CANVAS_DOC_VERSION,
      width: doc.width,
      height: doc.height,
      backgroundColor: doc.backgroundColor,
      layers,
      pages: [page],
    });
  }
  return defaultCanvasDocument(designType);
}

function paintLineLayer(ctx: CanvasRenderingContext2D, layer: CanvasLayer) {
  const h = Math.max(1, layer.height);
  ctx.fillStyle = layer.fill ?? layer.stroke ?? "#FFFFFF";
  ctx.fillRect(layer.x, layer.y + (layer.height - h) / 2, layer.width, h);
}

function paintFrameLayer(ctx: CanvasRenderingContext2D, layer: CanvasLayer) {
  const sw = layer.strokeWidth ?? 6;
  const stroke = layer.stroke ?? "#FFFFFF";
  const style = layer.frameStyle ?? "corner";
  if (style === "polaroid") {
    ctx.fillStyle = layer.fill ?? "#FFFFFF";
    ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
    const inset = Math.max(8, sw);
    const bottom = Math.max(28, layer.height * 0.18);
    ctx.fillStyle = "#E8E4DC";
    ctx.fillRect(layer.x + inset, layer.y + inset, layer.width - inset * 2, layer.height - inset - bottom);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, sw / 2);
    ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
    return;
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = sw;
  if (style === "rounded") {
    const r = Math.min(24, layer.width / 8, layer.height / 8);
    const x = layer.x + sw / 2;
    const y = layer.y + sw / 2;
    const w = layer.width - sw;
    const h = layer.height - sw;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.strokeRect(layer.x + sw / 2, layer.y + sw / 2, layer.width - sw, layer.height - sw);
  }
}

function paintIconLayer(ctx: CanvasRenderingContext2D, layer: CanvasLayer) {
  const glyph = layer.text || "★";
  ctx.fillStyle = layer.color ?? "#FFFFFF";
  const size = layer.fontSize ?? Math.min(layer.width, layer.height) * 0.75;
  ctx.font = `${layer.fontWeight ?? "700"} ${size}px ${layer.fontFamily ?? "system-ui"}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, layer.x + layer.width / 2, layer.y + layer.height / 2);
}

function applyLayerShadow(ctx: CanvasRenderingContext2D, layer: CanvasLayer) {
  ctx.shadowColor = layer.shadowColor ?? "rgba(0,0,0,0)";
  ctx.shadowBlur = layer.shadowBlur ?? 0;
  ctx.shadowOffsetX = layer.shadowX ?? 0;
  ctx.shadowOffsetY = layer.shadowY ?? 0;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function transformedLayerText(layer: CanvasLayer): string {
  const raw = layer.text ?? "";
  if (layer.textTransform === "uppercase") return raw.toUpperCase();
  if (layer.textTransform === "lowercase") return raw.toLowerCase();
  return raw;
}

function supportsNativeLetterSpacing(ctx: CanvasRenderingContext2D): boolean {
  return "letterSpacing" in ctx;
}

function textWidth(ctx: CanvasRenderingContext2D, text: string, letterSpacing: number): number {
  if (!text) return 0;
  if (supportsNativeLetterSpacing(ctx)) {
    ctx.letterSpacing = `${letterSpacing}px`;
    return ctx.measureText(text).width;
  }
  return ctx.measureText(text).width + Math.max(0, creativeTextGraphemes(text).length - 1) * letterSpacing;
}

function paintTextRun(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
) {
  if (supportsNativeLetterSpacing(ctx)) {
    ctx.letterSpacing = `${letterSpacing}px`;
    ctx.fillText(text, x, y);
    return;
  }
  if (!letterSpacing) {
    ctx.fillText(text, x, y);
    return;
  }
  let cursor = x;
  for (const char of creativeTextGraphemes(text)) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + letterSpacing;
  }
}

function paintTextLayer(ctx: CanvasRenderingContext2D, layer: CanvasLayer) {
  const text = transformedLayerText(layer);
  if (!text) return;
  const fontSize = layer.fontSize ?? 24;
  const lineHeight = fontSize * (layer.lineHeight ?? 1.2);
  const letterSpacing = layer.letterSpacing ?? 0;
  ctx.fillStyle = layer.color ?? "#FFFFFF";
  ctx.font = `${layer.fontStyle ?? "normal"} ${layer.fontWeight ?? "400"} ${fontSize}px ${layer.fontFamily ?? "system-ui"}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  const lines = wrapCreativeText(text, layer.width, value => textWidth(ctx, value, letterSpacing));

  let y = layer.y + fontSize;
  for (const line of lines) {
    if (y > layer.y + layer.height + lineHeight) break;
    const width = textWidth(ctx, line, letterSpacing);
    const x =
      layer.textAlign === "center"
        ? layer.x + (layer.width - width) / 2
        : layer.textAlign === "right"
          ? layer.x + layer.width - width
          : layer.x;
    paintTextRun(ctx, line, x, y, letterSpacing);

    if (layer.textDecoration && layer.textDecoration !== "none" && line) {
      const decorationY =
        layer.textDecoration === "underline"
          ? y + Math.max(1, fontSize * 0.08)
          : y - fontSize * 0.32;
      ctx.save();
      ctx.strokeStyle = layer.color ?? "#FFFFFF";
      ctx.lineWidth = Math.max(1, fontSize * 0.055);
      ctx.beginPath();
      ctx.moveTo(x, decorationY);
      ctx.lineTo(x + width, decorationY);
      ctx.stroke();
      ctx.restore();
    }
    y += lineHeight;
  }
}

export function exportCanvasToPngDataUrl(
  doc: CanvasDocument,
  scale = 1,
  pageId?: string,
): string | null {
  if (typeof document === "undefined") return null;
  const page = getPage(doc, pageId);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(page.width * scale);
  canvas.height = Math.round(page.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.fillStyle = page.backgroundColor;
  ctx.fillRect(0, 0, page.width, page.height);
  for (const layer of page.layers) {
    if (layer.opacity <= 0) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = studioCanvasCompositeOperation(layer.blendMode);
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
    applyLayerShadow(ctx, layer);
    const mediaFilter = layer.type === "image" || layer.type === "video" ? mediaFilterCss(layer) : undefined;
    if (mediaFilter) ctx.filter = mediaFilter;
    if (layer.type === "rect") {
      applyStudioCanvasFill(ctx, layer, { x: layer.x, y: layer.y, width: layer.width, height: layer.height });
      if ((layer.cornerRadius ?? 0) > 0) {
        roundedRectPath(ctx, layer.x, layer.y, layer.width, layer.height, layer.cornerRadius ?? 0);
        ctx.fill();
      } else {
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
      }
    } else if (layer.type === "line") {
      paintLineLayer(ctx, layer);
    } else if (layer.type === "frame") {
      paintFrameLayer(ctx, layer);
    } else if (layer.type === "icon") {
      paintIconLayer(ctx, layer);
    } else if (layer.type === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        layer.x + layer.width / 2,
        layer.y + layer.height / 2,
        layer.width / 2,
        layer.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      applyStudioCanvasFill(ctx, layer, { x: layer.x, y: layer.y, width: layer.width, height: layer.height });
      ctx.fill();
    } else if (layer.type === "text" && layer.text) {
      paintTextLayer(ctx, layer);
    }
    ctx.restore();
  }
  return canvas.toDataURL("image/png");
}

function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Full PNG / frame render including image + video layers (async). */
export async function exportCanvasToPngDataUrlAsync(
  doc: CanvasDocument,
  scale = 1,
  pageId?: string,
  opts?: {
    /** Time within the page clip — seeks video layers (S8b timeline) */
    pageLocalTimeMs?: number;
    videoCache?: Map<string, HTMLVideoElement>;
  },
): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const page = getPage(doc, pageId);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(page.width * scale);
  canvas.height = Math.round(page.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.fillStyle = page.backgroundColor;
  ctx.fillRect(0, 0, page.width, page.height);

  const pageLocal = opts?.pageLocalTimeMs ?? 0;
  const cache = opts?.videoCache;

  for (const layer of page.layers) {
    if (layer.opacity <= 0) continue;
    const motion = layerMotionAtTime(layer, pageLocal);
    if (motion.opacityMultiplier <= 0) continue;
    if ((layer.type === "image" && !layer.imageUrl) || (layer.type === "video" && !layer.videoUrl)) return null;
    ctx.save();
    ctx.globalAlpha = layer.opacity * motion.opacityMultiplier;
    ctx.globalCompositeOperation = studioCanvasCompositeOperation(layer.blendMode);
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    ctx.translate(cx + motion.translateX, cy + motion.translateY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale(motion.scale, motion.scale);
    ctx.translate(-cx, -cy);
    applyLayerShadow(ctx, layer);
    const mediaFilter = layer.type === "image" || layer.type === "video" ? mediaFilterCss(layer) : undefined;
    if (mediaFilter) ctx.filter = mediaFilter;
    if (layer.type === "rect") {
      applyStudioCanvasFill(ctx, layer, { x: layer.x, y: layer.y, width: layer.width, height: layer.height });
      if ((layer.cornerRadius ?? 0) > 0) {
        roundedRectPath(ctx, layer.x, layer.y, layer.width, layer.height, layer.cornerRadius ?? 0);
        ctx.fill();
      } else {
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
      }
    } else if (layer.type === "line") {
      paintLineLayer(ctx, layer);
    } else if (layer.type === "frame") {
      paintFrameLayer(ctx, layer);
    } else if (layer.type === "icon") {
      paintIconLayer(ctx, layer);
    } else if (layer.type === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        layer.x + layer.width / 2,
        layer.y + layer.height / 2,
        layer.width / 2,
        layer.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      applyStudioCanvasFill(ctx, layer, { x: layer.x, y: layer.y, width: layer.width, height: layer.height });
      ctx.fill();
    } else if (layer.type === "text" && layer.text) {
      paintTextLayer(ctx, layer);
    } else if (layer.type === "image" && layer.imageUrl) {
      const img = await loadImageElement(layer.imageUrl);
      if (img) {
        ctx.save();
        if ((layer.cornerRadius ?? 0) > 0) {
          roundedRectPath(ctx, layer.x, layer.y, layer.width, layer.height, layer.cornerRadius ?? 0);
          ctx.clip();
        }
        ctx.translate(cx, cy);
        ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
        ctx.translate(-cx, -cy);
        const fit = layer.objectFit ?? "cover";
        const crop = {
          x: layer.cropX ?? 0,
          y: layer.cropY ?? 0,
          w: layer.cropW ?? 1,
          h: layer.cropH ?? 1,
        };
        const sx = Math.max(0, Math.min(img.width - 1, crop.x * img.width));
        const sy = Math.max(0, Math.min(img.height - 1, crop.y * img.height));
        const sw = Math.max(1, Math.min(img.width - sx, crop.w * img.width));
        const sh = Math.max(1, Math.min(img.height - sy, crop.h * img.height));
        if (fit === "contain") {
          const s = Math.min(layer.width / sw, layer.height / sh);
          const w = sw * s;
          const h = sh * s;
          ctx.drawImage(
            img,
            sx,
            sy,
            sw,
            sh,
            layer.x + (layer.width - w) / 2,
            layer.y + (layer.height - h) / 2,
            w,
            h,
          );
        } else {
          ctx.drawImage(img, sx, sy, sw, sh, layer.x, layer.y, layer.width, layer.height);
        }
        ctx.restore();
      } else {
        ctx.restore();
        return null;
      }
    } else if (layer.type === "video" && layer.videoUrl) {
      const { videoSourceTimeSec } = await import("@/lib/studio/timeline");
      const timeSec = videoSourceTimeSec(layer, pageLocal);
      const frame = await loadVideoAtTime(layer.videoUrl, timeSec, cache);
      if (frame) {
        ctx.drawImage(frame, layer.x, layer.y, layer.width, layer.height);
      } else {
        ctx.restore();
        return null;
      }
    }
    ctx.restore();
  }
  try { return canvas.toDataURL("image/png"); } catch { return null; }
}

function loadVideoAtTime(
  url: string,
  timeSec: number,
  cache?: Map<string, HTMLVideoElement>,
): Promise<HTMLVideoElement | null> {
  return new Promise((resolve) => {
    const existing = cache?.get(url);
    const video =
      existing ??
      (() => {
        const v = document.createElement("video");
        v.crossOrigin = "anonymous";
        v.muted = true;
        v.playsInline = true;
        v.preload = "auto";
        return v;
      })();

    const finish = (ok: boolean) => {
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      if (ok && cache) cache.set(url, video);
      resolve(ok ? video : null);
    };

    const seek = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : timeSec;
      const t = Math.max(0, Math.min(timeSec, Math.max(0, duration - 0.05)));
      if (Math.abs(video.currentTime - t) < 0.04) {
        finish(true);
        return;
      }
      video.onseeked = () => finish(true);
      try {
        video.currentTime = t;
      } catch {
        finish(true);
      }
    };

    if (existing && video.readyState >= 2) {
      seek();
      return;
    }

    video.onerror = () => finish(false);
    video.onloadeddata = () => seek();
    if (!existing) video.src = url;
    else if (video.readyState >= 2) seek();
  });
}

/** @deprecated use loadVideoAtTime — kept for callers expecting first frame */
function loadVideoFrameElement(url: string): Promise<HTMLVideoElement | null> {
  return loadVideoAtTime(url, 0);
}

export function downloadPngDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  a.click();
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** One remapping per copy operation keeps copied groups independent of their sources. */
export function duplicateLayers(layers: CanvasLayer[]): CanvasLayer[] {
  const groups = new Map<string, string>();
  return layers.map((layer) => duplicateLayer(layer, groups));
}

export function duplicateLayer(layer: CanvasLayer, groups = new Map<string, string>()): CanvasLayer {
  if (layer.groupId && !groups.has(layer.groupId)) groups.set(layer.groupId, newGroupId());
  return {
    ...layer,
    id: newLayerId(),
    groupId: layer.groupId ? groups.get(layer.groupId)! : layer.groupId,
    name: `${layer.name} copy`.slice(0, 80),
    x: layer.x + 24,
    y: layer.y + 24,
  };
}
