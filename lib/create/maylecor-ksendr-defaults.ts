import { z } from "zod";
import { MAYLECOR_SOCIAL_DEFAULTS, MAYLECOR_WIX } from "./maylecor-defaults";
import { LEGALLY_BLONDE_ASSETS } from "./legally-blonde-defaults";

/** May Lecor portfolio — ksendr motion layout with May photos (not Russian placeholder art). */
export function defaultMaylecorKsendrProps(artistName = "MAY LECOR") {
  return {
    title: artistName,
    subtitle:
      "New music, live shows, and visuals — stream on Spotify, Apple Music, and SoundCloud.",
    brandLabel: artistName,
    backgroundLayer: MAYLECOR_WIX.backgroundBlur,
    titleLogo: MAYLECOR_WIX.logoSmall,
    cutoutLeft: MAYLECOR_WIX.bottomLeft,
    cutoutRight: MAYLECOR_WIX.bottomRight,
    cutoutAccent: MAYLECOR_WIX.portraitMain,
    cutoutSparkle: MAYLECOR_WIX.logoBanner,
    macbook: MAYLECOR_WIX.albumArt,
    sparkleGif: LEGALLY_BLONDE_ASSETS.sparkleGif,
    heroPhoto: MAYLECOR_WIX.collageTop,
    accentColor: "#E9006B",
    motionEnabled: true,
    showExtras: false,
    scrollMode: "viewport" as const,
    socialLinks: MAYLECOR_SOCIAL_DEFAULTS.map((s) => ({ ...s })),
  };
}

export function maylecorHeroUsesPlaceholderAssets(props: Record<string, unknown>): boolean {
  const check = (key: string) => {
    const v = String(props[key] ?? "");
    return v.includes("tildacdn.com") || v.includes("legallyblonde") || v.includes("ksendrdesign");
  };
  return (
    check("backgroundLayer") ||
    check("cutoutLeft") ||
    check("cutoutRight") ||
    check("cutoutAccent") ||
    check("titleLogo")
  );
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
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  scrollMode: z.enum(["viewport", "parallax"]).optional().default("parallax"),
  appearance: z.enum(["light", "dark"]).optional().default("light"),
});
