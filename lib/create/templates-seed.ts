import type { WebsiteDefinition } from "./website-schema";
import { defaultMaylecorHomeProps, defaultMaylecorMusicProps } from "./maylecor-defaults";
import { defaultMaylecorKsendrProps } from "./maylecor-ksendr-defaults";
import { defaultLegallyBlondeHeroProps } from "./legally-blonde-defaults";
import { maylecorMotionSitePages } from "./maylecor-site-pages";
import { kdirectionWixSitePages } from "./kdirection-site-pages";
import { dklnsWebsiteDefinition } from "./dklns-site";
import { ndaoanWebsiteDefinition } from "./ndaoan-site";
import { rectWebsiteDefinition } from "./rect-site";
import { mayjorGoodWebsiteDefinition } from "./mayjor-good-site";
import { fashionAtelierWorldDefinition } from "./design-worlds/fashion-atelier-world";
import { layersBeautyWorldDefinition } from "./design-worlds/layers-beauty-world";
import { carmineCreativeWorldDefinition } from "./design-worlds/carmine-creative-world";
import { perfumeMaisonWorldDefinition } from "./design-worlds/perfume-maison-world";
import { restaurantTableWorldDefinition } from "./design-worlds/restaurant-table-world";
import { hotelStayWorldDefinition } from "./design-worlds/hotel-stay-world";
import { marcheBoutiqueWorldDefinition } from "./design-worlds/marche-boutique-world";
import { whatsappCatalogWorldDefinition } from "./design-worlds/whatsapp-catalog-world";
import { artistDarkStageWorldDefinition, streamingLaunchWorldDefinition } from "./design-worlds/music-worlds";
import { productionHouseWorldDefinition, filmStudioWorldDefinition } from "./design-worlds/production-worlds";
import { companySiteWorldDefinition, buildTradeWorldDefinition } from "./design-worlds/business-worlds";
import { appLaunchWorldDefinition, techStartupWorldDefinition } from "./design-worlds/tech-worlds";
import { proPortfolioWorldDefinition, studentPortfolioWorldDefinition } from "./design-worlds/portfolio-worlds";
import { ngoImpactWorldDefinition, farmAgriWorldDefinition } from "./design-worlds/impact-worlds";
import { professionalServicesWorldDefinition } from "./design-worlds/agency-professional-world";
import { voltaClothingWorldDefinition } from "./design-worlds/clothing-brand-world";
import { maquisWorldDefinition } from "./design-worlds/maquis-world";
import { barbershopWorldDefinition } from "./design-worlds/barbershop-world";
import { traiteurWorldDefinition } from "./design-worlds/traiteur-world";
import { artisanWorldDefinition } from "./design-worlds/artisan-world";
import { realEstateWorldDefinition } from "./design-worlds/real-estate-world";
import { coachingWorldDefinition } from "./design-worlds/coaching-world";
import { pharmacieWorldDefinition } from "./design-worlds/pharmacie-world";
import { btpWorldDefinition } from "./design-worlds/btp-world";
import { photographeWorldDefinition } from "./design-worlds/photographe-world";
import { agenceDigitaleWorldDefinition } from "./design-worlds/agence-digitale-world";
import { musicienWorldDefinition } from "./design-worlds/musicien-world";
import { agricultureWorldDefinition } from "./design-worlds/agriculture-world";
import { ongWorldDefinition } from "./design-worlds/ong-world";
import { egliseWorldDefinition } from "./design-worlds/eglise-world";
import { legalWorldDefinition } from "./design-worlds/legal-world";
import { wholesaleWorldDefinition } from "./design-worlds/wholesale-world";
import { fashionWorldDefinition } from "./design-worlds/fashion-world";
import {
  agencyCreativeDistinctDefinition,
  artistGalleryDistinctDefinition,
  beautyStudioDistinctDefinition,
  eventNightDistinctDefinition,
  hairSalonDistinctDefinition,
  scentBoutiqueDistinctDefinition,
  streetFoodDistinctDefinition,
  digitalArtCollectiveDistinctDefinition,
  streetwearShopDistinctDefinition,
} from "./distinct-template-seeds";

/**
 * Template seeds render through SiteRenderer → `.kebu-site` responsive base.
 * New templates must work on phone/tablet/desktop (flex/%/clamp or ScaledArtboard).
 * Do not ship desktop-only fixed widths.
 */

