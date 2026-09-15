import { AESTHETIC_THEME_PRICE_LABEL, AESTHETIC_THEME_PRICE_USD_CENTS } from "@/lib/create/aesthetic-pricing";
import { USER_AESTHETICS_BY_TYPE } from "@/lib/create/user-aesthetics-catalog";
import { TEMPLATE_CARD_VISUALS, type TemplateCardVisual } from "@/lib/create/template-visuals";
import { getGalleryTemplates } from "@/lib/create/template-gallery";

/** Business story + included pages for each aesthetic — shown on the detail page. */
const AESTHETIC_BUSINESS_META: Record<string, { story: string; pages: string[] }> = {
  "musician-artist": {
    story: "Konan Martial is a Nouchi rapper from Abidjan who needed a booking page his fans could share. This aesthetic gives him a dark stage feel with shows, videos, and a WhatsApp link for event organisers.",
    pages: ["Home", "Music & videos", "Shows", "Contact"],
  },
  "musician-streaming": {
    story: "Daya K just dropped her debut EP and wants streaming links, a tour schedule, and press photos in one place. Minimal and fast on 3G.",
    pages: ["Home", "Listen", "Tour", "Press"],
  },
  "carmine-creative": {
    story: "Carmine is a brand and digital agency in Dakar with 8 people. Their clients are FMCG brands and pan-African startups. Bold red, work grid, and a brief form that goes straight to WhatsApp.",
    pages: ["Home", "Work", "Agency", "Brief us"],
  },
  "professional-services": {
    story: "Awa Mbaye is a chartered accountant in Abidjan who consults SMEs on tax and compliance. Clean, trustworthy — WhatsApp intake form pre-filled with service categories.",
    pages: ["Home", "Services", "About", "Contact"],
  },
  "production-company": {
    story: "Ndaoan Production shoots commercials, music videos, and corporate events across West Africa. Showreel on the home page, WhatsApp brief for new projects.",
    pages: ["Home", "Portfolio", "Services", "Brief"],
  },
  "film-studio": {
    story: "Studio Félix is a film house in Ouagadougou making short films for international festivals. Full-bleed film stills, crew hiring, and a slate of current productions.",
    pages: ["Home", "Films", "Crew", "Contact"],
  },
  "hair-salon": {
    story: "Salon Fatou has 3 chairs in Treichville, Abidjan. Services menu with XOF prices, WhatsApp booking link, and hours — the full booking flow happens on WhatsApp.",
    pages: ["Home", "Services & prices", "Gallery", "Book now"],
  },
  "layers-beauty": {
    story: "LAYERS is a Dakar skincare brand selling shea butter serums and ritual kits. Products ship across West Africa via Joko, payment by Wave.",
    pages: ["Home", "Shop", "Rituals", "About", "Gift sets"],
  },
  "perfume-brand": {
    story: "Maison Brume crafts artisanal perfumes inspired by Sahel landscapes — oud, vetiver, baobab. Stockists in Dakar and Paris. Shop online with Wave.",
    pages: ["Home", "Fragrances", "Stockists", "Story", "Contact"],
  },
  "scent-boutique": {
    story: "Un Soir à Conakry is a small boutique in Kaloum selling 12 house-blended scents. Intimate feel, story-driven pages, WhatsApp for custom orders.",
    pages: ["Home", "Scents", "Our story", "Visit us"],
  },
  "fashion-atelier": {
    story: "Atelier Sira Diallo makes made-to-measure wax and bazin pieces in Bamako. Editorial lookbook, measurement guide, and WhatsApp for fittings.",
    pages: ["Home", "Lookbook", "Order", "About"],
  },
  "clothing-company": {
    story: "VOLTA is a streetwear brand out of Accra. Catalog with sizes and XOF/GHS prices, brand story, and a WhatsApp order flow.",
    pages: ["Home", "Catalog", "Brand", "Order"],
  },
  "shopping-store": {
    story: "Marché Boutique is a neighborhood shop in the Plateau district, Dakar — household goods, dry foods, cleaning products. Customers order on WhatsApp, pay by Wave, get same-day delivery.",
    pages: ["Home", "Shop", "About us", "Contact", "FAQ"],
  },
  "online-store-preview": {
    story: "Aminata sells handmade baskets and fabric directly from WhatsApp. This catalog gives her a link she can share in WhatsApp groups — products, prices in XOF, and an order button.",
    pages: ["Home", "Catalog", "How to order"],
  },
  "restaurant-table": {
    story: "Restaurant Le Maquis in Cocody has a terrace and a full menu. Diners scan a QR code to see the menu, then click WhatsApp to reserve their table for the evening.",
    pages: ["Home", "Menu", "Reserve", "About", "Find us"],
  },
  "hotel-stay": {
    story: "Hôtel Étoile du Sahel in Saint-Louis has 18 rooms overlooking the river. Room types, amenities, seasonal rates, and a WhatsApp booking button.",
    pages: ["Home", "Rooms", "Amenities", "Rates", "Contact"],
  },
  "business-company": {
    story: "Groupe Sahel Conseil is a Dakar-based consulting firm — IT infrastructure, HR, and supply chain for francophone Africa. Clean company site with service pages and WhatsApp contact.",
    pages: ["Home", "Services", "Team", "About", "Contact"],
  },
  "construction-build": {
    story: "IBRAHIMA BTP is a contractor based in Thiès who builds residential and commercial projects. Portfolio of past builds, services, and a WhatsApp quote request.",
    pages: ["Home", "Projects", "Services", "Quote", "Contact"],
  },
  "app-launch": {
    story: "Kolé is a mobile app for peer-to-peer mobile money transfers across ECOWAS. App screenshots, feature highlights, iOS/Android waitlist, and press kit.",
    pages: ["Home", "Features", "Download", "Pricing", "Press"],
  },
  "tech-startup": {
    story: "Sunu Track is a Dakar startup building GPS fleet tracking for SME logistics. Problem → product story, pricing in XOF, and a demo booking form.",
    pages: ["Home", "Product", "Pricing", "About", "Contact"],
  },
  "portfolio-pro": {
    story: "Ibou Diallo is a UI/UX designer in Abidjan with 5 years of work. Case studies, client logos, skills, and a WhatsApp hire button.",
    pages: ["Home", "Work", "About", "Hire me"],
  },
  "student-portfolio": {
    story: "Marème is a final-year marketing student at ISG Dakar building her first professional portfolio. Projects, skills, CV download, and LinkedIn link.",
    pages: ["Home", "Projects", "Skills", "Contact"],
  },
  "ngo-impact": {
    story: "Jeunesse Solidaire is a Bamako-based NGO supporting young entrepreneurs in the informal economy with micro-loans and mentorship. Donors give via Orange Money.",
    pages: ["Home", "Mission", "Programs", "Impact", "Partner with us"],
  },
  "agriculture-farm": {
    story: "Ferme Kouyaté grows mango, cashew, and moringa in the Sine-Saloum region. Restaurants and traders order directly via WhatsApp, pay by Wave. Seasonal produce calendar included.",
    pages: ["Home", "Produce", "Order", "About", "Seasons"],
  },
  "luxury-rtw": {
    story: "Maison Diallo is a Dakar-based ready-to-wear house — structured tailoring and embroidered wax pieces sold in their Plateau atelier and online. Editorial lookbook, stockist map, and made-to-order enquiries by WhatsApp.",
    pages: ["Home", "Collection", "Stockists", "About the house", "Contact"],
  },
  "accessories-maison": {
    story: "ÉDITION is a Lagos accessories brand — resin earrings, brass cuffs, and embossed leather bags made by local artisans. Product drops announced on Instagram; orders via WhatsApp, shipped across Africa with Wave.",
    pages: ["Home", "Shop", "Artisans", "About", "Wholesale"],
  },
  "streetwear-drop": {
    story: "BLOC is an Accra streetwear label doing one drop per quarter — 100 pieces, every time. Countdown timer on the homepage, email waitlist, size guide, and a WhatsApp VIP list for early access.",
    pages: ["Home", "Current drop", "Archive", "Waitlist", "Size guide"],
  },
  "activewear-studio": {
    story: "STRIDE is a Nairobi activewear brand for runners and gym-goers across East Africa. Performance tights, sports bras, and training kits. Shop online, pay via M-Pesa or Wave, free shipping over KES 5,000.",
    pages: ["Home", "Shop", "Training", "About", "Size guide"],
  },
};

