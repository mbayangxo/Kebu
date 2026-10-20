/** Geometry shared by creative editors; all coordinates are document pixels. */
export type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
export type CreativeBounds = { x: number; y: number; width: number; height: number; rotation: number };

/** Resize in the object's own axes, preserving the opposite anchor (or center). */
export function resizeCreativeBounds(
  original: CreativeBounds,
  handle: ResizeHandle,
  delta: { x: number; y: number },
  options: { keepRatio?: boolean; fromCenter?: boolean; minSize?: number; maxSize?: number } = {},
): CreativeBounds {
  if (![original.x, original.y, original.width, original.height, original.rotation, delta.x, delta.y].every(Number.isFinite) || original.width <= 0 || original.height <= 0) return { ...original };
  const angle = original.rotation * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
  const localX = cos * delta.x + sin * delta.y, localY = -sin * delta.x + cos * delta.y;
  const horizontal = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const vertical = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  const min = options.minSize ?? 24, max = options.maxSize ?? 4000;
  const multiplier = options.fromCenter ? 2 : 1;
  const clamp = (value: number) => Math.max(min, Math.min(max, value));
  let width = horizontal ? clamp(original.width + horizontal * localX * multiplier) : original.width;
  let height = vertical ? clamp(original.height + vertical * localY * multiplier) : original.height;
  if (options.keepRatio) {
    const changeX = horizontal ? horizontal * localX * multiplier / original.width : 0;
    const changeY = vertical ? vertical * localY * multiplier / original.height : 0;
    const change = Math.abs(changeX) >= Math.abs(changeY) ? changeX : changeY;
    const scale = Math.max(Math.max(min / original.width, min / original.height),
      Math.min(Math.min(max / original.width, max / original.height), 1 + change));
    // Clamp multiplication rounding as well (e.g. 4000.0000000000005), since
    // persisted document bounds are strict and must survive schema validation.
    width = clamp(original.width * scale);
    height = clamp(original.height * scale);
  }
  const shiftX = options.fromCenter ? 0 : horizontal * (width - original.width) / 2;
  const shiftY = options.fromCenter ? 0 : vertical * (height - original.height) / 2;
  return {
    x: original.x + original.width / 2 + cos * shiftX - sin * shiftY - width / 2,
    y: original.y + original.height / 2 + sin * shiftX + cos * shiftY - height / 2,
    width, height, rotation: original.rotation,
  };
}
