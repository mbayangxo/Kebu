/** Featured templates for hub cards and demos — three flagship site layouts first, then shared starters. */
export const FEATURED_TEMPLATES = [
  {
    slug: "showcase-legally-blonde",
    name: "Russian cutout showcase",
    category: "film",
    tagline: "Pink Russian layers, Steelfish type, floating Elle cutouts (ksendr-style)",
    accent: "#E9006B",
    pages: ["home"],
  },
  {
    slug: "musician-maylecor-ksendr",
    name: "May Lecor — motion artist",
    category: "music",
    tagline: "Same Russian motion layout as the live May site — music pages + social rail",
    accent: "#E9006B",
    pages: ["home", "music", "videos", "tour", "merch", "contact"],
  },
  {
    slug: "agency-kdirection",
    name: "K-Direction — Wix canvas",
    category: "agency",
    tagline: "Soft gradient, yellow pill nav, scattered photo collage — label site",
    accent: "#FFF86B",
    pages: ["home", "about", "artists", "contact"],
  },
  {
    slug: "musician-artist",
    name: "Musician / artist (dark collage)",
    category: "music",
    tagline: "Bold dark artist layout — swap your name, photos, and streaming links",
    accent: "#E8D5A3",
    pages: ["home", "music"],
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
