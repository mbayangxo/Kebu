import type { CSSProperties } from "react";

/** Parse Tilda data-animate-sbs-opts for scroll / loop transforms. */
export type SbsKeyframe = {
  mx?: number;
  my?: number;
  sx?: number;
  sy?: number;
  op?: number;
  ro?: number;
  ti?: number;
};

export function parseSbsOpts(raw: string | null | undefined): SbsKeyframe[] {
  if (!raw) return [];
  try {
    const jsonish = raw.replace(/'/g, '"');
    const parsed = JSON.parse(jsonish) as SbsKeyframe[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Scroll-linked translate from first → last keyframe (Tilda fixed scroll). */
export function scrollOffsetFromOpts(opts: SbsKeyframe[], progress: number): { x: number; y: number; rotate: number } {
  if (opts.length < 2) return { x: 0, y: 0, rotate: 0 };
  const start = opts[0]!;
  const end = opts[opts.length - 1]!;
  const t = Math.min(Math.max(progress, 0), 1);
  return {
    x: ((end.mx ?? 0) - (start.mx ?? 0)) * t,
    y: ((end.my ?? 0) - (start.my ?? 0)) * t,
    rotate: ((end.ro ?? 0) - (start.ro ?? 0)) * t,
  };
}

/** CSS declaration string → React style (desktop Tilda positions). */
export function parseTildaCss(css: string | null | undefined): CSSProperties {
  if (!css) return { position: "absolute" };
  const out: Record<string, string> = { position: "absolute" };
  for (const chunk of css.split(";")) {
    const colon = chunk.indexOf(":");
    if (colon < 0) continue;
    const key = chunk.slice(0, colon).trim();
    const value = chunk.slice(colon + 1).trim();
    if (!key || !value) continue;
    if (key.startsWith("--")) continue;
    const camel = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = value;
  }
  return out as CSSProperties;
}

export const HERO_LOOP_ANIM: Record<string, string> = {
  "1702905074759": "lb-wobble-rotate 2s ease-in-out infinite",
  "1702905074752": "lb-float-down 2s ease-in-out infinite",
  "1702905074754": "lb-float-up 2s ease-in-out infinite",
  "1702905074756": "lb-logo-spin 15s linear infinite",
};
