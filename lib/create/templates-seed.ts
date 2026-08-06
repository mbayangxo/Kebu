import type { WebsiteDefinition } from "./website-schema";

export type TemplateSeed = {
  slug: string;
  name: string;
  category: string;
  description: string;
  definition: WebsiteDefinition;
};

function baseTheme(primary = "#0F0D33", accent = "#00C851"): WebsiteDefinition["theme"] {
  return {
    primary,
    accent,
    background: "#FAFAF8",
    text: "#0F0D33",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "comfortable",
  };
}

function simpleSite(
  title: string,
  heroHeading: string,
  heroSub: string,
  featureTitle: string,
  features: { title: string; body: string }[]
): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title,
    theme: baseTheme(),
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "nav-1",
            type: "navigation",
            props: { brand: title, links: [{ label: "Home", href: "#" }, { label: "Contact", href: "#contact" }] },
          },
          {
            id: "hero-1",
            type: "hero",
            props: {
              heading: heroHeading,
              subheading: heroSub,
              buttonLabel: "Get in touch",
              buttonHref: "#contact",
              align: "center",
            },
          },
          {
            id: "feat-1",
            type: "features",
            props: { heading: featureTitle, items: features },
          },
          {
            id: "contact-1",
            type: "contact",
            props: { heading: "Contact", email: "", phone: "", address: "" },
          },
          {
            id: "wa-1",
            type: "whatsapp",
            props: { label: "Chat on WhatsApp", phone: "+221770000000", message: "Hello!" },
          },
          {
            id: "footer-1",
            type: "footer",
            props: { text: `© ${title}`, links: [] },
          },
        ],
      },
    ],
  };
}

