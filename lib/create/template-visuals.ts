import { KDIRECTION_WIX_GRADIENT } from "@/lib/create/kdirection-defaults";
import { LEGALLY_BLONDE_ASSETS } from "@/lib/create/legally-blonde-defaults";

/** Flagship templates — each must look different in the picker (Shopify-style). */
export const FLAGSHIP_TEMPLATE_SLUGS = [
  "showcase-legally-blonde",
  "musician-maylecor-ksendr",
  "agency-kdirection",
] as const;

export type FlagshipTemplateSlug = (typeof FLAGSHIP_TEMPLATE_SLUGS)[number];

export type TemplateCardVisual = {
  /** Static hero for gallery cards — avoids black iframe previews. */
  previewImage?: string;
  previewImageSecondary?: string;
  previewGradient?: string;
  badge: string;
  keywords: string[];
};

export const TEMPLATE_CARD_VISUALS: Record<string, TemplateCardVisual> = {
  "showcase-legally-blonde": {
    previewImage: LEGALLY_BLONDE_ASSETS.backgroundLayer,
    previewImageSecondary: LEGALLY_BLONDE_ASSETS.cutoutLeft,
    previewGradient: "linear-gradient(180deg, #ffd6ec 0%, #e9006b 55%, #0a0a0a 100%)",
    badge: "Russian cutouts",
    keywords: ["russian", "ksendr", "legally blonde", "cutout", "steelfish", "pink"],
  },
  "musician-maylecor-ksendr": {
    previewImage: LEGALLY_BLONDE_ASSETS.backgroundLayer,
    previewImageSecondary: "/templates/maylecor/portrait.jpg",
    previewGradient: "linear-gradient(160deg, #E9006B 0%, #0A0A0A 70%)",
    badge: "May Lecor motion",
    keywords: ["may lecor", "artist", "music", "russian", "motion", "ksendr"],
  },
  "agency-kdirection": {
    previewGradient: KDIRECTION_WIX_GRADIENT,
    previewImage: "/templates/maylecor/portrait.jpg",
    badge: "K-Direction Wix",
    keywords: ["k-direction", "wix", "label", "collage", "oswald", "gradient"],
  },
  "musician-artist": {
    previewGradient: "linear-gradient(180deg, #1a1a1a 0%, #000 100%)",
    previewImage: "/templates/maylecor/portrait.jpg",
    badge: "Dark artist",
    keywords: ["musician", "artist", "dark"],
  },
  "agency-creative": {
    previewGradient: "linear-gradient(135deg, #FF5500, #0A0A0A)",
    badge: "Agency",
    keywords: ["agency", "creative"],
  },
};

export function templateCardVisual(slug: string): TemplateCardVisual | null {
  return TEMPLATE_CARD_VISUALS[slug] ?? null;
}

export function isFlagshipTemplateSlug(slug: string): slug is FlagshipTemplateSlug {
  return (FLAGSHIP_TEMPLATE_SLUGS as readonly string[]).includes(slug);
}