export type TemplateSeed = {
  slug: string;
  name: string;
  category: string;
  description: string;
  definition: WebsiteDefinition;
  /**
   * public = anyone can pick in Create / demos.
   * owner_portfolio = seed used only to create your personal real sites (not a shared template).
   */
  visibility?: "public" | "owner_portfolio";
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
    headingScale: "md",
    bodySize: "md",
    letterSpacing: "normal",
  };
}

function darkTheme(accent = "#E8D5A3"): WebsiteDefinition["theme"] {
  return {
    primary: "#0a0a0a",
    accent,
    background: "#111111",
    text: "#F5F5F0",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "comfortable",
    headingScale: "md",
    bodySize: "md",
    letterSpacing: "normal",
  };
}

/** Structured DB templates — not screenshots. */
export const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    slug: "fashion-atelier",
    name: "Fashion Atelier",
    category: "fashion",
    description: "Editorial lookbook fashion brand — home, lookbook, and contact pages",
    definition: fashionAtelierWorldDefinition(),
  },
  {
    slug: "layers-beauty",
    name: "LAYERS Beauty",
    category: "beauty",
    description:
      "Organic skincare shop — home, shop, about, gallery, FAQ, journal, gifts, contact (not a generic spa page)",
    definition: layersBeautyWorldDefinition(),
  },
  {
    slug: "beauty-studio",
    name: "Beauty Studio",
    category: "beauty",
    description: "Ritual menu · gallery · WhatsApp book — multi-page studio (not a shop clone)",
    definition: beautyStudioDistinctDefinition(),
  },
  {
    slug: "restaurant-table",
    name: "Restaurant Table",
    category: "restaurant",
    description: "Restaurant / café — menu, about, reserve, FAQ (not a one-page flyer)",
    definition: restaurantTableWorldDefinition(),
  },
  // Tier 1 — West Africa high-volume
  {
    slug: "maquis",
    name: "Maquis",
    category: "restaurant",
    description:
      "Maquis / open-air eatery — daily specials, WhatsApp reservation, mobile money · 5 pages",
    definition: maquisWorldDefinition(),
  },
  {
    slug: "barbershop",
    name: "Barbershop",
    category: "beauty",
    description:
      "Urban barbershop — service tiles, before/after gallery, WhatsApp appointment · 5 pages",
    definition: barbershopWorldDefinition(),
  },
  {
    slug: "traiteur",
    name: "Traiteur",
    category: "food",
    description:
      "Event catering — package formulas, gallery, devis form, mobile money payment · 5 pages",
    definition: traiteurWorldDefinition(),
  },
  {
    slug: "artisan",
    name: "Artisan",
    category: "craft",
    description:
      "Craftmaker — product catalog, custom-order form, mobile money, WhatsApp · 5 pages",
    definition: artisanWorldDefinition(),
  },
  {
    slug: "real-estate",
    name: "Immobilier",
    category: "real-estate",
    description:
      "Property agency — listings, agent WhatsApp per listing, Wave / Orange Money deposit · 5 pages",
    definition: realEstateWorldDefinition(),
  },
  {
    slug: "coaching",
    name: "Coach",
    category: "education",
    description:
      "Business / life coach — cohort programs, enrollment form, mobile money payment · 5 pages",
    definition: coachingWorldDefinition(),
  },
  // — Tier 2 —
  {
    slug: "pharmacie",
    name: "Pharmacie",
    category: "health",
    description:
      "Pharmacy — WhatsApp prescription, home delivery, Wave / Orange Money · 5 pages",
    definition: pharmacieWorldDefinition(),
  },
  {
    slug: "btp",
    name: "BTP",
    category: "construction",
    description:
      "Construction & renovation contractor — milestone payments, before/after gallery, devis form · 5 pages",
    definition: btpWorldDefinition(),
  },
  {
    slug: "photographe",
    name: "Photographe",
    category: "creative",
    description:
      "Professional photographer — portfolio, FCFA packages, booking form, mobile money · 5 pages",
    definition: photographeWorldDefinition(),
  },
  {
    slug: "agence-digitale",
    name: "Agence Digitale",
    category: "agency",
    description:
      "Digital marketing agency — services, case studies, team, WhatsApp lead gen · 5 pages",
    definition: agenceDigitaleWorldDefinition(),
  },
  {
    slug: "musicien",
    name: "Musicien",
    category: "music",
    description:
      "Musician / artist — Boomplay & Audiomack links, events booking, merch shop · 5 pages",
    definition: musicienWorldDefinition(),
  },
  // — Tier 3 —
  {
    slug: "agriculture",
    name: "Agriculture",
    category: "agriculture",
    description:
      "Farm / producer — seasonal availability badge, bulk orders, WhatsApp delivery, Wave / Orange Money · 5 pages",
    definition: agricultureWorldDefinition(),
  },
  {
    slug: "ong",
    name: "ONG",
    category: "ngo",
    description:
      "Non-profit / NGO — projects, impact stats, donations via mobile money, volunteer signup · 5 pages",
    definition: ongWorldDefinition(),
  },
  {
    slug: "eglise",
    name: "Église",
    category: "community",
    description:
      "Church / faith community — service times, announcements, donations via Wave / Orange Money · 5 pages",
    definition: egliseWorldDefinition(),
  },
  {
    slug: "legal",
    name: "Cabinet Juridique",
    category: "legal",
    description:
      "Law firm / legal consultant — practice areas, consultation booking, FCFA fees, confidential · 5 pages",
    definition: legalWorldDefinition(),
  },
  {
    slug: "wholesale",
    name: "Grossiste",
    category: "wholesale",
    description:
      "B2B wholesale distributor — product catalog, bulk order minimums, WhatsApp price list, mobile money · 5 pages",
    definition: wholesaleWorldDefinition(),
  },
  {
    slug: "portfolio-pro",
    name: "Pro portfolio",
    category: "portfolio",
    description:
      "Freelancer portfolio — work, services, WhatsApp hire",
    definition: proPortfolioWorldDefinition(),
  },
  {
    slug: "student-portfolio",
    name: "Student portfolio",
    category: "portfolio",
    description:
      "Student portfolio — projects, skills, WhatsApp contact",
    definition: studentPortfolioWorldDefinition(),
  },
  {
    slug: "artist-gallery",
    name: "Artist Gallery",
    category: "artist",
    description: "Works-first gallery · about · exhibitions · contact",
    definition: artistGalleryDistinctDefinition(),
  },
  {
    slug: "musician-streaming",
    name: "Streaming launch",
    category: "music",
    description:
      "Listen-first launch for singles/EPs — platforms, tour, press, WhatsApp",
    definition: streamingLaunchWorldDefinition(),
  },
  {
    slug: "musician-press-kit",
    name: "Musician — Press kit (EPK)",
    category: "music",
    description: "Electronic press kit: bio, press, bookings, FAQ (Wix-style artist page B)",
    definition: {
      schemaVersion: "website-v1",
      title: "Artist EPK",
      theme: baseTheme("#0F0D33", "#F5A623"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "nav-1",
              type: "navigation",
              props: {
                brand: "Artist Name",
                links: [
                  { label: "Bio", href: "#bio" },
                  { label: "Press", href: "#press" },
                  { label: "Book", href: "#contact" },
                ],
              },
            },
            {
              id: "hero-1",
              type: "hero",
              props: {
                heading: "Electronic press kit",
                subheading: "Bio, photos, and booking details for media and promoters.",
                buttonLabel: "Download press pack",
                buttonHref: "#press",
                align: "left",
              },
            },
            {
              id: "bio-1",
              type: "text",
              props: {
                heading: "Biography",
                body: "Short bio (100 words) for playlists and blogs. Long bio (300 words) for festivals and press.",
              },
            },
            {
              id: "press-1",
              type: "features",
              props: {
                heading: "Press & assets",
                items: [
                  { title: "Press photos", body: "Link to high-res portraits and live shots." },
                  { title: "Logo & colours", body: "Brand assets for flyers and posters." },
                  { title: "Rider & tech", body: "Stage plot and hospitality — PDF link." },
                ],
              },
            },
            {
              id: "faq-1",
              type: "faq",
              props: {
                heading: "FAQ for bookers",
                items: [
                  {
                    question: "What genres do you perform?",
                    answer: "Describe your sound in plain words.",
                  },
                  {
                    question: "What do you need on stage?",
                    answer: "Backline, mics, monitors — keep it clear.",
                  },
                ],
              },
            },
            {
              id: "contact-1",
              type: "contact",
              props: {
                heading: "Management & bookings",
                email: "mgmt@example.com",
                phone: "+221000000000",
                address: "City, Country",
              },
            },
            {
              id: "footer-1",
              type: "footer",
              props: { text: "© Artist Name · Press inquiries welcome", links: [] },
            },
          ],
        },
      ],
    },
  },
  {
    slug: "music-label-roster",
    name: "Music label — roster",
    category: "music",
    description: "Small label site like K-Direction lite: roster, news, contact (builder template)",
    definition: {
      schemaVersion: "website-v1",
      title: "Your Label",
      theme: baseTheme("#0F0D33", "#00C851"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "nav-1",
              type: "navigation",
              props: {
                brand: "YOUR LABEL",
                links: [
                  { label: "Artists", href: "#artists" },
                  { label: "News", href: "#news" },
                  { label: "Contact", href: "#contact" },
                ],
              },
            },
            {
              id: "hero-1",
              type: "hero",
              props: {
                heading: "Your Label",
                subheading: "A home for artists building the next wave of African music.",
                buttonLabel: "Meet the roster",
                buttonHref: "#artists",
                align: "center",
              },
            },
            {
              id: "artists-1",
              type: "features",
              props: {
                heading: "Artists",
                items: [
                  { title: "Artist one", body: "Genre · city — link to their page." },
                  { title: "Artist two", body: "Genre · city — link to their page." },
                  { title: "Join us", body: "How to submit demos or collaborate." },
                ],
              },
            },
            {
              id: "news-1",
              type: "text",
              props: {
                heading: "News",
                body: "Releases, shows, and label updates — add your latest headlines here.",
              },
            },
            {
              id: "contact-1",
              type: "contact",
              props: {
                heading: "Contact",
                email: "mgmt@yourlabel.com",
                phone: "",
                address: "",
              },
            },
            {
              id: "footer-1",
              type: "footer",
              props: { text: "© Your Label", links: [] },
            },
          ],
        },
      ],
    },
  },
  {
    slug: "musician-maylecor-ksendr",
    name: "May Lecor",
    category: "music",
    description:
      "Owner portfolio — Russian cutout layout. Not offered as a shared user aesthetic.",
    visibility: "owner_portfolio",
    definition: {
      schemaVersion: "website-v1",
      title: "May Lecor",
      theme: {
        primary: "#E9006B",
        accent: "#E9006B",
        background: "#FFFFFF",
        text: "#111111",
        fontDisplay: "Steelfish",
        fontBody: "system-ui",
        spacing: "comfortable" as const,
        headingScale: "md" as const,
        bodySize: "md" as const,
        letterSpacing: "normal" as const,
      },
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "maylecor-ksendr-1",
              type: "legally-blonde-hero",
              props: defaultMaylecorKsendrProps("MAY LECOR"),
            },
          ],
        },
        ...maylecorMotionSitePages("MAY LECOR").filter((p) => p.slug !== "home"),
      ],
    },
  },
  {
    slug: "musician-kdirection-artist",
    name: "May Lecor (owner portfolio — not a public template)",
    category: "music",
    description:
      "Personal May Lecor artist site — created only on the owner account via portfolio seed, not offered as a shared demo.",
    visibility: "owner_portfolio",
    definition: {
      schemaVersion: "website-v1",
      title: "May Lecor",
      theme: darkTheme("#E8D5A3"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "maylecor-home-1",
              type: "maylecor-home",
              props: defaultMaylecorHomeProps("MAY LECOR"),
            },
          ],
        },
        {
          slug: "music",
          title: "Music",
          sections: [
            {
              id: "maylecor-music-1",
              type: "maylecor-music",
              props: defaultMaylecorMusicProps("MAY LECOR"),
            },
          ],
        },
      ],
    },
  },
  {
    slug: "musician-artist",
    name: "Artist dark stage",
    category: "music",
    description:
      "Senegal artist site — music, videos, shows, WhatsApp bookings (not May Lecor portfolio)",
    definition: artistDarkStageWorldDefinition(),
  },
  {
    slug: "showcase-legally-blonde",
    name: "Legally Blonde demo (same engine as May Lecor)",
    category: "film",
    description:
      "Internal demo of the cutout engine only. Prefer the May Lecor template for the full artist site.",
    visibility: "owner_portfolio",
    definition: {
      schemaVersion: "website-v1",
      title: "Legally Blonde",
      theme: {
        primary: "#FF1493",
        accent: "#FFD700",
        background: "#FFFFFF",
        text: "#111111",
        fontDisplay: "Georgia",
        fontBody: "system-ui",
        spacing: "comfortable" as const,
        headingScale: "md" as const,
        bodySize: "md" as const,
        letterSpacing: "normal" as const,
      },
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "legally-blonde-hero-1",
              type: "legally-blonde-hero",
              props: defaultLegallyBlondeHeroProps(),
            },
          ],
        },
      ],
    },
  },
  {
    slug: "film-studio",
    name: "Film studio",
    category: "film",
    description:
      "Showreel-led film studio — projects, hire crew, WhatsApp",
    definition: filmStudioWorldDefinition(),
  },
  {
    slug: "business-company",
    name: "Company site",
    category: "business",
    description:
      "Clear company site — services, about, team, WhatsApp contact",
    definition: companySiteWorldDefinition(),
  },
  {
    slug: "clothing-company",
    name: "VOLTA — Marque mode",
    category: "fashion",
    description: "Marque streetwear urbaine — collections, lookbook, commande WhatsApp & mobile money",
    definition: voltaClothingWorldDefinition(),
  },
  {
    slug: "shopping-store",
    name: "Marché Boutique",
    category: "store",
    description:
      "Senegal neighborhood shop — multipage IA, XOF products, WhatsApp / Wave / Orange Money (not fake card checkout)",
    definition: marcheBoutiqueWorldDefinition(),
  },
  {
    slug: "app-launch",
    name: "App launch",
    category: "app",
    description:
      "App launch — features, screens, waitlist, WhatsApp support",
    definition: appLaunchWorldDefinition(),
  },
  {
    slug: "public-figure",
    name: "Public figure",
    category: "public figure",
    description: "Influencer, speaker, or personality — bio, appearances, causes, and contact",
    definition: {
      schemaVersion: "website-v1",
      title: "Public Figure",
      theme: baseTheme("#1B4332", "#95D5B2"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "nav-1",
              type: "navigation",
              props: {
                brand: "Your Name",
                links: [
                  { label: "About", href: "#about" },
                  { label: "Work", href: "#work" },
                  { label: "Contact", href: "#contact" },
                ],
              },
            },
            {
              id: "hero-1",
              type: "hero",
              props: {
                heading: "Your Name",
                subheading: "Speaker · creator · advocate — one line that says who you are.",
                buttonLabel: "Book me",
                buttonHref: "#contact",
                align: "left",
              },
            },
            {
              id: "about-1",
              type: "text",
              props: {
                heading: "About",
                body: "Your story, mission, and what audiences can expect when they work with you.",
              },
            },
            {
              id: "work-1",
              type: "features",
              props: {
                heading: "Appearances & work",
                items: [
                  { title: "Speaking", body: "Conferences, schools, and panels." },
                  { title: "Media", body: "Interviews, podcasts, and features." },
                  { title: "Partnerships", body: "Brands and causes you stand behind." },
                ],
              },
            },
            {
              id: "quotes-1",
              type: "testimonials",
              props: {
                heading: "What people say",
                items: [
                  { quote: "Add a real testimonial from an event or partner.", name: "Organisation name" },
                ],
              },
            },
            {
              id: "contact-1",
              type: "contact",
              props: {
                heading: "Bookings & media",
                email: "hello@example.com",
                phone: "",
                address: "",
              },
            },
            {
              id: "wa-1",
              type: "whatsapp",
              props: {
                label: "Message on WhatsApp",
                phone: "+221770000000",
                message: "Hi, I'd like to connect.",
              },
            },
            {
              id: "footer-1",
              type: "footer",
              props: { text: "© Your Name", links: [] },
            },
          ],
        },
      ],
    },
  },
  {
    slug: "event-night",
    name: "Event Night",
    category: "event",
    description: "Line-up · tickets · venue map — nightlife promo with events section",
    definition: eventNightDistinctDefinition(),
  },
  {
    slug: "hotel-stay",
    name: "Hotel Stay",
    category: "hotel",
    description: "Boutique hotel / guesthouse — rooms, amenities, book, FAQ, contact",
    definition: hotelStayWorldDefinition(),
  },
  {
    slug: "agriculture-farm",
    name: "Farm & agri",
    category: "impact",
    description:
      "Farm storefront — produce, story, WhatsApp / Wave orders",
    definition: farmAgriWorldDefinition(),
  },
  {
    slug: "construction-build",
    name: "Build & trade",
    category: "business",
    description:
      "Contractors and trade — projects, services, WhatsApp quotes",
    definition: buildTradeWorldDefinition(),
  },
  {
    slug: "ngo-impact",
    name: "NGO & impact",
    category: "impact",
    description:
      "NGO site — mission, programs, partner, WhatsApp",
    definition: ngoImpactWorldDefinition(),
  },
  {
    slug: "professional-services",
    name: "Professional services",
    category: "agency",
    description:
      "Consulting firm — services, approach, team, WhatsApp intake",
    definition: professionalServicesWorldDefinition(),
  },
  {
    slug: "tech-startup",
    name: "Tech startup",
    category: "technology startup",
    description:
      "Startup — problem → product → pricing → WhatsApp demo",
    definition: techStartupWorldDefinition(),
  },
  {
    slug: "online-store-preview",
    name: "WhatsApp Catalog",
    category: "store",
    description:
      "Senegal chat-commerce catalog — mobile-first photos + WhatsApp order path for informal sellers",
    definition: whatsappCatalogWorldDefinition(),
  },
  {
    slug: "carmine-creative",
    name: "Carmine Creative",
    category: "agency",
    description:
      "Bold creative agency — work, services, about, journal, contact (not a one-page hero stack)",
    definition: carmineCreativeWorldDefinition(),
  },
  {
    slug: "agency-creative",
    name: "Creative agency",
    category: "agency",
    description: "Case studies · process · WhatsApp brief — multi-page agency (distinct from Carmine)",
    definition: agencyCreativeDistinctDefinition(),
  },
  {
    slug: "production-company",
    name: "Production house",
    category: "production",
    description:
      "Dakar production house — work, services, clients, WhatsApp briefs",
    definition: productionHouseWorldDefinition(),
  },
  {
    slug: "hair-salon",
    name: "Hair salon & barber",
    category: "beauty",
    description: "Menu · looks · book — multi-page salon (distinct from Beauty Studio rituals)",
    definition: hairSalonDistinctDefinition(),
  },
  {
    slug: "perfume-brand",
    name: "Perfume & fragrance",
    category: "fragrance",
    description:
      "Fragrance house — shop, story, stockists, FAQ, contact (not a one-page brochure)",
    definition: perfumeMaisonWorldDefinition(),
  },
  {
    slug: "scent-boutique",
    name: "Scent boutique",
    category: "fragrance",
    description: "Counter scents · story · visit — intimate boutique (distinct from Perfume house)",
    definition: scentBoutiqueDistinctDefinition(),
  },
  {
    slug: "street-food",
    name: "Street food & grill",
    category: "restaurant",
    description: "Fast-casual African grill — announcement bar, menu by category, WhatsApp orders (distinct from sit-down Restaurant Table)",
    definition: streetFoodDistinctDefinition(),
  },
  {
    slug: "digital-art-collective",
    name: "Digital art collective",
    category: "artist",
    description: "Dark editorial — gallery, works, commissions via WhatsApp (distinct from light Artist Gallery)",
    definition: digitalArtCollectiveDistinctDefinition(),
  },
  {
    slug: "streetwear-shop",
    name: "Streetwear shop",
    category: "fashion",
    description: "Dark urban streetwear — announcement bar, category tiles, product drops (distinct from editorial Fashion Atelier)",
    definition: streetwearShopDistinctDefinition(),
  },
  {
    slug: "fashion",
    name: "Mode / Fashion",
    category: "fashion",
    description:
      "Boutique mode West African — scroll éditorial, photo plein écran, WhatsApp «Je le veux» par produit · 5 pages",
    definition: fashionWorldDefinition(),
  },
];

/** Templates shown in Create picker, demos, and /api/templates. */
export function publicTemplateSeeds(): TemplateSeed[] {
  return TEMPLATE_SEEDS.filter((t) => t.visibility !== "owner_portfolio");
}

export function isPublicTemplateSlug(slug: string): boolean {
  const seed = TEMPLATE_SEEDS.find((t) => t.slug === slug);
  return Boolean(seed && seed.visibility !== "owner_portfolio");
}