/** Structured DB templates — not screenshots. */
export const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    slug: "fashion-atelier",
    name: "Fashion Atelier",
    category: "fashion",
    description: "Lookbook-style fashion brand site",
    definition: simpleSite(
      "Fashion Atelier",
      "Crafted for the modern African wardrobe",
      "Ready-to-wear and custom pieces with local textiles.",
      "Why us",
      [
        { title: "Local textiles", body: "Sourcing from regional weavers and makers." },
        { title: "Made to measure", body: "Fits that respect your style and climate." },
        { title: "Seasonal drops", body: "Limited collections, not endless inventory." },
      ]
    ),
  },
  {
    slug: "beauty-studio",
    name: "Beauty Studio",
    category: "beauty",
    description: "Beauty and wellness studio",
    definition: simpleSite(
      "Beauty Studio",
      "Glow that starts with care",
      "Skincare, hair, and beauty services tailored to you.",
      "Services",
      [
        { title: "Consultations", body: "Skin and hair assessments before treatment." },
        { title: "Clean products", body: "Formulas suited for local climates." },
        { title: "Bookings", body: "Simple WhatsApp booking for busy days." },
      ]
    ),
  },
  {
    slug: "restaurant-table",
    name: "Restaurant Table",
    category: "restaurant",
    description: "Restaurant / café landing page",
    definition: simpleSite(
      "Restaurant Table",
      "Flavours from our kitchen to your table",
      "Seasonal menus, warm hospitality, and dishes worth sharing.",
      "On the menu",
      [
        { title: "Daily specials", body: "Market-fresh plates that change with the season." },
        { title: "Catering", body: "Events and offices — ask via WhatsApp." },
        { title: "Private dining", body: "Intimate spaces for celebrations." },
      ]
    ),
  },
  {
    slug: "portfolio-pro",
    name: "Professional Portfolio",
    category: "portfolio",
    description: "Clean professional portfolio",
    definition: simpleSite(
      "Portfolio",
      "Work that speaks clearly",
      "Selected projects, skills, and a simple way to reach me.",
      "Focus",
      [
        { title: "Selected work", body: "Case studies with outcomes, not buzzwords." },
        { title: "Skills", body: "Tools and methods I use every week." },
        { title: "Availability", body: "Open for collaborations and contracts." },
      ]
    ),
  },
  {
    slug: "student-portfolio",
    name: "Student Portfolio",
    category: "student portfolio",
    description: "Student / early-career portfolio",
    definition: simpleSite(
      "Student Portfolio",
      "Learning in public",
      "Projects, internships, and the skills I’m building.",
      "Highlights",
      [
        { title: "Projects", body: "School and personal builds with clear goals." },
        { title: "Internship", body: "What I contributed and what I learned." },
        { title: "Next", body: "Roles and mentorship I’m looking for." },
      ]
    ),
  },
  {
    slug: "artist-gallery",
    name: "Artist Gallery",
    category: "artist",
    description: "Artist showcase",
    definition: simpleSite(
      "Artist Gallery",
      "Colour, story, and place",
      "Paintings, prints, and commissions rooted in African narratives.",
      "Studio",
      [
        { title: "Collections", body: "Series exploring memory, city, and land." },
        { title: "Commissions", body: "Custom pieces for homes and spaces." },
        { title: "Exhibitions", body: "Upcoming shows and past residencies." },
      ]
    ),
  },
  {
    slug: "event-night",
    name: "Event Night",
    category: "event",
    description: "Event / nightlife promo",
    definition: simpleSite(
      "Event Night",
      "One night. Unforgettable.",
      "Line-up, venue, and tickets — keep it simple and clear.",
      "Details",
      [
        { title: "Line-up", body: "Artists and hosts confirmed for the night." },
        { title: "Venue", body: "Location, doors, and dress code." },
        { title: "Tickets", body: "WhatsApp to reserve your spot." },
      ]
    ),
  },
  {
    slug: "hotel-stay",
    name: "Hotel Stay",
    category: "hotel",
    description: "Boutique hotel / guesthouse",
    definition: simpleSite(
      "Hotel Stay",
      "Rest well. Explore freely.",
      "Rooms, hospitality, and local experiences.",
      "Stay with us",
      [
        { title: "Rooms", body: "Clean, calm spaces for every traveller." },
        { title: "Breakfast", body: "Local flavours to start the day." },
        { title: "Concierge", body: "Tips for the neighbourhood and beyond." },
      ]
    ),
  },
  {
    slug: "agriculture-farm",
    name: "Agriculture Farm",
    category: "agriculture",
    description: "Farm / agribusiness",
    definition: simpleSite(
      "Agriculture Farm",
      "From our fields to your market",
      "Fresh produce, reliable supply, and transparent farming.",
      "What we grow",
      [
        { title: "Crops", body: "Seasonal harvests with careful handling." },
        { title: "Supply", body: "Wholesale and retail partnerships." },
        { title: "Traceability", body: "Know where your food comes from." },
      ]
    ),
  },
  {
    slug: "construction-build",
    name: "Construction Build",
    category: "construction",
    description: "Construction / contractor",
    definition: simpleSite(
      "Construction Build",
      "Built to last",
      "Residential and commercial projects delivered with care.",
      "Capabilities",
      [
        { title: "Design-build", body: "From plan to handover." },
        { title: "Renovation", body: "Upgrades that respect structure and budget." },
        { title: "Safety", body: "Site standards you can trust." },
      ]
    ),
  },
  {
    slug: "ngo-impact",
    name: "NGO Impact",
    category: "ngo",
    description: "Nonprofit / NGO",
    definition: simpleSite(
      "NGO Impact",
      "Community first",
      "Programs, transparency, and ways to get involved.",
      "Our work",
      [
        { title: "Programs", body: "Education, health, and livelihood initiatives." },
        { title: "Impact", body: "Clear metrics — not empty claims." },
        { title: "Partner", body: "Volunteer, donate, or collaborate." },
      ]
    ),
  },
  {
    slug: "professional-services",
    name: "Professional Services",
    category: "professional services",
    description: "Consulting / professional firm",
    definition: simpleSite(
      "Professional Services",
      "Clarity for complex decisions",
      "Advisory for growing African businesses.",
      "How we help",
      [
        { title: "Strategy", body: "Practical plans tied to local markets." },
        { title: "Operations", body: "Processes that scale without chaos." },
        { title: "Compliance", body: "Guidance that respects your context." },
      ]
    ),
  },
  {
    slug: "tech-startup",
    name: "Technology Startup",
    category: "technology startup",
    description: "Tech product landing page",
    definition: simpleSite(
      "Technology Startup",
      "Infrastructure for African builders",
      "Software that solves real operational problems.",
      "Product",
      [
        { title: "Core product", body: "One clear job — done reliably." },
        { title: "Security", body: "Ownership and privacy by default." },
        { title: "Roadmap", body: "Shipped in public with customer feedback." },
      ]
    ),
  },
  {
    slug: "online-store-preview",
    name: "Online Store Preview",
    category: "online store preview only",
    description: "Storefront preview layout only — not commerce checkout",
    definition: simpleSite(
      "Online Store Preview",
      "Your products, clearly presented",
      "Preview layout for a future store — checkout is a later slice.",
      "Preview",
      [
        { title: "Featured products", body: "Placeholders for catalog items." },
        { title: "Collections", body: "Group products by theme." },
        { title: "Next", body: "Connect real commerce in the store slice." },
      ]
    ),
  },
];
