import { z } from "zod";
import { MAYLECOR_FIGURE_ASSETS, MAYLECOR_LOCAL_ASSETS, MAYLECOR_SOCIAL_DEFAULTS, isElleStockCutout } from "./maylecor-defaults";
import { MAYLECOR_DEFAULT_LAYER_MOTIONS } from "./maylecor-cutout-motion";
import { LEGALLY_BLONDE_ASSETS, defaultLegallyBlondeHeroProps } from "./legally-blonde-defaults";
import { defaultMaylecorNavLinks } from "./maylecor-nav";

/**
 * May Lecor portfolio hero = exact ksendrdesign.ru/legallyblonderu Tilda layout
 * (background, cutouts, Steelfish, spin logo, scroll parallax). Swap photos in the editor.
 */
export function defaultMaylecorKsendrProps(artistName = "MAY LECOR") {
  const russian = defaultLegallyBlondeHeroProps();
  return {
    ...russian,
    title: artistName,
    subtitle:
      "New music, live shows, and visuals — stream on Spotify, Apple Music, and SoundCloud.",
    brandLabel: artistName,
    // Pink Russian scene base; May’s NYC skyline is a separate parallax layer in front of it.
    backgroundLayer: LEGALLY_BLONDE_ASSETS.backgroundLayer,
    /** Circular MAY LÈCOR seal (not Russian wordmark, not “May” rose over the city). */
    titleLogo: MAYLECOR_LOCAL_ASSETS.logoCircleSeal,
    // May Lecor figure — separate from city so city can scroll behind.
    cutoutLeft: MAYLECOR_FIGURE_ASSETS.cutoutLeft,
    cutoutRight: MAYLECOR_FIGURE_ASSETS.cutoutRight,
    cutoutAccent: MAYLECOR_FIGURE_ASSETS.cutoutAccent,
    cutoutSparkle: LEGALLY_BLONDE_ASSETS.cutoutSparkle,
    macbook: LEGALLY_BLONDE_ASSETS.macbook,
    sparkleGif: LEGALLY_BLONDE_ASSETS.sparkleGif,
    heroPhoto: MAYLECOR_FIGURE_ASSETS.heroPhoto,
    accentColor: "#E9006B",
    displayFont: "Steelfish",
    motionEnabled: true,
    showExtras: false,
    appearance: "light" as const,
    /** Full Russian scroll scene (not one-screen crop). */
    scrollMode: "parallax" as const,
    /** Use the circle seal image — not generated Russian/English text ring. */
    titleAsText: false,
    /** Readable default circle size for English brand seal. */
    layerScales: {
      titleLogo: 0.85,
      cutoutAccent: 0.52,
      cutoutLeft: 0.55,
      cutoutRight: 0.36,
      heroPhoto: 0.34,
    },
    layerMotions: { ...MAYLECOR_DEFAULT_LAYER_MOTIONS, titleLogo: "spin" as const },
    hiddenLayers: ["macbook"],
    navLinks: defaultMaylecorNavLinks(),
    navDisplay: "text" as const,
    chromeLogo: MAYLECOR_LOCAL_ASSETS.logoStacked,
    showChromeLogo: true,
    socialLinks: MAYLECOR_SOCIAL_DEFAULTS.map((s) => ({ ...s })),
    socialRailVisible: true,
    socialRailBg: "rgba(0,0,0,0.85)",
    socialRailLeftPct: 0,
    socialRailTopPct: 12,
    socialRailIconSize: 40,
    layerMoves: {},
    /**
     * City scrolls behind May (parallaxRole=city).
     * Correct brand logo sits top-left — not the pink “May” wordmark over the skyline.
     */
    extraCutouts: [
      {
        id: "may-city-skyline",
        src: MAYLECOR_LOCAL_ASSETS.citySkyline,
        alt: "New York skyline",
        href: "",
        topPct: 42,
        leftPct: 28,
        widthPct: 68,
        rotate: 0,
        zIndex: 5,
        parallaxRole: "city" as const,
      },
      {
        id: "may-logo-stacked",
        src: MAYLECOR_LOCAL_ASSETS.logoStacked,
        alt: "Ma Lècor logo",
        href: "/",
        topPct: 4,
        leftPct: 4,
        widthPct: 16,
        rotate: 0,
        zIndex: 20,
        parallaxRole: "none" as const,
      },
    ],
  };
}

