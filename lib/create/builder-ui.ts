/** Builder UI tokens — warm, modern, not generic SaaS gray/navy. */
export const BUILDER = {
  bg: "#FFFBF7",
  surface: "#FFFFFF",
  surfaceMuted: "#FFF8F2",
  ink: "#0A0A0A",
  muted: "#5C5348",
  faint: "#8A8074",
  border: "rgba(10,10,10,0.08)",
  borderStrong: "rgba(10,10,10,0.12)",
  shadow: "0 12px 40px rgba(255, 85, 0, 0.07)",
  shadowSoft: "0 4px 24px rgba(10, 10, 10, 0.04)",
  orange: "#FF5500",
  orangeGlow: "rgba(255, 85, 0, 0.12)",
  gradient: "linear-gradient(135deg, #FF5500 0%, #FF7733 50%, #E10600 100%)",
  yandeGradient: "linear-gradient(160deg, #FFF8F2 0%, #FFFFFF 45%, #FFF3EB 100%)",
} as const;

export const YANDE_SUGGESTIONS_CREATE = [
  "Fashion brand in Dakar — bold, mobile-first, WhatsApp orders",
  "Music artist site with streaming links and tour dates",
  "Restaurant with menu, photos, and reservation button",
  "Creative agency portfolio for West African clients",
] as const;

export const YANDE_SUGGESTIONS_IMPROVE = [
  "Make the hero clearer for young customers in Dakar",
  "Add a WhatsApp call-to-action on every page",
  "Use warmer, more confident language",
  "Highlight our best products above the fold",
] as const;

/** Curated section types for the editor — not every internal type at once. */
export const BUILDER_QUICK_SECTIONS: { type: string; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "free-text", label: "Moveable text layout" },
  { type: "image", label: "Image" },
  { type: "gallery", label: "Photo grid" },
  { type: "video", label: "Video" },
  { type: "audio", label: "Music / audio" },
  { type: "products", label: "Products" },
  { type: "features", label: "Features" },
  { type: "testimonials", label: "Quotes" },
  { type: "faq", label: "FAQ" },
  { type: "contact", label: "Contact" },
  { type: "newsletter", label: "Email list" },
  { type: "whatsapp", label: "WhatsApp" },
  { type: "events", label: "Events" },
  { type: "map", label: "Map" },
  { type: "hero", label: "Hero banner" },
];
