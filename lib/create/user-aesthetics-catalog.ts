/**
 * User-facing aesthetics gallery — exactly 2 looks per business type.
 * Owner portfolio (May Lecor, K-Direction, DkLNS, Ndaoan, RECT, For The Mayjor Good) is NOT listed here.
 *
 * `lockedTypes` = pairs that passed design review — do not swap for generic clones.
 */

/** Business types whose pair is locked after exceptional worlds ship. */
export const LOCKED_AESTHETIC_TYPES = [
  "beauty",
  "agency",
  "fashion",
  "fragrance",
  "food",
  "store",
  "music",
  "production",
  "business",
  "tech",
  "portfolio",
  "impact",
] as const;

export type LockedAestheticType = (typeof LOCKED_AESTHETIC_TYPES)[number];

export function isAestheticTypeLocked(type: string): boolean {
  return (LOCKED_AESTHETIC_TYPES as readonly string[]).includes(type);
}

export const USER_AESTHETICS_BY_TYPE = [
  {
    type: "music",
    label: "Music & artists",
    pair: [
      { slug: "musician-artist", name: "Artist dark stage", tagline: "Music · videos · shows · WhatsApp book", accent: "#E8D5A3" },
      { slug: "musician-streaming", name: "Streaming launch", tagline: "Listen hub + tour for new releases", accent: "#1DB954" },
    ],
  },
  {
    type: "agency",
    label: "Agency & services",
    pair: [
      { slug: "carmine-creative", name: "Carmine Creative", tagline: "Bold agency · work + brief", accent: "#C1121F" },
      { slug: "professional-services", name: "Professional services", tagline: "Consulting firm · WhatsApp intake", accent: "#457B9D" },
    ],
  },
  {
    type: "production",
    label: "Production & film",
    pair: [
      { slug: "production-company", name: "Production house", tagline: "Commercials & events · WhatsApp brief", accent: "#E94560" },
      { slug: "film-studio", name: "Film studio", tagline: "Showreel · hire crew", accent: "#FF1493" },
    ],
  },
  {
    type: "beauty",
    label: "Beauty & salon",
    pair: [
      { slug: "hair-salon", name: "Hair salon & barber", tagline: "Menu + WhatsApp booking", accent: "#D4A574" },
      { slug: "layers-beauty", name: "LAYERS Beauty", tagline: "Skincare shop · rituals · gifts", accent: "#C4786A" },
    ],
  },
  {
    type: "fragrance",
    label: "Fragrance",
    pair: [
      { slug: "perfume-brand", name: "Maison Brume", tagline: "Fragrance house · shop + stockists", accent: "#C9A962" },
      { slug: "scent-boutique", name: "Scent boutique", tagline: "Intimate shop + story", accent: "#8B5E6B" },
    ],
  },
  {
    type: "fashion",
    label: "Fashion",
    pair: [
      { slug: "fashion-atelier", name: "Fashion atelier", tagline: "Editorial lookbook", accent: "#1A1A2E" },
      { slug: "clothing-company", name: "Clothing brand", tagline: "Catalog + brand story", accent: "#B91C1C" },
    ],
  },
  {
    type: "store",
    label: "Shop & store",
    pair: [
      {
        slug: "shopping-store",
        name: "Marché Boutique",
        tagline: "Neighborhood shop · XOF + WhatsApp / Wave",
        accent: "#1B4332",
      },
      {
        slug: "online-store-preview",
        name: "WhatsApp Catalog",
        tagline: "Mobile catalog for chat sellers",
        accent: "#0D9488",
      },
    ],
  },
  {
    type: "food",
    label: "Food & hospitality",
    pair: [
      { slug: "restaurant-table", name: "Restaurant", tagline: "Menu + reserve via WhatsApp", accent: "#BC6C25" },
      { slug: "hotel-stay", name: "Hotel & stay", tagline: "Rooms, amenities, contact", accent: "#1E3A5F" },
    ],
  },
  {
    type: "business",
    label: "Business",
    pair: [
      { slug: "business-company", name: "Company site", tagline: "Services · about · WhatsApp contact", accent: "#457B9D" },
      { slug: "construction-build", name: "Build & trade", tagline: "Projects + quotes for contractors", accent: "#78716C" },
    ],
  },
  {
    type: "tech",
    label: "Tech & apps",
    pair: [
      { slug: "app-launch", name: "App launch", tagline: "Features · screens · waitlist", accent: "#4361EE" },
      { slug: "tech-startup", name: "Tech startup", tagline: "Problem → product → pricing", accent: "#312E81" },
    ],
  },
  {
    type: "portfolio",
    label: "Portfolio",
    pair: [
      { slug: "portfolio-pro", name: "Pro portfolio", tagline: "Work grid · hire on WhatsApp", accent: "#6D597A" },
      { slug: "student-portfolio", name: "Student portfolio", tagline: "Projects · skills · contact", accent: "#7C3AED" },
    ],
  },
  {
    type: "impact",
    label: "Impact & community",
    pair: [
      { slug: "ngo-impact", name: "NGO & impact", tagline: "Mission · programs · partner", accent: "#588157" },
      { slug: "agriculture-farm", name: "Farm & agri", tagline: "Produce · WhatsApp / Wave orders", accent: "#3F6212" },
    ],
  },
] as const;

export type UserAestheticType = (typeof USER_AESTHETICS_BY_TYPE)[number]["type"];

export function userFeaturedAesthetics(): {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  accent: string;
  type: string;
}[] {
  return USER_AESTHETICS_BY_TYPE.flatMap((group) =>
    group.pair.map((p) => ({
      slug: p.slug,
      name: p.name,
      category: group.type,
      tagline: p.tagline,
      accent: p.accent,
      type: group.type,
    })),
  );
}

export function userAestheticSlugs(): string[] {
  return userFeaturedAesthetics().map((a) => a.slug);
}

/** Owner portfolio aesthetics — real sites, not offered in Aesthetic Gallery. */
export const OWNER_PORTFOLIO_AESTHETIC_SLUGS = [
  "musician-maylecor-ksendr",
  "agency-kdirection",
  "agency-dklns",
  "production-ndaoan-house",
  "entertainment-rect",
  "foundation-mayjor-good",
  "musician-kdirection-artist",
  "showcase-legally-blonde",
] as const;
