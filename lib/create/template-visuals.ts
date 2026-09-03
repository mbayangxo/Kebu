import { KDIRECTION_WIX_GRADIENT } from "@/lib/create/kdirection-defaults";
import { LEGALLY_BLONDE_ASSETS } from "@/lib/create/legally-blonde-defaults";
import { KDIRECTION_PORTRAIT } from "@/lib/create/kdirection-local-assets";

/** Flagship public templates = the two real site engines (May = Russian cutouts, K-Direction = Wix). */
export const FLAGSHIP_TEMPLATE_SLUGS = [
  "musician-maylecor-ksendr",
  "agency-kdirection",
] as const;

export type FlagshipTemplateSlug = (typeof FLAGSHIP_TEMPLATE_SLUGS)[number];

/** How the gallery card chrome is drawn — each business type must look different. */
export type TemplateCardLayout =
  | "russian-cutouts"
  | "wix-collage"
  | "dark-artist"
  | "agency"
  | "salon"
  | "store"
  | "restaurant"
  | "film"
  | "fashion"
  | "perfume"
  | "tech"
  | "portfolio"
  | "event"
  | "impact"
  | "farm"
  | "build"
  | "hotel"
  | "generic";

export type TemplateCardVisual = {
  /** Static hero for gallery cards — avoids black iframe previews. */
  previewImage?: string;
  previewImageSecondary?: string;
  previewGradient?: string;
  badge: string;
  keywords: string[];
  layout?: TemplateCardLayout;
  /** Short label drawn on the card (brand-like). */
  wordmark?: string;
};

