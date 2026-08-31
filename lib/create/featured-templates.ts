/** Featured templates for hub cards and demos — shared starters only (not personal portfolio sites). */
export const FEATURED_TEMPLATES = [
  {
    slug: "musician-artist",
    name: "Musician / artist",
    category: "music",
    tagline: "Bold artist layout — your name, photos, and streaming links",
    accent: "#E8D5A3",
    pages: ["home", "music"],
  },
  {
    slug: "showcase-legally-blonde",
    name: "Motion showcase",
    category: "film",
    tagline: "Scroll layers, floating cutouts, cinematic motion",
    accent: "#FF1493",
    pages: ["home"],
  },
  {
    slug: "agency-creative",
    name: "Creative agency",
    category: "agency",
    tagline: "Services, portfolio, testimonials, FAQ — full agency page",
    accent: "#FF5500",
    pages: ["home"],
  },
  {
    slug: "production-company",
    name: "Production company",
    category: "production",
    tagline: "Events, commercials, and media production",
    accent: "#E94560",
    pages: ["home"],
  },
  {
    slug: "hair-salon",
    name: "Hair salon & barber",
    category: "beauty",
    tagline: "Services menu, gallery, WhatsApp booking",
    accent: "#D4A574",
    pages: ["home"],
  },
  {
    slug: "perfume-brand",
    name: "Perfume & fragrance",
    category: "fragrance",
    tagline: "Collections, story, stockists, WhatsApp orders",
    accent: "#C9A962",
    pages: ["home"],
  },
] as const;

export type FeaturedTemplateSlug = (typeof FEATURED_TEMPLATES)[number]["slug"];
