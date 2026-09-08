import type { CanvasDocument, CanvasLayer, CanvasPage, StudioDesignType } from "@/lib/studio/canvas-document";
import { artboardSize, mirrorPageToDocument, newLayerId } from "@/lib/studio/canvas-document";

/** Normalized crop window into the source image (0–1). Full image = x0 y0 w1 h1. */
export function normalizeCrop(layer: {
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
}): { x: number; y: number; w: number; h: number } {
  let x = clamp01(layer.cropX ?? 0);
  let y = clamp01(layer.cropY ?? 0);
  let w = clamp01(layer.cropW ?? 1);
  let h = clamp01(layer.cropH ?? 1);
  w = Math.max(0.05, Math.min(w, 1 - x));
  h = Math.max(0.05, Math.min(h, 1 - y));
  return { x, y, w, h };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
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
    if (movingIds.has(l.id)) continue;
    x.push(l.x, l.x + l.width / 2, l.x + l.width);
    y.push(l.y, l.y + l.height / 2, l.y + l.height);
  }
  return { x, y };
}

/** Snap layer top-left so edges/centers align. */
export function snapLayerPosition(
  layer: CanvasLayer,
  dx: number,
  dy: number,
  layers: CanvasLayer[],
  movingIds: Set<string>,
  artboard: { width: number; height: number },
  threshold = 8,
): { x: number; y: number; guides: { v: number | null; h: number | null } } {
  const nx = layer.x + dx;
  const ny = layer.y + dy;
  const { x: xs, y: ys } = layerSnapTargets(layers, movingIds, artboard);

  const left = snapValue(nx, xs, threshold);
  const right = snapValue(nx + layer.width, xs, threshold);
  const cx = snapValue(nx + layer.width / 2, xs, threshold);
  let x = nx;
  let vGuide: number | null = null;
  if (left.snapped) {
    x = left.value;
    vGuide = left.guide;
  } else if (right.snapped) {
    x = right.value - layer.width;
    vGuide = right.guide;
  } else if (cx.snapped) {
    x = cx.value - layer.width / 2;
    vGuide = cx.guide;
  }

  const top = snapValue(ny, ys, threshold);
  const bottom = snapValue(ny + layer.height, ys, threshold);
  const cy = snapValue(ny + layer.height / 2, ys, threshold);
  let y = ny;
  let hGuide: number | null = null;
  if (top.snapped) {
    y = top.value;
    hGuide = top.guide;
  } else if (bottom.snapped) {
    y = bottom.value - layer.height;
    hGuide = bottom.guide;
  } else if (cy.snapped) {
    y = cy.value - layer.height / 2;
    hGuide = cy.guide;
  }

  return { x, y, guides: { v: vGuide, h: hGuide } };
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
    return data.layers.map((l) => {
      const layer = {
        ...l,
        id: newLayerId(),
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
