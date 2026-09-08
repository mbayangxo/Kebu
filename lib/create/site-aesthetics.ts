import type { ThemeTokens } from "./website-schema";
import { cssFontStack } from "./site-theme-fonts";

const TYPO = { headingScale: "md" as const, bodySize: "md" as const, letterSpacing: "normal" as const };

/** Named looks for the builder — not a Shopify theme store. Applied as Kebu theme tokens. */
export type SiteAestheticId =
  | "dakar-night"
  | "sahel-light"
  | "rose-atelier"
  | "lagos-market"
  | "coast-linen"
  | "studio-ink"
  | "dklns-lumen"
  | "ndaoan-cinema"
  | "rect-signal"
  | "mayjor-grace"
  | "layers-beauty"
  | "carmine-ink";

export type SiteAesthetic = {
  id: SiteAestheticId;
  name: string;
  tagline: string;
  theme: ThemeTokens;
};

export const SITE_AESTHETICS: SiteAesthetic[] = [
  {
    id: "sahel-light",
    name: "Sahel Light",
    tagline: "Warm cream, orange accent — default Kebu look",
    theme: {
      primary: "#0A0A0A",
      accent: "#FF5500",
      background: "#FFFBF7",
      text: "#0A0A0A",
      fontDisplay: "Fraunces",
      fontBody: "system-ui",
      spacing: "comfortable",
      ...TYPO,
      aestheticId: "sahel-light",
    },
  },
  {
    id: "dakar-night",
    name: "Dakar Night",
    tagline: "Black canvas, lime CTAs — music and nightlife",
    theme: {
      primary: "#0A0A0A",
      accent: "#00C851",
      background: "#111111",
      text: "#FAFAF8",
      fontDisplay: "Fraunces",
      fontBody: "system-ui",
      spacing: "comfortable",
      ...TYPO,
      aestheticId: "dakar-night",
    },
  },
  {
    id: "rose-atelier",
    name: "Rose Atelier",
    tagline: "Fashion pink on black — artist and beauty brands",
    theme: {
      primary: "#0F0D33",
      accent: "#E9006B",
      background: "#FAFAF8",
      text: "#0F0D33",
      fontDisplay: "Fraunces",
      fontBody: "system-ui",
      spacing: "airy",
      ...TYPO,
      aestheticId: "rose-atelier",
    },
  },
  {
    id: "lagos-market",
    name: "Lagos Market",
    tagline: "Bold red commerce — shops that need to sell today",
    theme: {
      primary: "#1A0A08",
      accent: "#E10600",
      background: "#FFF8F2",
      text: "#1A0A08",
      fontDisplay: "Fraunces",
      fontBody: "system-ui",
      spacing: "compact",
      ...TYPO,
      aestheticId: "lagos-market",
    },
  },
  {
    id: "coast-linen",
    name: "Coast Linen",
    tagline: "Sand and gold — hospitality, wellness, slow brands",
    theme: {
      primary: "#3D3226",
      accent: "#C4A574",
      background: "#F4EFE6",
      text: "#2C241C",
      fontDisplay: "Fraunces",
      fontBody: "system-ui",
      spacing: "airy",
      ...TYPO,
      aestheticId: "coast-linen",
    },
  },
  {
    id: "studio-ink",
    name: "Studio Ink",
    tagline: "Editorial navy — agencies and portfolios",
    theme: {
      primary: "#0F0D33",
      accent: "#2563EB",
      background: "#F7F7FB",
      text: "#0F0D33",
      fontDisplay: "Fraunces",
      fontBody: "system-ui",
      spacing: "comfortable",
      ...TYPO,
      aestheticId: "studio-ink",
    },
  },
  {
    id: "dklns-lumen",
    name: "DkLNS Lumen",
    tagline: "Agency mint on ink — talent management & creative",
    theme: {
      primary: "#071210",
      accent: "#5CFFB0",
      background: "#071210",
      text: "#F4F7F5",
      fontDisplay: "Oswald",
      fontBody: "system-ui",
      spacing: "airy",
      ...TYPO,
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "wide",
      aestheticId: "dklns-lumen",
    },
  },
  {
    id: "ndaoan-cinema",
    name: "Ndaoan Cinema",
    tagline: "Brass on black — film, commercials, photo & content studio",
    theme: {
      primary: "#030303",
      accent: "#D4A017",
      background: "#030303",
      text: "#FAF6F0",
      fontDisplay: "Fraunces",
      fontBody: "system-ui",
      spacing: "comfortable",
      ...TYPO,
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "tight",
      aestheticId: "ndaoan-cinema",
    },
  },
  {
    id: "rect-signal",
    name: "RECT Signal",
    tagline: "Lime · black · orange — music streaming & entertainment tech",
    theme: {
      primary: "#050505",
      accent: "#B8FF00",
      background: "#050505",
      text: "#F5F5F0",
      fontDisplay: "Oswald",
      fontBody: "system-ui",
      spacing: "airy",
      ...TYPO,
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      aestheticId: "rect-signal",
    },
  },
  {
    id: "mayjor-grace",
    name: "Mayjor Grace",
    tagline: "Cream · rose — For The Mayjor Good foundation",
    theme: {
      primary: "#1A0F14",
      accent: "#E9006B",
      background: "#FFF8F3",
      text: "#1A0F14",
      fontDisplay: "Fraunces",
      fontBody: "system-ui",
      spacing: "airy",
      ...TYPO,
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "mayjor-grace",
    },
  },
  {
    id: "layers-beauty",
    name: "LAYERS Beauty",
    tagline: "Warm clay · Playfair — organic skincare shop",
    theme: {
      primary: "#1F1A17",
      accent: "#C4786A",
      background: "#F7F1EB",
      text: "#1F1A17",
      fontDisplay: "Playfair Display",
      fontBody: "IBM Plex Sans",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "layers-beauty",
    },
  },
  {
    id: "carmine-ink",
    name: "Carmine Ink",
    tagline: "Deep red · Oswald — creative agency",
    theme: {
      primary: "#1A0505",
      accent: "#C1121F",
      background: "#FAF7F5",
      text: "#1A0505",
      fontDisplay: "Oswald",
      fontBody: "IBM Plex Sans",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      aestheticId: "carmine-ink",
    },
  },
];