/** True when hero still needs the Russian local cutouts (not a custom upload set). */
export function maylecorHeroNeedsRussianRestore(props: Record<string, unknown>): boolean {
  const val = (key: string) => String(props[key] ?? "");
  const cutouts = [val("cutoutLeft"), val("cutoutRight"), val("cutoutAccent"), val("heroPhoto")];
  const looksLikeElle = cutouts.some((v) => isElleStockCutout(v));
  // Previous broken defaults used rectangular Wix photos instead of Tilda cutouts.
  const looksLikeOldWixSwap = cutouts.some((v) => v.includes("wixstatic.com"));
  // Tilda CDN often 403s → black builder; force local Kebu assets.
  const looksLikeRemoteTilda = cutouts.some((v) => v.includes("tildacdn.com") || v.includes("tilda.ws"));
  const missingLocalMay = cutouts.some(
    (v) => v.trim() && !v.includes("/templates/maylecor/") && !v.startsWith("blob:") && isElleStockCutout(v),
  );
  const empty = cutouts.every((v) => !v.trim());
  return looksLikeElle || looksLikeOldWixSwap || looksLikeRemoteTilda || empty || missingLocalMay;
}

/** @deprecated use maylecorHeroNeedsRussianRestore — kept for older tests/call sites */
export function maylecorHeroUsesPlaceholderAssets(props: Record<string, unknown>): boolean {
  return maylecorHeroNeedsRussianRestore(props);
}

export const maylecorKsendrPropsSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  brandLabel: z.string().optional(),
  backgroundLayer: z.string(),
  titleLogo: z.string(),
  cutoutLeft: z.string(),
  cutoutRight: z.string(),
  cutoutAccent: z.string(),
  cutoutSparkle: z.string().optional(),
  macbook: z.string(),
  sparkleGif: z.string().optional(),
  heroPhoto: z.string(),
  accentColor: z.string(),
  displayFont: z.string().optional().default("Steelfish"),
  motionEnabled: z.boolean(),
  showExtras: z.boolean().optional().default(false),
  navLinks: z
    .array(z.object({ label: z.string(), href: z.string() }))
    .optional()
    .default([]),
  socialLinks: z
    .array(z.object({ label: z.string(), iconUrl: z.string(), href: z.string() }))
    .optional()
    .default([]),
  socialRailVisible: z.boolean().optional().default(true),
  socialRailBg: z.string().optional().default("rgba(0,0,0,0.85)"),
  socialRailLeftPct: z.number().optional().default(0),
  socialRailTopPct: z.number().optional().default(12),
  socialRailIconSize: z.number().optional().default(40),
  layerMoves: z
    .record(z.string(), z.object({ dx: z.number(), dy: z.number() }))
    .optional()
    .default({}),
  layerScales: z.record(z.string(), z.number()).optional().default({}),
  layerMotions: z
    .record(z.string(), z.enum(["spin", "float", "bob", "none"]))
    .optional()
    .default({}),
  layerLinks: z.record(z.string(), z.string()).optional().default({}),
  hiddenLayers: z.array(z.string()).optional().default([]),
  extraCutouts: z
    .array(
      z.object({
        id: z.string(),
        src: z.string(),
        alt: z.string().optional(),
        href: z.string().optional(),
        topPct: z.number(),
        leftPct: z.number(),
        widthPct: z.number(),
        rotate: z.number().optional(),
        zIndex: z.number().optional(),
      }),
    )
    .optional()
    .default([]),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  scrollMode: z.enum(["viewport", "parallax"]).optional().default("parallax"),
  appearance: z.enum(["light", "dark"]).optional().default("light"),
  titleAsText: z.boolean().optional().default(false),
  /** Bumped with MAYLECOR_SEED_REVISION so drafts auto-refresh stock assets. */
  seedRevision: z.string().optional(),
});

/** Merge May Lecor logo/city cutouts; refresh stock files; drop the old “May” banner over the skyline. */
export function mergeMaylecorLogoExtras(
  extras: {
    id: string;
    src: string;
    alt?: string;
    href?: string;
    topPct: number;
    leftPct: number;
    widthPct: number;
    rotate?: number;
    zIndex?: number;
    parallaxRole?: "city" | "figure" | "none";
  }[],
): typeof extras {
  const defaults = defaultMaylecorKsendrProps().extraCutouts ?? [];
  const refreshed = extras
    .filter((e) => e.id !== "may-logo-banner" && e.id !== "may-logo-badge")
    .map((e) => {
      if (e.id === "may-city-skyline") {
        return {
          ...e,
          src: MAYLECOR_LOCAL_ASSETS.citySkyline,
          parallaxRole: "city" as const,
          zIndex: e.zIndex ?? 5,
        };
      }
      if (e.id === "may-logo-stacked") {
        return {
          ...e,
          src: MAYLECOR_LOCAL_ASSETS.logoStacked,
          href: e.href?.trim() ? e.href : "/",
          parallaxRole: "none" as const,
          zIndex: e.zIndex ?? 20,
        };
      }
      return e;
    });
  const ids = new Set(refreshed.map((e) => e.id));
  const missing = defaults.filter((d) => !ids.has(d.id));
  return missing.length ? [...missing, ...refreshed] : refreshed;
}
