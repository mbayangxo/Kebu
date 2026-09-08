import { scrollOffsetFromOpts, type SbsKeyframe } from "./legally-blonde-motion";

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

export function cutoutScrollTransform(key: string, progress: number, baseRotate = 0): string {
  const { x, y, rotate } = cutoutScrollOffset(key, progress);
  const parts: string[] = [];
  if (baseRotate) parts.push(`rotate(${baseRotate}deg)`);
  if (x || y) parts.push(`translate3d(${x}px, ${y}px, 0)`);
  if (rotate) parts.push(`rotate(${rotate}deg)`);
  return parts.join(" ");
}
