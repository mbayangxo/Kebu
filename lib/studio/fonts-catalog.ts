/**
 * Studio fonts catalog — curated, loadable families for canvas text.
 * Shared with brand kit + aesthetic apply (not free-text-only).
 */

export type StudioFontRole = "display" | "body" | "mono";

export type StudioFontEntry = {
  id: string;
  /** CSS font-family name used on canvas layers */
  family: string;
  label: string;
  role: StudioFontRole;
  /** Google Fonts CSS2 family fragment; empty = system / self-hosted */
  googleFamily: string;
  stack: string;
  sample: string;
};

export const STUDIO_FONTS_CATALOG: StudioFontEntry[] = [
  {
    id: "fraunces",
    family: "Fraunces",
    label: "Fraunces",
    role: "display",
    googleFamily: "Fraunces:ital,wght@0,400;0,600;0,700;1,400",
    stack: '"Fraunces", Georgia, serif',
    sample: "Build your brand",
  },
  {
    id: "playfair",
    family: "Playfair Display",
    label: "Playfair Display",
    role: "display",
    googleFamily: "Playfair+Display:ital,wght@0,400;0,600;0,700;1,400",
    stack: '"Playfair Display", Georgia, serif',
    sample: "Editorial headline",
  },
  {
    id: "oswald",
    family: "Oswald",
    label: "Oswald",
    role: "display",
    googleFamily: "Oswald:wght@400;500;600;700",
    stack: '"Oswald", system-ui, sans-serif',
    sample: "BOLD DROP",
  },
  {
    id: "bebas",
    family: "Bebas Neue",
    label: "Bebas Neue",
    role: "display",
    googleFamily: "Bebas+Neue",
    stack: '"Bebas Neue", Impact, sans-serif',
    sample: "SALE 50%",
  },
  {
    id: "syne",
    family: "Syne",
    label: "Syne",
    role: "display",
    googleFamily: "Syne:wght@400;600;700;800",
    stack: '"Syne", system-ui, sans-serif',
    sample: "Modern Africa",
  },
  {
    id: "steelfish",
    family: "Steelfish",
    label: "Steelfish (self-hosted)",
    role: "display",
    googleFamily: "",
    stack: '"Steelfish", Arial, sans-serif',
    sample: "MAY LECOR",
  },
  {
    id: "ibm-plex",
    family: "IBM Plex Sans",
    label: "IBM Plex Sans",
    role: "body",
    googleFamily: "IBM+Plex+Sans:wght@300;400;500;600;700",
    stack: '"IBM Plex Sans", system-ui, sans-serif',
    sample: "Clear body copy for shops",
  },
  {
    id: "inter",
    family: "Inter",
    label: "Inter",
    role: "body",
    googleFamily: "Inter:wght@400;500;600;700",
    stack: '"Inter", system-ui, sans-serif',
    sample: "UI and captions",
  },
  {
    id: "system-ui",
    family: "system-ui",
    label: "System UI",
    role: "body",
    googleFamily: "",
    stack: "system-ui, -apple-system, Segoe UI, sans-serif",
    sample: "Fast on low bandwidth",
  },
  {
    id: "georgia",
    family: "Georgia",
    label: "Georgia",
    role: "body",
    googleFamily: "",
    stack: "Georgia, 'Times New Roman', serif",
    sample: "Classic paragraph text",
  },
  {
    id: "arial",
    family: "Arial",
    label: "Arial",
    role: "body",
    googleFamily: "",
    stack: "Arial, Helvetica, sans-serif",
    sample: "Universal sans",
  },
  {
    id: "courier",
    family: "Courier New",
    label: "Courier New",
    role: "mono",
    googleFamily: "",
    stack: '"Courier New", Courier, monospace',
    sample: "Code · tickets · IDs",
  },
];

export function studioFontByFamily(family: string): StudioFontEntry | undefined {
  return STUDIO_FONTS_CATALOG.find((f) => f.family === family);
}

export function studioFontFamilies(): string[] {
  return STUDIO_FONTS_CATALOG.map((f) => f.family);
}

/** Google Fonts CSS2 URL for the families used on a canvas (or full catalog). */
export function googleFontsHrefForStudioFamilies(families: string[]): string | null {
  const set = new Set<string>();
  for (const name of families) {
    const entry = studioFontByFamily(name);
    if (entry?.googleFamily) set.add(entry.googleFamily);
  }
  if (set.size === 0) return null;
  const q = [...set].map((f) => `family=${f}`).join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

export function googleFontsHrefForStudioCatalog(): string | null {
  return googleFontsHrefForStudioFamilies(studioFontFamilies());
}

export function cssStackForStudioFont(family: string): string {
  return studioFontByFamily(family)?.stack ?? `"${family}", system-ui, sans-serif`;
}
