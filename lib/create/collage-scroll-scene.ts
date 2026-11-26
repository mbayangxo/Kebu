/** Progress reaches one exactly when the sticky artboard releases, including tall artboards. */
export function collageSceneProgress(sceneTop: number, sceneHeight: number, pinHeight: number, viewportTop = 0): number {
  const travel = sceneHeight - pinHeight;
  if (travel <= 0) return 0;
  return Math.min(1, Math.max(0, (viewportTop - sceneTop) / travel));
}

/** Reference-inspired timing, not timecodes: the walkthrough records variable-speed scrolling. */
export function maylecorLayerProgress(key: string, progress: number): number {
  // Title clears first; skyline follows later and the figure remains in the foreground.
  const [start, end] = key === "titleLogo" ? [0.08, 0.7]
    : key === "macbook" ? [0.22, 0.96]
    : key === "cutoutAccent" ? [0.16, 0.9]
    : [0.12, 0.86];
  const t = Math.min(1, Math.max(0, (progress - start) / (end - start)));
  return t * t * (3 - 2 * t);
}