export const TEMPLATE_CARD_VISUALS: Record<string, TemplateCardVisual> = {
  "musician-maylecor-ksendr": {
    previewImage: LEGALLY_BLONDE_ASSETS.backgroundLayer,
    previewImageSecondary: LEGALLY_BLONDE_ASSETS.cutoutLeft,
    previewGradient: "linear-gradient(180deg, #ffd6ec 0%, #e9006b 55%, #0a0a0a 100%)",
    badge: "May Lecor · Russian cutouts",
    keywords: ["may lecor", "russian", "ksendr", "cutout", "pink", "music"],
    layout: "russian-cutouts",
    wordmark: "MAY LECOR",
  },
  "agency-kdirection": {
    previewGradient: KDIRECTION_WIX_GRADIENT,
    previewImage: KDIRECTION_PORTRAIT,
    badge: "K-Direction · Wix canvas",
    keywords: ["k-direction", "wix", "label", "collage", "oswald"],
    layout: "wix-collage",
    wordmark: "K DIRECTION",
  },
  "musician-artist": {
    previewGradient: "linear-gradient(180deg, #1a1a1a 0%, #000 100%)",
    previewImage: KDIRECTION_PORTRAIT,
    badge: "Dark artist collage",
    keywords: ["musician", "artist", "dark"],
    layout: "dark-artist",
    wordmark: "ARTIST",
  },
  "musician-streaming": {
    previewGradient: "linear-gradient(135deg, #1DB954 0%, #191414 55%, #000 100%)",
    badge: "Streaming hero",
    keywords: ["streaming", "spotify", "music"],
    layout: "dark-artist",
    wordmark: "LISTEN",
  },
  "musician-press-kit": {
    previewGradient: "linear-gradient(160deg, #111 0%, #333 40%, #E8D5A3 100%)",
    badge: "Press kit / EPK",
    keywords: ["epk", "press", "music"],
    layout: "portfolio",
    wordmark: "EPK",
  },
  "music-label-roster": {
    previewGradient: "linear-gradient(180deg, #0A0A0A 0%, #3D0066 100%)",
    badge: "Label roster",
    keywords: ["label", "roster", "music"],
    layout: "dark-artist",
    wordmark: "ROSTER",
  },
  "agency-creative": {
    previewGradient: "linear-gradient(135deg, #FF5500 0%, #0A0A0A 70%)",
    badge: "Creative agency",
    keywords: ["agency", "creative", "services"],
    layout: "agency",
    wordmark: "AGENCY",
  },
  "production-company": {
    previewGradient: "linear-gradient(160deg, #1a1a2e 0%, #E94560 90%)",
    badge: "Production house",
    keywords: ["production", "video", "events"],
    layout: "film",
    wordmark: "PROD",
  },
  "film-studio": {
    previewGradient: "linear-gradient(180deg, #000 0%, #FF1493 100%)",
    badge: "Film & video",
    keywords: ["film", "studio", "video"],
    layout: "film",
    wordmark: "FILM",
  },
  "hair-salon": {
    previewGradient: "linear-gradient(160deg, #F5E6D3 0%, #D4A574 50%, #5C4033 100%)",
    badge: "Salon & barber",
    keywords: ["salon", "hair", "beauty"],
    layout: "salon",
    wordmark: "SALON",
  },
  "beauty-studio": {
    previewGradient: "linear-gradient(160deg, #FFF0F5 0%, #E8B4BC 55%, #8B4557 100%)",
    badge: "Beauty studio",
    keywords: ["beauty", "makeup", "studio"],
    layout: "salon",
    wordmark: "BEAUTY",
  },
  "perfume-brand": {
    previewGradient: "linear-gradient(180deg, #1A1423 0%, #C9A962 55%, #F5E6C8 100%)",
    badge: "Fragrance brand",
    keywords: ["perfume", "fragrance", "luxury"],
    layout: "perfume",
    wordmark: "SCENT",
  },
  "fashion-atelier": {
    previewGradient: "linear-gradient(160deg, #FAFAF8 0%, #E8E4DC 40%, #1A1A2E 100%)",
    badge: "Fashion atelier",
    keywords: ["fashion", "atelier", "lookbook"],
    layout: "fashion",
    wordmark: "ATELIER",
  },
  "clothing-company": {
    previewGradient: "linear-gradient(135deg, #FFFFFF 0%, #111111 100%)",
    badge: "Clothing brand",
    keywords: ["clothing", "fashion", "brand"],
    layout: "fashion",
    wordmark: "APPAREL",
  },
  "shopping-store": {
    previewGradient: "linear-gradient(160deg, #E8F5E9 0%, #2D6A4F 100%)",
    badge: "Shopping store",
    keywords: ["store", "shop", "products"],
    layout: "store",
    wordmark: "SHOP",
  },
  "online-store-preview": {
    previewGradient: "linear-gradient(160deg, #FFF8E7 0%, #BC6C25 100%)",
    badge: "Online store",
    keywords: ["ecommerce", "store", "cart"],
    layout: "store",
    wordmark: "CART",
  },
  "restaurant-table": {
    previewGradient: "linear-gradient(160deg, #2B2118 0%, #BC6C25 50%, #F4A261 100%)",
    badge: "Restaurant",
    keywords: ["restaurant", "food", "menu"],
    layout: "restaurant",
    wordmark: "TABLE",
  },
  "business-company": {
    previewGradient: "linear-gradient(160deg, #0F0D33 0%, #457B9D 100%)",
    badge: "Company site",
    keywords: ["business", "company", "corporate"],
    layout: "agency",
    wordmark: "CO.",
  },
  "professional-services": {
    previewGradient: "linear-gradient(160deg, #F8F9FA 0%, #457B9D 100%)",
    badge: "Professional services",
    keywords: ["services", "consulting", "business"],
    layout: "agency",
    wordmark: "SERVICES",
  },
  "tech-startup": {
    previewGradient: "linear-gradient(135deg, #4361EE 0%, #0A0A0A 70%)",
    badge: "Tech startup",
    keywords: ["tech", "startup", "saas"],
    layout: "tech",
    wordmark: "LAUNCH",
  },
  "app-launch": {
    previewGradient: "linear-gradient(160deg, #7209B7 0%, #4361EE 50%, #4CC9F0 100%)",
    badge: "App launch",
    keywords: ["app", "mobile", "launch"],
    layout: "tech",
    wordmark: "APP",
  },
  "portfolio-pro": {
    previewGradient: "linear-gradient(180deg, #FAFAF8 0%, #6D597A 100%)",
    badge: "Pro portfolio",
    keywords: ["portfolio", "cv", "work"],
    layout: "portfolio",
    wordmark: "WORK",
  },
  "student-portfolio": {
    previewGradient: "linear-gradient(160deg, #E0F7FA 0%, #6D597A 100%)",
    badge: "Student portfolio",
    keywords: ["student", "portfolio", "school"],
    layout: "portfolio",
    wordmark: "STUDENT",
  },
  "artist-gallery": {
    previewGradient: "linear-gradient(160deg, #FFF 0%, #111 100%)",
    badge: "Artist gallery",
    keywords: ["gallery", "art", "exhibit"],
    layout: "portfolio",
    wordmark: "GALLERY",
  },
  "public-figure": {
    previewGradient: "linear-gradient(160deg, #F72585 0%, #0A0A0A 100%)",
    badge: "Public figure",
    keywords: ["public", "speaker", "profile"],
    layout: "dark-artist",
    wordmark: "PROFILE",
  },
  "event-night": {
    previewGradient: "linear-gradient(160deg, #0A0A0A 0%, #F72585 40%, #FF5500 100%)",
    badge: "Event night",
    keywords: ["event", "tickets", "night"],
    layout: "event",
    wordmark: "TONIGHT",
  },
  "hotel-stay": {
    previewGradient: "linear-gradient(160deg, #E8E4DC 0%, #8B7355 100%)",
    badge: "Hotel & stay",
    keywords: ["hotel", "travel", "stay"],
    layout: "hotel",
    wordmark: "STAY",
  },
  "agriculture-farm": {
    previewGradient: "linear-gradient(160deg, #DAD7CD 0%, #588157 50%, #344E41 100%)",
    badge: "Farm & ag",
    keywords: ["farm", "agriculture", "food"],
    layout: "farm",
    wordmark: "FARM",
  },
  "construction-build": {
    previewGradient: "linear-gradient(160deg, #E9C46A 0%, #264653 100%)",
    badge: "Construction",
    keywords: ["build", "construction", "contractor"],
    layout: "build",
    wordmark: "BUILD",
  },
  "ngo-impact": {
    previewGradient: "linear-gradient(160deg, #F1FAEE 0%, #588157 100%)",
    badge: "NGO / impact",
    keywords: ["ngo", "impact", "community"],
    layout: "impact",
    wordmark: "IMPACT",
  },
};

