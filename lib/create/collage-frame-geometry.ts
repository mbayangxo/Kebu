import { resizeCreativeBounds, type CreativeBounds } from "@/lib/creative-core/resize";

export type CollageCorner = "nw" | "ne" | "sw" | "se";

/** Symmetric crop retains the source's center and rotation pivot. */
export function visibleCollageBounds(source: CreativeBounds, cropPercent: number): CreativeBounds {
  const crop = Number.isFinite(cropPercent) ? Math.max(0, Math.min(45, cropPercent)) / 100 : 0;
  return { ...source, x: source.x + source.width * crop, y: source.y + source.height * crop,
    width: source.width * (1 - 2 * crop), height: source.height * (1 - 2 * crop) };
}

/** Scene-pixel resize; pass the rendered starting scale, including any historical width floor. */
export function resizeCollageSource(
  source: CreativeBounds, startScale: number, cropPercent: number, corner: CollageCorner,
  delta: { x: number; y: number },
  options: { fromCenter?: boolean; minimumScale?: number; maximumScale?: number } = {},
): { source: CreativeBounds; scale: number } {
  if (![source.x, source.y, source.width, source.height, source.rotation, startScale, delta.x, delta.y].every(Number.isFinite) || source.width <= 0 || source.height <= 0 || startScale <= 0) {
    return { source: { ...source }, scale: startScale };
  }
  const visible = visibleCollageBounds(source, cropPercent);
  const requested = resizeCreativeBounds(visible, corner, delta, {
    keepRatio: true, fromCenter: options.fromCenter, minSize: 0.000001, maxSize: 100000000,
  });
  const minimum = options.minimumScale ?? 0.15;
  const maximum = Math.max(minimum, options.maximumScale ?? 3);
  const scale = Math.max(minimum, Math.min(maximum, startScale * requested.width / visible.width));
  const ratio = scale / startScale;
  const width = source.width * ratio, height = source.height * ratio;
  const horizontal = corner.includes("e") ? 1 : -1, vertical = corner.includes("s") ? 1 : -1;
  const shiftX = options.fromCenter ? 0 : horizontal * visible.width * (ratio - 1) / 2;
  const shiftY = options.fromCenter ? 0 : vertical * visible.height * (ratio - 1) / 2;
  const angle = source.rotation * Math.PI / 180;
  const centerX = source.x + source.width / 2 + Math.cos(angle) * shiftX - Math.sin(angle) * shiftY;
  const centerY = source.y + source.height / 2 + Math.sin(angle) * shiftX + Math.cos(angle) * shiftY;
  return { source: { x: centerX - width / 2, y: centerY - height / 2, width, height, rotation: source.rotation }, scale };
}
