/** Featured templates — May Lecor IS the Russian cutout site; K-Direction is the Wix site. No duplicate “Russian” card. */
export const FEATURED_TEMPLATES = [
  {
    slug: "musician-maylecor-ksendr",
    name: "May Lecor",
    category: "music",
    tagline: "Russian pink cutouts + Steelfish (ksendr) — the real May Lecor layout, not a separate demo",
    accent: "#E9006B",
    pages: ["home", "music", "videos", "tour", "merch", "contact"],
  },
  {
    slug: "agency-kdirection",
    name: "K-Direction",
    category: "agency",
    tagline: "Soft gradient, yellow pill nav, photo collage — the real K-Direction Wix layout",
    accent: "#FFF86B",
    pages: ["home", "about", "artists", "contact"],
  },
  {
    slug: "musician-artist",
    name: "Musician / artist (dark collage)",
    category: "music",
    tagline: "Different layout: dark artist collage — not the Russian cutouts",
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
