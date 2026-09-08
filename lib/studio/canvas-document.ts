import { z } from "zod";

export const CANVAS_DOC_VERSION = 2 as const;

export const CANVAS_LAYER_TYPES = ["text", "rect", "ellipse", "image", "video"] as const;
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
  text: z.string().trim().max(500).optional(),
  fontSize: z.number().min(8).max(200).optional(),
  fontFamily: z.string().trim().max(80).optional(),
  fontWeight: z.string().trim().max(20).optional(),
  color: z.string().trim().max(40).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  fill: z.string().trim().max(40).optional(),
  stroke: z.string().trim().max(40).optional(),
  strokeWidth: z.number().min(0).max(40).optional(),
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
] as const;

export type StudioDesignType = (typeof STUDIO_DESIGN_TYPES)[number];

export function artboardSize(designType: StudioDesignType): { width: number; height: number } {
  switch (designType) {
    case "instagram_story":
    case "whatsapp_status":
      return { width: 1080, height: 1920 };
    case "instagram_post":
    case "social_square":
    case "facebook_post":
      return { width: 1080, height: 1080 };
    case "flyer":
      return { width: 816, height: 1056 };
    case "banner":
      return { width: 1500, height: 500 };
    case "business_card":
      return { width: 1050, height: 600 };
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
  patch: Partial<Pick<CanvasPage, "name" | "width" | "height" | "backgroundColor" | "layers" | "durationMs">>,
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
    layers: src.layers.map((l) => ({ ...l, id: newLayerId() })),
  };
  const pages = [...doc.pages];
  const idx = pages.findIndex((p) => p.id === pageId);
  pages.splice(idx + 1, 0, page);
  return { doc: mirrorPageToDocument({ ...doc, pages }, page), pageId: page.id };
}

