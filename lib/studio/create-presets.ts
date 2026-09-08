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