const CATEGORY_FALLBACK: Record<string, TemplateCardVisual> = {
  music: {
    previewGradient: "linear-gradient(180deg, #1a1a1a, #E8D5A3)",
    badge: "Music",
    keywords: ["music"],
    layout: "dark-artist",
    wordmark: "MUSIC",
  },
  agency: {
    previewGradient: "linear-gradient(135deg, #FF5500, #0A0A0A)",
    badge: "Agency",
    keywords: ["agency"],
    layout: "agency",
    wordmark: "AGENCY",
  },
  beauty: {
    previewGradient: "linear-gradient(160deg, #F5E6D3, #D4A574)",
    badge: "Beauty",
    keywords: ["beauty"],
    layout: "salon",
    wordmark: "BEAUTY",
  },
  fashion: {
    previewGradient: "linear-gradient(160deg, #FAFAF8, #1A1A2E)",
    badge: "Fashion",
    keywords: ["fashion"],
    layout: "fashion",
    wordmark: "FASHION",
  },
  store: {
    previewGradient: "linear-gradient(160deg, #E8F5E9, #2D6A4F)",
    badge: "Store",
    keywords: ["store"],
    layout: "store",
    wordmark: "SHOP",
  },
  restaurant: {
    previewGradient: "linear-gradient(160deg, #2B2118, #BC6C25)",
    badge: "Food",
    keywords: ["food"],
    layout: "restaurant",
    wordmark: "EAT",
  },
  film: {
    previewGradient: "linear-gradient(180deg, #000, #FF1493)",
    badge: "Film",
    keywords: ["film"],
    layout: "film",
    wordmark: "FILM",
  },
  business: {
    previewGradient: "linear-gradient(160deg, #0F0D33, #457B9D)",
    badge: "Business",
    keywords: ["business"],
    layout: "agency",
    wordmark: "BIZ",
  },
  tech: {
    previewGradient: "linear-gradient(135deg, #4361EE, #0A0A0A)",
    badge: "Tech",
    keywords: ["tech"],
    layout: "tech",
    wordmark: "TECH",
  },
  portfolio: {
    previewGradient: "linear-gradient(180deg, #FAFAF8, #6D597A)",
    badge: "Portfolio",
    keywords: ["portfolio"],
    layout: "portfolio",
    wordmark: "WORK",
  },
};

export function templateCardVisual(slug: string, category?: string): TemplateCardVisual | null {
  if (TEMPLATE_CARD_VISUALS[slug]) return TEMPLATE_CARD_VISUALS[slug]!;
  const cat = (category ?? "").toLowerCase().trim();
  if (cat && CATEGORY_FALLBACK[cat]) return CATEGORY_FALLBACK[cat]!;
  // Fuzzy category match (e.g. "student portfolio")
  for (const [key, visual] of Object.entries(CATEGORY_FALLBACK)) {
    if (cat.includes(key)) return visual;
  }
  return {
    previewGradient: "linear-gradient(160deg, #ECEAE4 0%, #0A0A0A 100%)",
    badge: "Template",
    keywords: [],
    layout: "generic",
    wordmark: "SITE",
  };
}

export function isFlagshipTemplateSlug(slug: string): slug is FlagshipTemplateSlug {
  return (FLAGSHIP_TEMPLATE_SLUGS as readonly string[]).includes(slug);
}