export type AestheticGalleryItem = {
  slug: string;
  name: string;
  tagline: string;
  type: string;
  typeLabel: string;
  accent: string;
  previewImage?: string;
  previewGradient: string;
  wordmark?: string;
  badge?: string;
  cardVisual: TemplateCardVisual;
  detailPath: string;
  demoPath: string;
  usePath: string;
  priceCents: number;
  priceLabel: string;
  /** Real African business this aesthetic represents — shown on detail page */
  businessStory?: string;
  /** Pages bundled with this aesthetic */
  includedPages?: string[];
};

export type AestheticGalleryGroup = {
  type: string;
  label: string;
  items: AestheticGalleryItem[];
};

/** Aesthetic Gallery: curated pairs with distinct layout chrome per look. */
export function getAestheticGalleryGroups(): AestheticGalleryGroup[] {
  const bySlug = new Map(getGalleryTemplates().map((t) => [t.slug, t]));

  return USER_AESTHETICS_BY_TYPE.map((group) => ({
    type: group.type,
    label: group.label,
    items: group.pair.map((p) => {
      const visual = TEMPLATE_CARD_VISUALS[p.slug];
      const gallery = bySlug.get(p.slug);
      const gradient =
        visual?.previewGradient ??
        `linear-gradient(145deg, ${p.accent}33 0%, ${p.accent} 55%, #0A0A0A 100%)`;
      const cardVisual: TemplateCardVisual = visual ?? {
        previewGradient: gradient,
        badge: group.label,
        keywords: [group.type],
        layout: "generic",
        wordmark: p.name.split(" ")[0]?.toUpperCase(),
      };
      const biz = AESTHETIC_BUSINESS_META[p.slug];
      return {
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        type: group.type,
        typeLabel: group.label,
        accent: p.accent,
        previewImage: cardVisual.previewImage ?? `/aesthetic-photos/${p.slug}/hero.jpg`,
        previewGradient: gradient,
        wordmark: cardVisual.wordmark ?? p.name.split(" ")[0]?.toUpperCase(),
        badge: cardVisual.badge ?? group.label,
        cardVisual,
        detailPath: `/create/aesthetics/${encodeURIComponent(p.slug)}`,
        demoPath: gallery?.demoPath ?? `/create/demo/${encodeURIComponent(p.slug)}`,
        usePath: gallery?.usePath ?? `/create/new?aesthetic=${encodeURIComponent(p.slug)}`,
        priceCents: AESTHETIC_THEME_PRICE_USD_CENTS,
        priceLabel: AESTHETIC_THEME_PRICE_LABEL,
        businessStory: biz?.story,
        includedPages: biz?.pages,
      };
    }),
  }));
}

export function getAestheticGalleryItem(slug: string): AestheticGalleryItem | null {
  for (const group of getAestheticGalleryGroups()) {
    const hit = group.items.find((i) => i.slug === slug);
    if (hit) return hit;
  }
  return null;
}

export function listAestheticGallerySlugs(): string[] {
  return getAestheticGalleryGroups().flatMap((g) => g.items.map((i) => i.slug));
}
