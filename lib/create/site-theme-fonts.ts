/**
 * Theme font loading for public + private sites.
 * Maps builder font names → Google Fonts CSS2 families (Steelfish is self-hosted).
 */

const GOOGLE_DISPLAY: Record<string, string> = {
  Fraunces: "Fraunces:ital,wght@0,400;0,600;0,700;1,400",
  "Playfair Display": "Playfair+Display:ital,wght@0,400;0,600;0,700;1,400",
  Oswald: "Oswald:wght@400;500;600;700",
  "Bebas Neue": "Bebas+Neue",
  "IBM Plex Sans": "IBM+Plex+Sans:wght@300;400;500;600;700",
  Inter: "Inter:wght@400;500;600;700",
  Syne: "Syne:wght@400;600;700;800",
};

const GOOGLE_BODY: Record<string, string> = {
  "IBM Plex Sans": "IBM+Plex+Sans:wght@300;400;500;600;700",
  Inter: "Inter:wght@400;500;600;700",
  "Helvetica Neue": "", // system
  Arial: "",
  Georgia: "",
  "system-ui": "",
};

/** Fonts pickable on moveable text boxes + Aesthetic Editor. */
export const TEXT_FONT_OPTIONS = [
  "Fraunces",
  "Playfair Display",
  "Oswald",
  "Bebas Neue",
  "Syne",
  "Steelfish",
  "Georgia",
  "IBM Plex Sans",
  "Inter",
  "system-ui",
  "Arial",
  "Helvetica Neue",
] as const;

function googleFamilySpec(name: string): string | null {
  const spec = GOOGLE_DISPLAY[name] ?? GOOGLE_BODY[name];
  return spec || null;
}

/** True when we ship a local @font-face (May Lecor Russian display). */
export function isSelfHostedThemeFont(name: string): boolean {
  return name === "Steelfish";
}

export function googleFontsHrefForTheme(
  fontDisplay: string,
  fontBody: string,
  extraFamilies: string[] = [],
): string | null {
  const families = new Set<string>();
  const d = googleFamilySpec(fontDisplay);
  if (d) families.add(d);
  const b = googleFamilySpec(fontBody);
  if (b) families.add(b);
  for (const name of extraFamilies) {
    const spec = googleFamilySpec(name.trim());
    if (spec) families.add(spec);
  }
  if (families.size === 0) return null;
  const q = [...families].map((f) => `family=${f}`).join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

export function cssFontStack(name: string): string {
  if (name === "Steelfish") return '"Steelfish", Arial, sans-serif';
  if (name === "system-ui") return "system-ui, -apple-system, Segoe UI, sans-serif";
  if (name === "Helvetica Neue") return '"Helvetica Neue", Helvetica, Arial, sans-serif';
  return `"${name}", system-ui, sans-serif`;
}
