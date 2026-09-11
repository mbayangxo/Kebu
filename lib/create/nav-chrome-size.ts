/** Shared nav size options — scale bar smaller ↔ larger / full-bleed. */
export const NAV_SIZE_PRESETS = ["compact", "comfortable", "large", "fullscreen"] as const;
export type NavSizePreset = (typeof NAV_SIZE_PRESETS)[number];

export const NAV_LAYOUT_PRESETS = ["top", "side", "hamburger"] as const;
export type NavLayoutPreset = (typeof NAV_LAYOUT_PRESETS)[number];

export type NavChromeStyle = {
  /** Multiplier on type / logo / padding (0.7–2.2). */
  scale: number;
  size: NavSizePreset;
};

export function clampNavScale(raw: unknown, fallback = 1): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(2.2, Math.max(0.7, n));
}

export function parseNavSize(raw: unknown): NavSizePreset {
  if (raw === "compact" || raw === "comfortable" || raw === "large" || raw === "fullscreen") {
    return raw;
  }
  return "comfortable";
}

export function parseNavLayout(raw: unknown): NavLayoutPreset {
  if (raw === "side" || raw === "top" || raw === "hamburger") return raw;
  return "top";
}

/** CSS-ish tokens for header chrome from size + scale. */
export function navChromeMetrics(opts: { scale?: unknown; size?: unknown }): {
  scale: number;
  size: NavSizePreset;
  fontPx: number;
  brandPx: number;
  logoH: number;
  padY: number;
  padX: number;
  gap: number;
  maxWidth: string | undefined;
  tracking: string;
  /** Approximate side-rail width when navLayout is side. */
  sideWidth: number;
} {
  const scale = clampNavScale(opts.scale, 1);
  const size = parseNavSize(opts.size);
  const base =
    size === "compact"
      ? { font: 11, brand: 13, logo: 24, padY: 8, padX: 12, gap: 14, tracking: "0.14em", side: 120 }
      : size === "large"
        ? { font: 15, brand: 18, logo: 40, padY: 18, padX: 24, gap: 28, tracking: "0.22em", side: 168 }
        : size === "fullscreen"
          ? { font: 16, brand: 20, logo: 48, padY: 22, padX: 28, gap: 32, tracking: "0.24em", side: 200 }
          : { font: 12, brand: 14, logo: 32, padY: 12, padX: 16, gap: 20, tracking: "0.2em", side: 144 };

  return {
    scale,
    size,
    fontPx: Math.round(base.font * scale),
    brandPx: Math.round(base.brand * scale),
    logoH: Math.round(base.logo * scale),
    padY: Math.round(base.padY * scale),
    padX: Math.round(base.padX * scale),
    gap: Math.round(base.gap * scale),
    maxWidth: size === "fullscreen" ? undefined : "72rem",
    tracking: base.tracking,
    sideWidth: Math.round(base.side * Math.min(1.35, Math.max(0.85, scale))),
  };
}
