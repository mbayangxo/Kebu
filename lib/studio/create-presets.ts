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
  group: "social" | "print" | "web" | "document";
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
    id: "business_card",
    label: "Business card",
    designType: "business_card",
    description: "1050 × 600",
    ...artboardSize("business_card"),
    group: "print",
  },
  {
    id: "tiktok_video_cover",
    label: "TikTok video cover",
    designType: "tiktok_video_cover",
    description: "1080 × 1920",
    ...artboardSize("tiktok_video_cover"),
    group: "social",
  },
  {
    id: "linkedin_post",
    label: "LinkedIn post",
    designType: "linkedin_post",
    description: "1200 × 1200",
    ...artboardSize("linkedin_post"),
    group: "social",
  },
  {
    id: "pinterest_pin",
    label: "Pinterest pin",
    designType: "pinterest_pin",
    description: "1000 × 1500",
    ...artboardSize("pinterest_pin"),
    group: "social",
  },
  {
    id: "twitter_post",
    label: "X / Twitter post",
    designType: "twitter_post",
    description: "1200 × 675",
    ...artboardSize("twitter_post"),
    group: "social",
  },
  {
    id: "menu",
    label: "Menu",
    designType: "menu",
    description: "Letter-ish print",
    ...artboardSize("menu"),
    group: "print",
  },
  {
    id: "youtube_thumbnail",
    label: "YouTube thumbnail",
    designType: "youtube_thumbnail",
    description: "1280 × 720",
    ...artboardSize("youtube_thumbnail"),
    group: "web",
  },
  {
    id: "youtube_banner",
    label: "YouTube channel banner",
    designType: "youtube_banner",
    description: "2560 × 1440",
    ...artboardSize("youtube_banner"),
    group: "web",
  },
  {
    id: "linkedin_banner",
    label: "LinkedIn banner",
    designType: "linkedin_banner",
    description: "1584 × 396",
    ...artboardSize("linkedin_banner"),
    group: "web",
  },
  {
    id: "pitch_deck_slide",
    label: "Pitch deck slide",
    designType: "pitch_deck_slide",
    description: "1920 × 1080",
    ...artboardSize("pitch_deck_slide"),
    group: "document",
  },
  {
    id: "proposal",
    label: "Proposal",
    designType: "proposal",
    description: "Letter-ish print",
    ...artboardSize("proposal"),
    group: "document",
  },
  {
    id: "resume",
    label: "Resume / CV",
    designType: "resume",
    description: "Letter-ish print",
    ...artboardSize("resume"),
    group: "document",
  },
  {
    id: "invoice",
    label: "Invoice",
    designType: "invoice",
    description: "Letter-ish print",
    ...artboardSize("invoice"),
    group: "document",
  },
  {
    id: "digital_planner",
    label: "Digital planner",
    designType: "digital_planner",
    description: "1536 × 2048",
    ...artboardSize("digital_planner"),
    group: "document",
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
