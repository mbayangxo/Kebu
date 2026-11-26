/**
 * Theme font stacks for public + private sites.
 *
 * Google-family theme fonts are self-hosted by next/font (app/components/create/theme-font-faces.ts)
 * and referenced through CSS variables — never loaded from Google's font CDN at runtime
 * (the CSP forbids third-party stylesheets). Steelfish ships as a local @font-face.
 */

/** Theme font name → CSS variable defined by THEME_FONT_VARIABLE_CLASSES. */
export const THEME_FONT_VARIABLES: Record<string, string> = {
  "Libre Baskerville": "--kebu-font-libre-baskerville",
  "Cormorant Garamond": "--kebu-font-cormorant-garamond",
  "Manrope": "--kebu-font-manrope",
  "Space Grotesk": "--kebu-font-space-grotesk",
  "DM Sans": "--kebu-font-dm-sans",
  Fraunces: "--kebu-font-fraunces",
  "Playfair Display": "--kebu-font-playfair-display",
  Oswald: "--kebu-font-oswald",
  "Bebas Neue": "--kebu-font-bebas-neue",
  "IBM Plex Sans": "--kebu-font-ibm-plex-sans",
  Inter: "--kebu-font-inter",
  Syne: "--kebu-font-syne",
  Lobster: "--kebu-font-lobster",
  "Dancing Script": "--kebu-font-dancing-script",
  "Great Vibes": "--kebu-font-great-vibes",
  Pacifico: "--kebu-font-pacifico",
  "Abril Fatface": "--kebu-font-abril-fatface",
};

/** Fonts pickable on moveable text boxes + Aesthetic Editor. */
export { BUILDER_FONT_OPTIONS as TEXT_FONT_OPTIONS } from "@/lib/create/builder-fonts";

/** True when the font is served by Kebu itself (no third-party request). */
export function isSelfHostedThemeFont(name: string): boolean {
  return name === "Steelfish" || name in THEME_FONT_VARIABLES;
}

/**
 * CSS font-family stack for a theme font name. Self-hosted families resolve through their
 * variable; where the variables are not applied (Ultra/Offline data modes) the stack falls
 * back to a locally installed copy, then system fonts — no download.
 */
export function cssFontStack(name: string): string {
  if (name === "Steelfish") return '"Steelfish", Arial, sans-serif';
  if (name === "system-ui") return "system-ui, -apple-system, Segoe UI, sans-serif";
  if (name === "Helvetica Neue") return '"Helvetica Neue", Helvetica, Arial, sans-serif';
  const variable = THEME_FONT_VARIABLES[name];
  if (variable) return `var(${variable}, "${name}"), system-ui, sans-serif`;
  return `"${name}", system-ui, sans-serif`;
}

/** Compatibility with the former remote loader: supported fonts are served locally. */
export function googleFontsHrefForTheme(_display: string, _body: string, _extras: string[] = []): null { return null; }
