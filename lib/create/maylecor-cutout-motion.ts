import { scrollOffsetFromOpts, type SbsKeyframe } from "./legally-blonde-motion";
import { maylecorLayerProgress } from "./collage-scroll-scene";

export const MAYLECOR_DEFAULT_LAYER_MOTIONS = {
  cutoutLeft: "bob",
  cutoutRight: "float",
  cutoutAccent: "bob",
  cutoutSparkle: "spin",
  titleLogo: "spin",
} as const;

/** City layer moves more on scroll; May figure stays forward (milder). */
export const MAYLECOR_SLOT_SCROLL_SBS: Record<string, SbsKeyframe[]> = {
  cutoutLeft: [
    { mx: 0, my: 0, ro: 0 },
    { mx: -12, my: -48, ro: -4 },
  ],
  cutoutRight: [
    { mx: 0, my: 0, ro: 0 },
    { mx: 24, my: 60, ro: 6 },
  ],
  cutoutAccent: [
    { mx: 0, my: 0, ro: 0 },
    { mx: 0, my: -72, ro: 0 },
  ],
  cutoutSparkle: [
    { mx: 0, my: 0, ro: 0 },
    { mx: 24, my: -72, ro: 15 },
  ],
  titleLogo: [
    { mx: 0, my: 0, ro: 0 },
    { mx: 0, my: -20, ro: 0 },
  ],
  macbook: [
    { mx: 0, my: 0, ro: 0 },
    { mx: 0, my: 80, ro: 0 },
  ],
};

export function cutoutScrollOffset(key: string, progress: number): { x: number; y: number; rotate: number } {
  const sbs = MAYLECOR_SLOT_SCROLL_SBS[key];
  if (!sbs?.length) return { x: 0, y: 0, rotate: 0 };
  return scrollOffsetFromOpts(sbs, progress);
}

export function cutoutScrollTransform(key: string, progress: number, baseRotate = 0, travel?: { x: number; y: number }): string {
  const boundedProgress = Math.max(0, Math.min(1, progress));
  const { x, y, rotate } = travel ? { x: travel.x * boundedProgress, y: travel.y * boundedProgress, rotate: 0 } : cutoutScrollOffset(key, boundedProgress);
  const parts: string[] = [];
  if (baseRotate) parts.push(`rotate(${baseRotate}deg)`);
  if (x || y) parts.push(`translate3d(${x}px, ${y}px, 0)`);
  if (rotate) parts.push(`rotate(${rotate}deg)`);
  return parts.join(" ");
}

/** Preserve authored endpoints, including explicit zero travel; scale design-space travel on phones. */
export function maylecorScrollTransform(key: string, progress: number, baseRotate = 0, travel?: { x: number; y: number }, width = 1200): string {
  const resolved = travel ?? (key === "titleLogo" ? { x: -Math.max(1200, width), y: 0 } : undefined);
  const scale = Math.min(1, Math.max(0, width) / 1200);
  const responsive = resolved ? { x: resolved.x * scale, y: resolved.y * scale } : undefined;
  return cutoutScrollTransform(key, maylecorLayerProgress(key, progress), baseRotate, responsive);
}

