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
  options: { fromCenter?: boolean; minimumScale?: number; maximumScale?: number;
    positionBounds?: { minX: number; maxX: number; minY: number; maxY: number } } = {},
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
  const horizontal = corner.includes("e") ? 1 : -1, vertical = corner.includes("s") ? 1 : -1;
  const angle = source.rotation * Math.PI / 180;
  let lower = minimum / startScale, upper = maximum / startScale;
  if (options.positionBounds) {
    const dx = options.fromCenter ? 0 : horizontal * visible.width / 2;
    const dy = options.fromCenter ? 0 : vertical * visible.height / 2;
    const coefficients = [
      [source.x, Math.cos(angle) * dx - Math.sin(angle) * dy - source.width / 2, options.positionBounds.minX, options.positionBounds.maxX],
      [source.y, Math.sin(angle) * dx + Math.cos(angle) * dy - source.height / 2, options.positionBounds.minY, options.positionBounds.maxY],
    ];
    for (const [origin, coefficient, min, max] of coefficients) {
      if (Math.abs(coefficient) < 0.000000001) continue;
      const a = 1 + (min - origin) / coefficient, b = 1 + (max - origin) / coefficient;
      lower = Math.max(lower, Math.min(a, b)); upper = Math.min(upper, Math.max(a, b));
    }
  }
  if (lower > upper) return { source: { ...source }, scale: startScale };
  const ratio = Math.max(lower, Math.min(upper, requested.width / visible.width));
  const scale = startScale * ratio;
  const width = source.width * ratio, height = source.height * ratio;
  const shiftX = options.fromCenter ? 0 : horizontal * visible.width * (ratio - 1) / 2;
  const shiftY = options.fromCenter ? 0 : vertical * visible.height * (ratio - 1) / 2;
  const centerX = source.x + source.width / 2 + Math.cos(angle) * shiftX - Math.sin(angle) * shiftY;
  const centerY = source.y + source.height / 2 + Math.sin(angle) * shiftX + Math.cos(angle) * shiftY;
  return { source: { x: centerX - width / 2, y: centerY - height / 2, width, height, rotation: source.rotation }, scale };
}
