import {
  STUDIO_DESIGN_TYPES,
  artboardSize,
  defaultCanvasDocument,
  type StudioDesignType,
} from "@/lib/studio/canvas-document";

export type StudioCreatePreset = {
  id: string;
  label: string;
  designType: StudioDesignType;
  description: string;
  width: number;
  height: number;
  group: "social" | "print" | "web";
};

/** Canva-style “Create a design” size chips — maps to Studio design types. */
export const STUDIO_CREATE_PRESETS: StudioCreatePreset[] = [
  {
    id: "instagram_post",
    label: "Instagram post",
    designType: "instagram_post",
    description: "1080 × 1080",
    ...artboardSize("instagram_post"),
    group: "social",
  },
  {
    id: "instagram_story",
    label: "Instagram story",
    designType: "instagram_story",
    description: "1080 × 1920",
    ...artboardSize("instagram_story"),
    group: "social",
  },
  {
    id: "instagram_reel",
    label: "Instagram Reel",
    designType: "instagram_reel",
    description: "1080 × 1920",
    ...artboardSize("instagram_reel"),
    group: "social",
  },
  {
    id: "tiktok_vertical",
    label: "TikTok",
    designType: "tiktok_vertical",
    description: "1080 × 1920",
    ...artboardSize("tiktok_vertical"),
    group: "social",
  },
  {
    id: "youtube_thumbnail",
    label: "YouTube thumbnail",
    designType: "youtube_thumbnail",
    description: "1280 × 720",
    ...artboardSize("youtube_thumbnail"),
    group: "social",
  },
  {
    id: "youtube_banner",
    label: "YouTube banner",
    designType: "youtube_banner",
    description: "2560 × 1440",
    ...artboardSize("youtube_banner"),
    group: "web",
  },
  {
    id: "spotify_artist_header",
    label: "Spotify artist header",
    designType: "spotify_artist_header",
    description: "2660 × 1140",
    ...artboardSize("spotify_artist_header"),
    group: "web",
  },
  {
    id: "whatsapp_status",
    label: "WhatsApp status",
    designType: "whatsapp_status",
    description: "1080 × 1920",
    ...artboardSize("whatsapp_status"),
    group: "social",
  },
  {
    id: "facebook_post",
    label: "Facebook post",
    designType: "facebook_post",
    description: "1080 × 1080",
    ...artboardSize("facebook_post"),
    group: "social",
  },
  {
    id: "social_square",
    label: "Social square",
    designType: "social_square",
    description: "1080 × 1080",
    ...artboardSize("social_square"),
    group: "social",
  },
  {
    id: "flyer",
    label: "Flyer",
    designType: "flyer",
    description: "Letter-ish print",
    ...artboardSize("flyer"),
    group: "print",
  },
  {
    id: "poster",
    label: "Poster",
    designType: "poster",
    description: "Tall promo",
    ...artboardSize("poster"),
    group: "print",
  },
  {
    id: "banner",
    label: "Web banner",
    designType: "banner",
    description: "1500 × 500",
    ...artboardSize("banner"),
    group: "web",
  },
  {
    id: "press_kit",
    label: "Press kit",
    designType: "press_kit",
    description: "816 × 1056",
    ...artboardSize("press_kit"),
    group: "print",
  },
  {
    id: "media_kit",
    label: "Media kit",
    designType: "media_kit",
    description: "816 × 1056",
    ...artboardSize("media_kit"),
    group: "print",
  },
  {
    id: "brand_deck",
    label: "Brand deck",
    designType: "brand_deck",
    description: "1920 × 1080",
    ...artboardSize("brand_deck"),
    group: "web",
  },
  {
    id: "pitch_deck",
    label: "Pitch deck",
    designType: "pitch_deck",
    description: "1920 × 1080",
    ...artboardSize("pitch_deck"),
    group: "web",
  },
  {
    id: "lookbook",
    label: "Lookbook",
    designType: "lookbook",
    description: "1600 × 2000",
    ...artboardSize("lookbook"),
    group: "print",
  },
  {
    id: "packaging",
    label: "Packaging artwork",
    designType: "packaging",
    description: "1200 × 1200",
    ...artboardSize("packaging"),
    group: "print",
  },
  {
    id: "logo",
    label: "Logo",
    designType: "logo",
    description: "1200 × 1200",
    ...artboardSize("logo"),
    group: "web",
  },
  {
    id: "email_graphic",
    label: "Email graphic",
    designType: "email_graphic",
    description: "1200 × 600",
    ...artboardSize("email_graphic"),
    group: "web",
  },
  {
    id: "business_card",
    label: "Business card",
    designType: "business_card",
    description: "1050 × 600",
    ...artboardSize("business_card"),
    group: "print",
  },
];

export function getCreatePreset(id: string): StudioCreatePreset | undefined {
  return STUDIO_CREATE_PRESETS.find((p) => p.id === id);
}

export function blankDesignTitle(preset: StudioCreatePreset): string {
  return `Untitled ${preset.label}`;
}

export function blankCanvasForPreset(preset: StudioCreatePreset) {
  return defaultCanvasDocument(preset.designType, { businessName: "Your business" });
}

export function isStudioDesignType(v: string): v is StudioDesignType {
  return (STUDIO_DESIGN_TYPES as readonly string[]).includes(v);
}

export function duplicateDesignTitle(title: string): string {
  const base = title.trim() || "Untitled";
  const next = `${base} copy`;
  return next.slice(0, 120);
}