export function deleteCanvasPage(doc: CanvasDocument, pageId: string): CanvasDocument | null {
  if (doc.pages.length <= 1) return null;
  const pages = doc.pages.filter((p) => p.id !== pageId);
  return mirrorPageToDocument({ ...doc, pages }, pages[0]!);
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

/** Align selected layers to each other (or artboard if single). */
export function alignLayers(
  layers: CanvasLayer[],
  selectedIds: string[],
  mode: AlignMode,
  artboard: { width: number; height: number },
): CanvasLayer[] {
  const ids = new Set(selectedIds);
  const selected = layers.filter((l) => ids.has(l.id) && !l.locked);
  if (!selected.length) return layers;

  const useArtboard = selected.length === 1;
  const minX = useArtboard ? 0 : Math.min(...selected.map((l) => l.x));
  const maxX = useArtboard ? artboard.width : Math.max(...selected.map((l) => l.x + l.width));
  const minY = useArtboard ? 0 : Math.min(...selected.map((l) => l.y));
  const maxY = useArtboard ? artboard.height : Math.max(...selected.map((l) => l.y + l.height));
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  if (mode === "distribute-h" && selected.length >= 3) {
    const sorted = [...selected].sort((a, b) => a.x - b.x);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const span = last.x + last.width - first.x;
    const totalW = sorted.reduce((s, l) => s + l.width, 0);
    const gap = (span - totalW) / (sorted.length - 1);
    let cursor = first.x;
    const pos = new Map<string, number>();
    for (const l of sorted) {
      pos.set(l.id, cursor);
      cursor += l.width + gap;
    }
    return layers.map((l) => (pos.has(l.id) ? { ...l, x: pos.get(l.id)! } : l));
  }

  if (mode === "distribute-v" && selected.length >= 3) {
    const sorted = [...selected].sort((a, b) => a.y - b.y);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const span = last.y + last.height - first.y;
    const totalH = sorted.reduce((s, l) => s + l.height, 0);
    const gap = (span - totalH) / (sorted.length - 1);
    let cursor = first.y;
    const pos = new Map<string, number>();
    for (const l of sorted) {
      pos.set(l.id, cursor);
      cursor += l.height + gap;
    }
    return layers.map((l) => (pos.has(l.id) ? { ...l, y: pos.get(l.id)! } : l));
  }

  return layers.map((l) => {
    if (!ids.has(l.id) || l.locked) return l;
    switch (mode) {
      case "left":
        return { ...l, x: minX };
      case "center-x":
        return { ...l, x: midX - l.width / 2 };
      case "right":
        return { ...l, x: maxX - l.width };
      case "top":
        return { ...l, y: minY };
      case "center-y":
        return { ...l, y: midY - l.height / 2 };
      case "bottom":
        return { ...l, y: maxY - l.height };
      default:
        return l;
    }
  });
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

export function defaultCanvasDocument(
  designType: StudioDesignType,
  opts?: { backgroundColor?: string; businessName?: string },
): CanvasDocument {
  const { width, height } = artboardSize(designType);
  const bg = opts?.backgroundColor ?? "#0F0D33";
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
      color: "#FFFFFF",
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
      color: "#FFFFFFAA",
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
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
    if (layer.type === "rect") {
      ctx.fillStyle = layer.fill ?? "#E05A2B";
      ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
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
      ctx.fillStyle = layer.fill ?? "#E05A2B";
      ctx.fill();
    } else if (layer.type === "text" && layer.text) {
      ctx.fillStyle = layer.color ?? "#FFFFFF";
      ctx.font = `${layer.fontWeight ?? "400"} ${layer.fontSize ?? 24}px ${layer.fontFamily ?? "system-ui"}`;
      ctx.textAlign = (layer.textAlign as CanvasTextAlign) ?? "left";
      const tx =
        layer.textAlign === "center"
          ? layer.x + layer.width / 2
          : layer.textAlign === "right"
            ? layer.x + layer.width
            : layer.x;
      ctx.fillText(layer.text, tx, layer.y + (layer.fontSize ?? 24));
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
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
    if (layer.type === "rect") {
      ctx.fillStyle = layer.fill ?? "#E05A2B";
      ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
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
      ctx.fillStyle = layer.fill ?? "#E05A2B";
      ctx.fill();
    } else if (layer.type === "text" && layer.text) {
      ctx.fillStyle = layer.color ?? "#FFFFFF";
      ctx.font = `${layer.fontWeight ?? "400"} ${layer.fontSize ?? 24}px ${layer.fontFamily ?? "system-ui"}`;
      ctx.textAlign = (layer.textAlign as CanvasTextAlign) ?? "left";
      const tx =
        layer.textAlign === "center"
          ? layer.x + layer.width / 2
          : layer.textAlign === "right"
            ? layer.x + layer.width
            : layer.x;
      ctx.fillText(layer.text, tx, layer.y + (layer.fontSize ?? 24));
    } else if (layer.type === "image" && layer.imageUrl) {
      const img = await loadImageElement(layer.imageUrl);
      if (img) {
        ctx.save();
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
        ctx.fillStyle = "#333333";
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
      }
    } else if (layer.type === "video" && layer.videoUrl) {
      const { videoSourceTimeSec } = await import("@/lib/studio/timeline");
      const timeSec = videoSourceTimeSec(layer, pageLocal);
      const frame = await loadVideoAtTime(layer.videoUrl, timeSec, cache);
      if (frame) {
        ctx.drawImage(frame, layer.x, layer.y, layer.width, layer.height);
      } else {
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
        ctx.fillStyle = "#FFFFFF88";
        ctx.font = "16px system-ui";
        ctx.fillText("Video", layer.x + 12, layer.y + 28);
      }
    }
    ctx.restore();
  }
  return canvas.toDataURL("image/png");
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

export function duplicateLayer(layer: CanvasLayer): CanvasLayer {
  return {
    ...layer,
    id: newLayerId(),
    name: `${layer.name} copy`.slice(0, 80),
    x: layer.x + 24,
    y: layer.y + 24,
  };
}
