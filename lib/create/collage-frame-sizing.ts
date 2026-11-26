import { resizeCreativeBounds, type CreativeBounds, type ResizeHandle } from "@/lib/creative-core/resize";
import { visibleCollageBounds } from "./collage-frame-geometry";

/** Independent frame axes retain the opposite *visible* edge, even after crop/rotation. */
export function resizeCollageFrame(source: CreativeBounds, startScale: number, crop: number, handle: ResizeHandle,
  delta: { x: number; y: number }, options: { fromCenter?: boolean; keepRatio?: boolean; minimumScale?: number; positionBounds?: { minX: number; maxX: number; minY: number; maxY: number } } = {}) {
  if (![source.x, source.y, source.width, source.height, source.rotation, startScale, delta.x, delta.y].every(Number.isFinite) || source.width <= 0 || source.height <= 0 || startScale <= 0) {
    return { source: { ...source }, scale: startScale, aspectRatio: source.width / source.height };
  }
  const visible = visibleCollageBounds(source, crop);
  const requested = resizeCreativeBounds(visible, handle, delta, { ...options, minSize: 8, maxSize: 100000 });
  const rx = Math.max((options.minimumScale ?? .15) / startScale, Math.min(3 / startScale, requested.width / visible.width));
  const width = source.width * rx;
  const height = Math.max(width / 50, Math.min(width / .02, source.height * (options.keepRatio ? rx : requested.height / visible.height)));
  const horizontal = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const vertical = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  const dx = options.fromCenter ? 0 : horizontal * (width - source.width) * visible.width / source.width / 2;
  const dy = options.fromCenter ? 0 : vertical * (height - source.height) * visible.height / source.height / 2;
  const angle = source.rotation * Math.PI / 180;
  const next = { x: source.x + source.width / 2 + Math.cos(angle) * dx - Math.sin(angle) * dy - width / 2,
    y: source.y + source.height / 2 + Math.sin(angle) * dx + Math.cos(angle) * dy - height / 2, width, height, rotation: source.rotation };
  let lower = 0, upper = 1;
  if (options.positionBounds) {
    for (const [origin, end, min, max] of [[source.x, next.x, options.positionBounds.minX, options.positionBounds.maxX], [source.y, next.y, options.positionBounds.minY, options.positionBounds.maxY]]) {
      const change = end - origin;
      if (Math.abs(change) < 1e-9) { if (origin < min || origin > max) upper = -1; continue; }
      const a = (min - origin) / change, b = (max - origin) / change;
      lower = Math.max(lower, Math.min(a, b)); upper = Math.min(upper, Math.max(a, b));
    }
  }
  if (lower > upper) return { source: { ...source }, scale: startScale, aspectRatio: source.width / source.height };
  const result = { ...next, x: source.x + (next.x - source.x) * upper, y: source.y + (next.y - source.y) * upper,
    width: source.width + (next.width - source.width) * upper, height: source.height + (next.height - source.height) * upper };
  return { source: result, scale: startScale * result.width / source.width, aspectRatio: result.width / result.height };
}
