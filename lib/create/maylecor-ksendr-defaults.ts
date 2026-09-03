import { z } from "zod";
import { MAYLECOR_SOCIAL_DEFAULTS } from "./maylecor-defaults";
import { LEGALLY_BLONDE_ASSETS, defaultLegallyBlondeHeroProps } from "./legally-blonde-defaults";

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
    // Exact Russian cutouts / bg / logo / macbook — do not substitute rectangular Wix photos.
    backgroundLayer: LEGALLY_BLONDE_ASSETS.backgroundLayer,
    titleLogo: LEGALLY_BLONDE_ASSETS.titleLogo,
    cutoutLeft: LEGALLY_BLONDE_ASSETS.cutoutLeft,
    cutoutRight: LEGALLY_BLONDE_ASSETS.cutoutRight,
    cutoutAccent: LEGALLY_BLONDE_ASSETS.cutoutAccent,
    cutoutSparkle: LEGALLY_BLONDE_ASSETS.cutoutSparkle,
    macbook: LEGALLY_BLONDE_ASSETS.macbook,
    sparkleGif: LEGALLY_BLONDE_ASSETS.sparkleGif,
    heroPhoto: LEGALLY_BLONDE_ASSETS.heroPhoto,
    accentColor: "#E9006B",
    displayFont: "Steelfish",
    motionEnabled: true,
    showExtras: false,
    appearance: "light" as const,
    /** Full Russian scroll scene (not one-screen crop). */
    scrollMode: "parallax" as const,
    socialLinks: MAYLECOR_SOCIAL_DEFAULTS.map((s) => ({ ...s })),
    socialRailVisible: true,
    socialRailBg: "rgba(0,0,0,0.85)",
    socialRailLeftPct: 0,
    socialRailTopPct: 12,
    socialRailIconSize: 40,
    layerMoves: {},
    extraCutouts: [],
  };
}

/** True when hero still needs the Russian local cutouts (not a custom upload set). */
export function maylecorHeroNeedsRussianRestore(props: Record<string, unknown>): boolean {
  const val = (key: string) => String(props[key] ?? "");
  const cutouts = [val("cutoutLeft"), val("cutoutRight"), val("cutoutAccent"), val("backgroundLayer")];
  // Previous broken defaults used rectangular Wix photos instead of Tilda cutouts.
  const looksLikeOldWixSwap = cutouts.some((v) => v.includes("wixstatic.com"));
  // Tilda CDN often 403s → black builder; force local Kebu assets.
  const looksLikeRemoteTilda = cutouts.some((v) => v.includes("tildacdn.com") || v.includes("tilda.ws"));
  const missingLocalRussian = cutouts.some(
    (v) => v.trim() && !v.includes("/templates/legally-blonde/") && !v.startsWith("blob:"),
  );
  const empty = cutouts.every((v) => !v.trim());
  return looksLikeOldWixSwap || looksLikeRemoteTilda || empty || missingLocalRussian;
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
  extraCutouts: z
    .array(
      z.object({
        id: z.string(),
        src: z.string(),
        alt: z.string().optional(),
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
});