export function siteAestheticById(id: string | null | undefined): SiteAesthetic | null {
  return SITE_AESTHETICS.find((a) => a.id === id) ?? null;
}

export function matchSiteAesthetic(theme: Partial<ThemeTokens> | null | undefined): SiteAestheticId | null {
  if (theme?.aestheticId) {
    const byId = SITE_AESTHETICS.find((a) => a.id === theme.aestheticId);
    if (byId) return byId.id;
  }
  if (!theme?.accent || !theme?.background) return null;
  const hit = SITE_AESTHETICS.find(
    (a) =>
      a.theme.accent.toLowerCase() === theme.accent!.toLowerCase() &&
      a.theme.background.toLowerCase() === theme.background!.toLowerCase(),
  );
  return hit?.id ?? null;
}

/** CSS custom properties so the live/preview site actually restyles, not only the color pickers. */
export function themeToCssVars(theme: ThemeTokens): Record<string, string> {
  const pad =
    theme.spacing === "compact" ? "2.25rem" : theme.spacing === "airy" ? "5rem" : "3.5rem";
  const radius = theme.spacing === "compact" ? "0.75rem" : theme.spacing === "airy" ? "1.75rem" : "1.25rem";
  const headingScale =
    theme.headingScale === "sm"
      ? "0.9"
      : theme.headingScale === "lg"
        ? "1.15"
        : theme.headingScale === "xl"
          ? "1.35"
          : "1";
  const bodySize =
    theme.bodySize === "sm" ? "0.9375rem" : theme.bodySize === "lg" ? "1.125rem" : "1rem";
  const tracking =
    theme.letterSpacing === "tight" ? "-0.02em" : theme.letterSpacing === "wide" ? "0.06em" : "0";
  return {
    ["--kebu-bg" as string]: theme.background,
    ["--kebu-text" as string]: theme.text,
    ["--kebu-accent" as string]: theme.accent,
    ["--kebu-primary" as string]: theme.primary,
    ["--kebu-font-display" as string]: cssFontStack(theme.fontDisplay),
    ["--kebu-font-body" as string]: cssFontStack(theme.fontBody),
    ["--kebu-section-pad" as string]: pad,
    ["--kebu-radius" as string]: radius,
    ["--kebu-heading-scale" as string]: headingScale,
    ["--kebu-body-size" as string]: bodySize,
    ["--kebu-tracking" as string]: tracking,
  };
}

export function themeWithAesthetic(id: SiteAestheticId): ThemeTokens {
  const look = SITE_AESTHETICS.find((a) => a.id === id);
  if (!look) return SITE_AESTHETICS[0]!.theme;
  return { ...look.theme, aestheticId: look.id };
}
