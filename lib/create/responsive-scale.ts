/** Scale a fixed design canvas into a container without overflowing (never upscale). */
export function fitDesignScale(containerWidth: number, designWidth: number): number {
  if (containerWidth <= 0 || designWidth <= 0) return 1;
  return Math.min(1, containerWidth / designWidth);
}

/** Height of the scaled frame after fit. */
export function fitDesignHeight(containerWidth: number, designWidth: number, designHeight: number): number {
  return Math.max(1, designHeight * fitDesignScale(containerWidth, designWidth));
}
