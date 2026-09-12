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
import { talentAgencyWorldDefinition, managementCompanyWorldDefinition } from "./design-worlds/talent-management-worlds";
import { skincareWorldDefinition } from "./design-worlds/skincare-world";
import { foodBrandWorldDefinition, juiceBrandWorldDefinition } from "./design-worlds/food-beverage-worlds";
import { electronicsStoreWorldDefinition, supermarketWorldDefinition } from "./design-worlds/retail-worlds";
import { schoolWorldDefinition, mediaCompanyWorldDefinition } from "./design-worlds/education-media-worlds";
import { makeupBrandWorldDefinition } from "./design-worlds/makeup-brand-world";
import { creativeStudioWorldDefinition } from "./design-worlds/creative-studio-world";
import { hairBrandWorldDefinition } from "./design-worlds/hair-brand-world";
import { gymWorldDefinition } from "./design-worlds/gym-world";
import { nailStudioWorldDefinition } from "./design-worlds/nail-studio-world";
import { festivalWorldDefinition } from "./design-worlds/festival-world";
import { cafeWorldDefinition } from "./design-worlds/cafe-world";
import { yogaWorldDefinition } from "./design-worlds/yoga-world";
import { bridalWorldDefinition } from "./design-worlds/bridal-world";
import { dentalClinicWorldDefinition } from "./design-worlds/dental-clinic-world";
import { luxuryLipWorldDefinition } from "./design-worlds/luxury-lip-world";
import { architectureWorldDefinition } from "./design-worlds/architecture-world";
import { pastryWorldDefinition } from "./design-worlds/pastry-world";
import { couturiereWorldDefinition } from "./design-worlds/couturiere-world";
import { agenceVoyageWorldDefinition } from "./design-worlds/agence-voyage-world";
import { maquilleurWorldDefinition } from "./design-worlds/maquilleur-world";
import { immobilierLuxeWorldDefinition } from "./design-worlds/immobilier-luxe-world";
import { gameStudioWorldDefinition } from "./design-worlds/game-studio-world";
import { prAgencyWorldDefinition } from "./design-worlds/pr-agency-world";
import { artisteVisuelWorldDefinition } from "./design-worlds/artiste-visuel-world";
import { filmPromoWorldDefinition } from "./design-worlds/film-promo-world";
import { animalerieWorldDefinition } from "./design-worlds/animalerie-world";
import { designerPortfolioWorldDefinition } from "./design-worlds/designer-portfolio-world";
import { decoInterieurWorldDefinition } from "./design-worlds/deco-interieur-world";
import { bijouterieWorldDefinition } from "./design-worlds/bijouterie-world";
import { videoProductionWorldDefinition } from "./design-worlds/video-production-world";
import { brasserieWorldDefinition } from "./design-worlds/brasserie-world";
import { photographeEditorialWorldDefinition } from "./design-worlds/photographe-editorial-world";
import { surfCampWorldDefinition } from "./design-worlds/surf-camp-world";
import { businessCoachWorldDefinition } from "./design-worlds/business-coach-world";
import { wellnessCoachWorldDefinition } from "./design-worlds/wellness-coach-world";
import { mondayStudioWorldDefinition } from "./design-worlds/monday-studio-world";
import { mobilierWorldDefinition } from "./design-worlds/mobilier-world";
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
  {
    slug: "talent-agency",
    name: "Talent Agency",
    category: "entertainment",
    description:
      "Agence de talent — roster, casting briefs WhatsApp, représentation mannequins/acteurs/influenceurs · 5 pages",
    definition: talentAgencyWorldDefinition(),
  },
  {
    slug: "management-company",
    name: "Management Company",
    category: "entertainment",
    description:
      "Management d'artistes & créateurs — roster, brand deals, services, formulaire partenariat · 5 pages",
    definition: managementCompanyWorldDefinition(),
  },
  {
    slug: "skincare-brand",
    name: "Marque Skincare",
    category: "beauty",
    description:
      "Marque skincare peaux africaines — éducation, consultation WhatsApp, avis avec type de peau, loyalty · 6 pages",
    definition: skincareWorldDefinition(),
  },
  {
    slug: "food-brand",
    name: "Marque alimentaire",
    category: "food",
    description:
      "Marque alimentaire africaine — produits, recettes, stockistes, commande B2C et B2B · 6 pages",
    definition: foodBrandWorldDefinition(),
  },
  {
    slug: "juice-brand",
    name: "Marque de jus & boissons",
    category: "food",
    description:
      "Cold-pressed, fruits africains — gamme, ingrédients locaux, abonnement hebdomadaire, livraison matin · 5 pages",
    definition: juiceBrandWorldDefinition(),
  },
  {
    slug: "electronics-store",
    name: "Boutique high-tech",
    category: "retail",
    description:
      "Téléphones neuf/reconditionné, accessoires, réparation express — paiement en 3× Wave · 6 pages",
    definition: electronicsStoreWorldDefinition(),
  },
  {
    slug: "supermarket",
    name: "Supermarché / épicerie",
    category: "retail",
    description:
      "Courses livrées en 2h — liste WhatsApp, rayons, promotions, abonnement hebdomadaire · 5 pages",
    definition: supermarketWorldDefinition(),
  },
  {
    slug: "school",
    name: "École & établissement scolaire",
    category: "education",
    description:
      "Site d'école — programmes, admission, vie scolaire, groupe WhatsApp parents, actualités · 6 pages",
    definition: schoolWorldDefinition(),
  },
  {
    slug: "media-company",
    name: "Média & presse",
    category: "media",
    description:
      "Média digital africain — actualités, émissions, podcast, publicité brand content · 6 pages",
    definition: mediaCompanyWorldDefinition(),
  },
  {
    slug: "makeup-brand",
    name: "Marque maquillage",
    category: "beauty",
    description:
      "Marque makeup Gen-Z africaine — pigments intenses, quiz promo, filter chips, deals hebdo · 4 pages",
    definition: makeupBrandWorldDefinition(),
  },
  {
    slug: "creative-studio",
    name: "Studio créatif",
    category: "creative",
    description:
      "Studio direction artistique & photographie — portfolio éditorial, offres, brief client · 4 pages",
    definition: creativeStudioWorldDefinition(),
  },
  {
    slug: "hair-brand",
    name: "Marque capillaire",
    category: "beauty",
    description:
      "Extensions, perruques & tressage africains — annonce livraison gratuite, bestsellers FCFA, éducation, WhatsApp · 3 pages",
    definition: hairBrandWorldDefinition(),
  },
  {
    slug: "gym-fitness",
    name: "Salle de sport & fitness",
    category: "fitness",
    description:
      "Salle de sport dark neon — stats membres, disciplines, planning cours, abonnements FCFA, coaching perso · 5 pages",
    definition: gymWorldDefinition(),
  },
  {
    slug: "nail-studio",
    name: "Nail studio",
    category: "beauty",
    description:
      "Studio nail art éditorial B&W — masonry gallery, services gel/extensions FCFA, aftercare, réservation WhatsApp · 4 pages",
    definition: nailStudioWorldDefinition(),
  },
  {
    slug: "festival",
    name: "Festival de musique",
    category: "event",
    description:
      "Festival musique africaine — lineup, programme jour par jour, billets FCFA (Wave/Orange Money), camping, navettes · 5 pages",
    definition: festivalWorldDefinition(),
  },
  {
    slug: "cafe-coffee",
    name: "Café & coffee shop",
    category: "restaurant",
    description:
      "Café specialty africain — menu boissons FCFA, pâtisserie maison, brunch week-end, traiteur entreprise · 5 pages",
    definition: cafeWorldDefinition(),
  },
  {
    slug: "yoga-studio",
    name: "Studio yoga & bien-être",
    category: "fitness",
    description:
      "Studio yoga sage/ivoire — cours collectifs, planning hebdo, retraites Sine-Saloum, abonnements FCFA, premiers cours offerts · 5 pages",
    definition: yogaWorldDefinition(),
  },
  {
    slug: "bridal-styling",
    name: "Stylisme bridal",
    category: "wedding",
    description:
      "Studio bridal africain — lookbook mariage, packs stylisme FCFA, consultation gratuite, galerie masonry, formulaire RDV · 5 pages",
    definition: bridalWorldDefinition(),
  },
  {
    slug: "dental-clinic",
    name: "Clinique dentaire",
    category: "health",
    description:
      "Cabinet dentaire moderne — soins, blanchiment, implants, pédodontie, tarifs FCFA transparents, urgences WhatsApp · 5 pages",
    definition: dentalClinicWorldDefinition(),
  },
  {
    slug: "luxury-lip-brand",
    name: "Marque maquillage luxe",
    category: "beauty",
    description:
      "Marque makeup luxe éditoriale — obsidienne + or, éditions limitées, filterTags produits, WhatsApp concierge · 4 pages",
    definition: luxuryLipWorldDefinition(),
  },
  {
    slug: "architecture-studio",
    name: "Cabinet d'architecture",
    category: "architecture",
    description:
      "Atelier architecture & design d'intérieur — portfolio masonry, missions, process, équipe, formulaire projet · 5 pages",
    definition: architectureWorldDefinition(),
  },
  {
    slug: "pastry-shop",
    name: "Pâtisserie artisanale",
    category: "restaurant",
    description:
      "Pâtisserie artisanale africaine — best-sellers FCFA, wedding cakes, commandes sur-mesure, galerie masonry · 4 pages",
    definition: pastryWorldDefinition(),
  },
  {
    slug: "couturiere-atelier",
    name: "Atelier de couture",
    category: "fashion",
    description:
      "Atelier couture africain contemporain — tenues sur-mesure, mariage, cérémonie, processus 5 étapes, galerie masonry · 4 pages",
    definition: couturiereWorldDefinition(),
  },
  {
    slug: "agence-voyage",
    name: "Agence de voyage",
    category: "travel",
    description:
      "Agence voyage africaine premium — circuits Afrique, safaris, Omra tout compris, paiement Wave/Orange Money · 4 pages",
    definition: agenceVoyageWorldDefinition(),
  },
  {
    slug: "maquilleuse-freelance",
    name: "Maquilleuse professionnelle",
    category: "beauty",
    description:
      "Maquilleuse freelance Dakar — mariage, shooting, plateau TV, cours particuliers, portfolio masonry · 4 pages",
    definition: maquilleurWorldDefinition(),
  },
  {
    slug: "immobilier-luxe",
    name: "Immobilier de prestige",
    category: "real-estate",
    description:
      "Agence immobilier luxe Dakar — villas, penthouses, terrains titrés, gestion locative, formulaire projet · 4 pages",
    definition: immobilierLuxeWorldDefinition(),
  },
  {
    slug: "game-studio",
    name: "Studio de jeux vidéo",
    category: "tech",
    description:
      "Studio jeux mobile africain — neon dark, catalogue de 6+ jeux gratuits, stats 2M+ téléchargements, recrutement · 3 pages",
    definition: gameStudioWorldDefinition(),
  },
  {
    slug: "agence-communication",
    name: "Agence de communication",
    category: "agency",
    description:
      "Agence RP & communication Dakar — relations presse, influence, événementiel, forfaits FCFA, brief project form · 4 pages",
    definition: prAgencyWorldDefinition(),
  },
  {
    slug: "artiste-plasticien",
    name: "Artiste plasticien",
    category: "portfolio",
    description:
      "Portfolio beaux-arts africain — peintures, photographies, tirages à vendre, biographie, galeries internationales · 5 pages",
    definition: artisteVisuelWorldDefinition(),
  },
  {
    slug: "film-promotionnel",
    name: "Page promotionnelle film",
    category: "media",
    description:
      "Promo film africain dark cinéma — bande-annonce, synopsis, casting, critique presse, programmation salles · 3 pages",
    definition: filmPromoWorldDefinition(),
  },
  {
    slug: "animalerie-pets",
    name: "Animalerie & vétérinaire",
    category: "ecommerce",
    description:
      "Animalerie en ligne Dakar — 6 produits FCFA, conseil vétérinaire WhatsApp, livraison 24h, 4 catégories animaux · 3 pages",
    definition: animalerieWorldDefinition(),
  },
  {
    slug: "designer-portfolio",
    name: "Designer UI/UX freelance",
    category: "portfolio",
    description:
      "Portfolio designer freelance — cool minimal, 4 services, case studies, 6 forfaits FCFA, remote-friendly · 4 pages",
    definition: designerPortfolioWorldDefinition(),
  },
  {
    slug: "deco-interieur",
    name: "Studio de décoration",
    category: "architecture",
    description:
      "Studio déco d'intérieur Dakar — warm brutalist, 95+ projets masonry, processus 5 étapes, forfaits clé en main · 4 pages",
    definition: decoInterieurWorldDefinition(),
  },
  {
    slug: "bijouterie-or",
    name: "Bijouterie & joaillerie",
    category: "ecommerce",
    description:
      "Joaillerie africaine Dakar — dark opulence or 22 carats, 6 pièces FCFA avec filtres, atelier sur-mesure 5 étapes, gravure offerte · 3 pages",
    definition: bijouterieWorldDefinition(),
  },
  {
    slug: "video-production",
    name: "Agence de production vidéo",
    category: "agency",
    description:
      "Production vidéo Dakar — dark cinematic, publicité TV, clips, corporate, drone, 6 forfaits FCFA · 4 pages",
    definition: videoProductionWorldDefinition(),
  },
  {
    slug: "brasserie-artisanale",
    name: "Brasserie & bar artisanal",
    category: "food",
    description:
      "Brasserie craft Dakar — bold industrial jaune/noir, 6 bières signature FCFA avec filtres, fûts événements, happy hour · 4 pages",
    definition: brasserieWorldDefinition(),
  },
  {
    slug: "photographe-editorial",
    name: "Photographe éditorial",
    category: "portfolio",
    description:
      "Studio photo Dakar — monochrome élégant, mode/portrait/corporate/docu, 6 forfaits FCFA, galerie masonry · 4 pages",
    definition: photographeEditorialWorldDefinition(),
  },
  {
    slug: "surf-camp",
    name: "École de surf & camp",
    category: "sport",
    description:
      "Surf camp Dakar Ngor — coastal energy bleu/sable, cours débutants avancés, stage 7j, trips Casamance · 3 pages",
    definition: surfCampWorldDefinition(),
  },
  {
    slug: "business-coach",
    name: "Coach business & entrepreneur",
    category: "services",
    description:
      "Coach business Dakar — bold rouge/blanc, 6 programmes FCFA, résultats mesurables, session découverte gratuite · 4 pages",
    definition: businessCoachWorldDefinition(),
  },
  {
    slug: "wellness-coach",
    name: "Coach bien-être & développement",
    category: "services",
    description:
      "Coaching bien-être féminin Dakar — soft bordeaux/rose, nutrition holiste, retraites groupe, session découverte gratuite · 3 pages",
    definition: wellnessCoachWorldDefinition(),
  },
  {
    slug: "agence-creative-monday",
    name: "Agence créative bold",
    category: "agency",
    description:
      "Studio créatif Dakar — bold jaune/noir pop, branding motion digital, 6 services FCFA, portfolio masonry · 4 pages",
    definition: mondayStudioWorldDefinition(),
  },
  {
    slug: "mobilier-design",
    name: "Mobilier design & ameublement",
    category: "ecommerce",
    description:
      "Showroom mobilier Dakar — warm contemporary sable/bois, 6 pièces FCFA filterTags, atelier sur-mesure 4 étapes · 4 pages",
    definition: mobilierWorldDefinition(),
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
