import type { CanvasDocument, CanvasLayer, CanvasPage, StudioDesignType } from "@/lib/studio/canvas-document";
import { artboardSize, mirrorPageToDocument, newLayerId, newGroupId, studioLayerBounds } from "@/lib/studio/canvas-document";

/** Normalized crop window into the source image (0–1). Full image = x0 y0 w1 h1. */
export function normalizeCrop(layer: {
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
}): { x: number; y: number; w: number; h: number } {
  const x = clamp01(layer.cropX ?? 0);
  const y = clamp01(layer.cropY ?? 0);
  let w = clamp01(layer.cropW ?? 1);
  let h = clamp01(layer.cropH ?? 1);
  w = Math.max(0.05, Math.min(w, 1 - x));
  h = Math.max(0.05, Math.min(h, 1 - y));
  return { x, y, w, h };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Marquee intersection, adapted from Claude's preserved Studio2048 selection.
 * Test the painted rotated rectangle, rather than its larger enclosing box.
 */
export function layersInRect(
  layers: CanvasLayer[],
  rect: { left: number; top: number; right: number; bottom: number },
): string[] {
  if (!Object.values(rect).every(Number.isFinite)) return [];
  const left = Math.min(rect.left, rect.right);
  const right = Math.max(rect.left, rect.right);
  const top = Math.min(rect.top, rect.bottom);
  const bottom = Math.max(rect.top, rect.bottom);
  if (right <= left || bottom <= top) return [];
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const halfWidth = (right - left) / 2;
  const halfHeight = (bottom - top) / 2;

  return layers.filter(layer => {
    if (layer.locked || layer.opacity <= 0 || layer.width <= 0 || layer.height <= 0) return false;
    if (![layer.x, layer.y, layer.width, layer.height, layer.rotation].every(Number.isFinite)) return false;
    const angle = layer.rotation * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const dx = layer.x + layer.width / 2 - centerX;
    const dy = layer.y + layer.height / 2 - centerY;
    // Separating axes: the marquee's two edges and the layer's two edges.
    const axes: [number, number][] = [[1, 0], [0, 1], [cos, sin], [-sin, cos]];
    return axes.every(([ax, ay]) => {
      const marqueeRadius = halfWidth * Math.abs(ax) + halfHeight * Math.abs(ay);
      const layerRadius = layer.width / 2 * Math.abs(ax * cos + ay * sin)
        + layer.height / 2 * Math.abs(-ax * sin + ay * cos);
      return Math.abs(dx * ax + dy * ay) < marqueeRadius + layerRadius;
    });
  }).map(layer => layer.id);
}

export function snapValue(value: number, targets: number[], threshold: number): { value: number; snapped: boolean; guide: number | null } {
  let best = value;
  let guide: number | null = null;
  let dist = threshold;
  for (const t of targets) {
    const d = Math.abs(value - t);
    if (d <= dist) {
      dist = d;
      best = t;
      guide = t;
    }
  }
  return { value: best, snapped: guide != null, guide };
}

export function layerSnapTargets(
  layers: CanvasLayer[],
  movingIds: Set<string>,
  artboard: { width: number; height: number },
): { x: number[]; y: number[] } {
  const x = [0, artboard.width / 2, artboard.width];
  const y = [0, artboard.height / 2, artboard.height];
  for (const l of layers) {
    if (movingIds.has(l.id) || l.opacity <= 0) continue;
    const bounds = studioLayerBounds(l);
    x.push(bounds.left, (bounds.left + bounds.right) / 2, bounds.right);
    y.push(bounds.top, (bounds.top + bounds.bottom) / 2, bounds.bottom);
  }
  return { x, y };
}

/** Choose the smallest correction across edges and center, retaining target order on ties. */
function snapAxis(anchors: number[], targets: number[], threshold: number) {
  let delta = 0;
  let guide: number | null = null;
  let distance = threshold;
  for (const anchor of anchors) {
    for (const target of targets) {
      const correction = target - anchor;
      if (Math.abs(correction) <= threshold && (guide === null || Math.abs(correction) < distance)) {
        delta = correction;
        guide = target;
        distance = Math.abs(correction);
      }
    }
  }
  return { delta, guide };
}

/** Snap the rotated footprint of the whole moving selection with one rigid translation. */
export function snapLayerPosition(
  layer: CanvasLayer,
  dx: number,
  dy: number,
  layers: CanvasLayer[],
  movingIds: Set<string>,
  artboard: { width: number; height: number },
  threshold = 8,
): { x: number; y: number; guides: { v: number | null; h: number | null } } {
  const moving = layers.filter(l => movingIds.has(l.id) && l.opacity > 0);
  const bounds = (moving.length ? moving : [layer]).map(studioLayerBounds);
  const left = Math.min(...bounds.map(b => b.left)) + dx;
  const right = Math.max(...bounds.map(b => b.right)) + dx;
  const top = Math.min(...bounds.map(b => b.top)) + dy;
  const bottom = Math.max(...bounds.map(b => b.bottom)) + dy;
  const { x: xs, y: ys } = layerSnapTargets(layers, movingIds, artboard);
  const x = snapAxis([left, right, (left + right) / 2], xs, threshold);
  const y = snapAxis([top, bottom, (top + bottom) / 2], ys, threshold);
  return { x: layer.x + dx + x.delta, y: layer.y + dy + y.delta, guides: { v: x.guide, h: y.guide } };
}

export function clipboardPayloadFromLayers(layers: CanvasLayer[]): string {
  return JSON.stringify({
    kebuStudioClipboard: 1,
    layers: layers.map((l) => ({ ...l, id: undefined })),
  });
}

export function layersFromClipboardPayload(raw: string): CanvasLayer[] | null {
  try {
    const data = JSON.parse(raw) as { kebuStudioClipboard?: number; layers?: Partial<CanvasLayer>[] };
    if (data.kebuStudioClipboard !== 1 || !Array.isArray(data.layers)) return null;
    const groups = new Map<string, string>();
    return data.layers.map((l) => {
      if (l.groupId && !groups.has(l.groupId)) groups.set(l.groupId, newGroupId());
      const layer = {
        ...l,
        id: newLayerId(),
        groupId: l.groupId ? groups.get(l.groupId)! : l.groupId,
        x: (l.x ?? 0) + 24,
        y: (l.y ?? 0) + 24,
        name: `${l.name ?? "Layer"}`.slice(0, 80),
      } as CanvasLayer;
      return layer;
    });
  } catch {
    return null;
  }
}

/** Scale all pages + layers to a new artboard size (S14). */
export function resizeCanvasDocument(
  doc: CanvasDocument,
  next: { width: number; height: number } | { designType: StudioDesignType },
): CanvasDocument {
  const size =
    "designType" in next ? artboardSize(next.designType) : { width: next.width, height: next.height };
  const width = Math.max(200, Math.min(4096, Math.round(size.width)));
  const height = Math.max(200, Math.min(4096, Math.round(size.height)));

  const pages: CanvasPage[] = doc.pages.map((page) => {
    const sx = width / page.width;
    const sy = height / page.height;
    const layers = page.layers.map((l) => ({
      ...l,
      x: l.x * sx,
      y: l.y * sy,
      width: Math.max(1, l.width * sx),
      height: Math.max(1, l.height * sy),
      fontSize: l.fontSize != null ? Math.max(8, Math.min(200, l.fontSize * Math.min(sx, sy))) : l.fontSize,
    }));
    return { ...page, width, height, layers };
  });

  return mirrorPageToDocument({ ...doc, pages, width, height }, pages[0]!);
}


export type StudioLayerBounds = { left: number; top: number; right: number; bottom: number; width: number; height: number };

export function selectionBounds(layers: CanvasLayer[], selectedIds: string[]): StudioLayerBounds | null {
  const ids = new Set(expandSelectionWithGroupsSafe(layers, selectedIds));
  const selected = layers.filter((layer) => ids.has(layer.id));
  if (!selected.length) return null;
  const left = Math.min(...selected.map((layer) => layer.x));
  const top = Math.min(...selected.map((layer) => layer.y));
  const right = Math.max(...selected.map((layer) => layer.x + layer.width));
  const bottom = Math.max(...selected.map((layer) => layer.y + layer.height));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function expandSelectionWithGroupsSafe(layers: CanvasLayer[], selectedIds: string[]): string[] {
  const ids = new Set(selectedIds);
  const groups = new Set(
    layers.filter((layer) => ids.has(layer.id) && layer.groupId).map((layer) => layer.groupId as string),
  );
  for (const layer of layers) if (layer.groupId && groups.has(layer.groupId)) ids.add(layer.id);
  return [...ids];
}

/** Move a selection without moving locked layers and keep the unlocked selection inside the artboard. */
export function nudgeLayersWithinArtboard(
  layers: CanvasLayer[],
  selectedIds: string[],
  dx: number,
  dy: number,
  artboard: { width: number; height: number },
): CanvasLayer[] {
  const expanded = new Set(expandSelectionWithGroupsSafe(layers, selectedIds));
  const movable = layers.filter((layer) => expanded.has(layer.id) && !layer.locked);
  if (!movable.length) return layers;
  const bounds = selectionBounds(movable, movable.map((layer) => layer.id));
  if (!bounds) return layers;
  const safeDx = Math.max(-bounds.left, Math.min(dx, artboard.width - bounds.right));
  const safeDy = Math.max(-bounds.top, Math.min(dy, artboard.height - bounds.bottom));
  return layers.map((layer) =>
    expanded.has(layer.id) && !layer.locked
      ? { ...layer, x: layer.x + safeDx, y: layer.y + safeDy }
      : layer,
  );
}
