/**
 * Real, substantial content — not a duplicate of anything. Checked against
 * both other "WEALTH_PATHS"-named identifiers in this codebase before
 * concluding that: app/compare/page.tsx's local array is just 7 short label
 * strings feeding a different data source (lib/data/migration-data.ts's
 * route-vs-local-path comparison numbers), and app/starts/page.tsx's two
 * locals are `Object.keys()` of an icon lookup for displaying submitted
 * "Start" stories. Neither overlaps this file's actual content (milestones,
 * programs, prefilled goals per persona) — they were only ever name-alike,
 * renamed to WEALTH_PATH_LABELS / WEALTH_PATH_FILTER_OPTIONS to stop that
 * confusion. This file itself has no importer anywhere and no page renders
 * it — it needs a real UI home (a "pick your path" explainer is the shape
 * this data is clearly built for) before it does anything, which is new
 * feature work, not a fix.
 */
export interface WealthPath {
  id: string;
  persona: string;
  emoji: string;
  tagline: string;
  startingCapital: string;
  timelineMonths: number;
  potentialRevenue: string;
  description: string;
  milestones: {
    label: string;
    detail: string;
    unlock: string;
  }[];
  programs: string[];
  prefilledGoal: string;
}

export const WEALTH_PATHS: WealthPath[] = [
  {
    id: "beauty",
    persona: "Beauty Founder",
    emoji: "💄",
    tagline: "Products → Brand → Region",
    startingCapital: "$500–$2,000",
    timelineMonths: 18,
    potentialRevenue: "$3,000–$15,000/month",
    description: "Build an African beauty brand — from a kitchen recipe to regional distribution.",
    milestones: [
      { label: "Register the business", detail: "Under $50 in most countries, 1–2 weeks", unlock: "Access to government programs" },
      { label: "Launch on social media", detail: "WhatsApp + Instagram storefront before any physical location", unlock: "First paying customers" },
      { label: "Apply for DER/FJ or NEIP", detail: "Government loans at 5–9% interest, no collateral under $3,000", unlock: "Capital for bulk production" },
      { label: "Win a procurement contract", detail: "Hotels, clinics, and government offices need cosmetics supplies", unlock: "Recurring revenue stream" },
      { label: "Export to the diaspora market", detail: "African beauty products sell at premium prices globally", unlock: "3–5× margin expansion" },
    ],
    programs: ["DER/FJ Women's Fund", "Tony Elumelu Foundation", "Afreximbank Creative Africa"],
    prefilledGoal: "Build a beauty brand that sells across West Africa and exports to the diaspora",
  },
  {
    id: "farmer",
    persona: "Farmer",
    emoji: "🌾",
    tagline: "Land → Cooperative → Export",
    startingCapital: "$200–$1,000",
    timelineMonths: 24,
    potentialRevenue: "$2,000–$20,000/season",
    description: "Turn your land (or access to land) into a structured agribusiness with export potential.",
    milestones: [
      { label: "Join a farmers cooperative", detail: "Aggregated volume unlocks better prices and bulk input access", unlock: "Collective bargaining" },
      { label: "Get certified land title", detail: "Required for most agricultural loans as collateral", unlock: "Loan eligibility" },
      { label: "Apply for an agri DFI loan", detail: "FIDA, AgroPME, or BOI AgriSME at 5–12% interest rates", unlock: "Equipment and inputs" },
      { label: "Supply to an anchor processor", detail: "Off-take agreements provide stable, predictable income", unlock: "Bankable revenue history" },
      { label: "Certify for export markets", detail: "Organic, GlobalGAP, or EU certifications open premium buyers", unlock: "International contracts" },
    ],
    programs: ["AfDB Agricultural Fund", "BOI Agric SME", "ECOWAS Agricultural Financing", "FIDA"],
    prefilledGoal: "Turn my farm into a structured agribusiness that exports to regional and international markets",
  },
  {
    id: "tech",
    persona: "Tech Founder",
    emoji: "💻",
    tagline: "MVP → Traction → Investment → Scale",
    startingCapital: "$0–$500",
    timelineMonths: 12,
    potentialRevenue: "$5,000–$50,000/month",
    description: "Build an African tech startup from idea to investment-ready in under 12 months.",
    milestones: [
      { label: "Build a working MVP", detail: "No-code tools work — Bubble, Glide, Softr — launch in 30 days", unlock: "First users" },
      { label: "Get 50 paying users", detail: "Even $5/month proves market demand exists", unlock: "Accelerator eligibility" },
      { label: "Apply to YouthConnekt or TEF", detail: "Win $5,000–$10,000 in non-dilutive capital plus mentorship", unlock: "12 months runway" },
      { label: "Apply to Seedstars or Founders Factory", detail: "$200K–$500K pre-seed investment with go-to-market support", unlock: "Scale capital" },
      { label: "Expand to 3+ countries", detail: "AfCFTA framework simplifies cross-border data and payments", unlock: "Series A readiness" },
    ],
    programs: ["YouthConnekt Africa", "Seedstars Africa", "Founders Factory Africa", "Tony Elumelu Foundation"],
    prefilledGoal: "Build a tech startup with users in 3+ African countries and raise $200K in investment",
  },
  {
    id: "creator",
    persona: "Creator",
    emoji: "🎬",
    tagline: "Content → Audience → Brand Deals → IP",
    startingCapital: "$0–$200",
    timelineMonths: 12,
    potentialRevenue: "$1,000–$10,000/month",
    description: "Build a content business — music, film, photography, or video — and monetize your African story globally.",
    milestones: [
      { label: "Pick a format and stay consistent", detail: "One platform, one topic, 90 days of content to build audience", unlock: "10,000+ followers" },
      { label: "Register a company for your IP", detail: "Protects your work and enables brand deal contracts", unlock: "Sponsorship income" },
      { label: "Monetize through brand deals", detail: "African brands need creators who reach African and diaspora audiences", unlock: "Steady monthly income" },
      { label: "Apply to Afreximbank Creative Africa", detail: "Project financing for African creative ventures up to $50M", unlock: "Production budget" },
      { label: "License to streaming platforms", detail: "Distribute music and film globally for passive royalty income", unlock: "Passive revenue" },
    ],
    programs: ["Afreximbank Creative Africa", "YouthConnekt", "WIPO Creative Economy Program"],
    prefilledGoal: "Build a content business around African stories and culture that earns global brand deals and licensing revenue",
  },
  {
    id: "manufacturer",
    persona: "Manufacturer",
    emoji: "🏭",
    tagline: "Register → Loan → Contract → Scale",
    startingCapital: "$1,000–$5,000",
    timelineMonths: 24,
    potentialRevenue: "$10,000–$100,000/month",
    description: "Build a manufacturing business that supplies to government contracts, retailers, and regional buyers.",
    milestones: [
      { label: "Formalize and register", detail: "Business registration plus tax ID is mandatory for any contract", unlock: "Contract eligibility" },
      { label: "Get a manufacturing loan", detail: "BOI, SEFA, or BNI CI fund equipment at 5–12% interest", unlock: "Production capacity" },
      { label: "Get quality certification", detail: "NAFDAC, SON, or ISO certification required for government supply", unlock: "Large buyer access" },
      { label: "Win a government supply contract", detail: "Start with small-value tenders to build a track record", unlock: "Revenue history" },
      { label: "Supply regionally via AfCFTA", detail: "Reduced tariffs for African-made goods across 54 countries", unlock: "10× market size" },
    ],
    programs: ["BOI Manufacturing Loan", "SEFA SME Fund", "BNI Fonds PME", "Africa50"],
    prefilledGoal: "Build a manufacturing business that wins government procurement contracts and exports via AfCFTA",
  },
  {
    id: "fashion",
    persona: "Fashion Brand",
    emoji: "👗",
    tagline: "Design → Brand → Market → Export",
    startingCapital: "$300–$2,000",
    timelineMonths: 18,
    potentialRevenue: "$2,000–$20,000/month",
    description: "Build an authentic African fashion brand that sells online, in boutiques, and internationally.",
    milestones: [
      { label: "Build the brand identity", detail: "Name, logo, story rooted in your heritage — authenticity is the advantage", unlock: "Brand recognition" },
      { label: "Launch online first", detail: "Shopify plus Instagram is enough to generate your first $10,000", unlock: "Proof of market" },
      { label: "Apply to TEF or DER/FJ", detail: "Fund production runs, fabric sourcing, and seasonal marketing", unlock: "Scale collection" },
      { label: "Get into a major retailer or boutique", detail: "One anchor retail partner builds credibility fast", unlock: "Wholesale revenue" },
      { label: "Export through AfCFTA", detail: "Duty-free access to 1.3 billion people across Africa", unlock: "Regional brand status" },
    ],
    programs: ["Tony Elumelu Foundation", "DER/FJ Women's Fund", "Afreximbank Creative Africa"],
    prefilledGoal: "Build an African fashion brand that sells to the diaspora and exports across the continent via AfCFTA",
  },
  {
    id: "exporter",
    persona: "Exporter",
    emoji: "🚢",
    tagline: "Source → Certify → Trade Route → Scale",
    startingCapital: "$1,000–$5,000",
    timelineMonths: 18,
    potentialRevenue: "$20,000–$200,000/year",
    description: "Take an African product — shea, cashew, textile, spice, or craft — and build a profitable export business.",
    milestones: [
      { label: "Identify your product and source", detail: "Find what your country produces at quality and volume", unlock: "Reliable supply chain" },
      { label: "Get export certifications", detail: "Phytosanitary, organic, or quality certs open premium international markets", unlock: "International buyer access" },
      { label: "Use AfCFTA to reduce tariffs", detail: "Protocol on Trade in Goods eliminates duties across member states", unlock: "Pan-African export routes" },
      { label: "Apply for Afreximbank trade finance", detail: "Export pre-finance and buyer credit at competitive rates", unlock: "Working capital" },
      { label: "Secure an anchor buyer contract", detail: "EU, Middle East, and diaspora buyers pay 2–5× local prices", unlock: "Predictable annual revenue" },
    ],
    programs: ["Afreximbank Trade Finance", "ECOWAS Trade Fund", "IFC Export Finance"],
    prefilledGoal: "Build an export business taking African products to international markets at premium prices",
  },
];
