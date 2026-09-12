import { z } from "zod";
import { siteSeoSchema, containsUnsafeSiteContent } from "./site-seo";
import { navLinksArraySchema } from "./maylecor-nav";

export const SECTION_TYPES = [
  "navigation",
  "hero",
  "editorial-hero",
  "announcement-bar",
  "marquee",
  "split",
  "category-tiles",
  "text",
  "image",
  "gallery",
  "video",
  "audio",
  "map",
  "events",
  "features",
  "testimonials",
  "faq",
  "products",
  "quiz",
  "stats",
  "contact",
  "newsletter",
  "email-popup",
  "form",
  "blog-list",
  "whatsapp",
  "joko",
  "free-text",
  "footer",
  "maylecor-home",
  "maylecor-music",
  "legally-blonde-hero",
  "kdirection-home",
  "kdirection-page",
] as const;

export const sectionTypeSchema = z.enum(SECTION_TYPES);

export const themeSchema = z.object({
  primary: z.string().trim().max(40).default("#0F0D33"),
  accent: z.string().trim().max(40).default("#00C851"),
  background: z.string().trim().max(40).default("#FAFAF8"),
  text: z.string().trim().max(40).default("#0F0D33"),
  /** Cards / panels surface. */
  surface: z.string().trim().max(40).optional(),
  /** Links and secondary accents. */
  link: z.string().trim().max(40).optional(),
  fontDisplay: z.string().trim().max(80).default("Fraunces"),
  fontBody: z.string().trim().max(80).default("system-ui"),
  spacing: z.enum(["compact", "comfortable", "airy"]).default("comfortable"),
  /** Max content column width for standard sections. */
  contentWidth: z.enum(["narrow", "default", "wide"]).optional(),
  /** Relative heading size — Shopify-style typography scale. */
  headingScale: z.enum(["sm", "md", "lg", "xl"]).optional().default("md"),
  /** Body text size. */
  bodySize: z.enum(["sm", "md", "lg"]).optional().default("md"),
  letterSpacing: z.enum(["tight", "normal", "wide"]).optional().default("normal"),
  /** Corner radius feel for cards and buttons. */
  radius: z.enum(["sharp", "soft", "round"]).optional(),
  /** Primary button look. */
  buttonStyle: z.enum(["solid", "outline", "soft"]).optional(),
  aestheticId: z.string().trim().max(40).optional(),
  /** Custom CSS injected at root of every page (max 10 KB). */
  customCss: z.string().trim().max(10000).optional(),
  /** ISO 4217 currency code (XOF, NGN, KES, GHS, ZAR, USD, EUR…). */
  currency: z.string().trim().max(8).optional(),
});

const safeHref = z
  .string()
  .trim()
  .max(300)
  .refine(
    (v) =>
      v === "" ||
      v === "#" ||
      v.startsWith("#") ||
      v.startsWith("/") ||
      v.startsWith("https://") ||
      v.startsWith("http://") ||
      v.startsWith("mailto:") ||
      v.startsWith("tel:") ||
      /^[a-z0-9][a-z0-9-]*$/.test(v),
    { message: "Invalid URL" }
  );

const imageUrl = z.union([
  z.literal(""),
  z.string().trim().url().max(2000),
  // Same-origin public assets (e.g. /templates/maylecor/portrait.jpg)
  z
    .string()
    .trim()
    .max(2000)
    .regex(/^\/[a-zA-Z0-9._\-/]+$/, "Invalid image path"),
]);

const socialLinksSchema = z
  .array(
    z.object({
      label: z.string().trim().max(40),
      iconUrl: imageUrl,
      href: safeHref,
    }),
  )
  .max(12)
  .default([]);

/** Side social rail placement — absolute inside the site, never viewport-fixed over the builder. */
const socialRailFields = {
  socialRailVisible: z.boolean().optional().default(true),
  socialRailBg: z.string().trim().max(80).optional().default("rgba(0,0,0,0.85)"),
  socialRailLeftPct: z.number().min(0).max(95).optional().default(0),
  socialRailTopPct: z.number().min(0).max(95).optional().default(12),
  socialRailIconSize: z.number().min(16).max(80).optional().default(40),
};

/** Per-device copy/layout overrides (W9) — tablet/mobile only; desktop uses base props. */
const deviceOverridesSchema = z
  .object({
    tablet: z.record(z.string(), z.unknown()).optional(),
    mobile: z.record(z.string(), z.unknown()).optional(),
  })
  .optional();

export const sectionPropsSchemas = {
  navigation: z.object({
    brand: z.string().trim().min(1).max(80),
    links: z
      .array(z.object({
        label: z.string().trim().max(40),
        href: safeHref,
        /** Regular dropdown children (standard nav) or mega-nav columns. */
        children: z.array(z.object({
          label: z.string().trim().max(40),
          href: safeHref,
          /** Mega-nav only: second-level items shown in a column under this child. */
          grandchildren: z.array(z.object({ label: z.string().trim().max(40), href: safeHref })).max(8).optional(),
        })).max(12).optional(),
        /** Mega-nav only: column label shown above the children group. */
        columnLabel: z.string().trim().max(60).optional(),
        /** Mega-nav only: optional featured image or banner in the dropdown panel. */
        featuredImage: imageUrl.optional(),
        featuredImageAlt: z.string().trim().max(120).optional(),
      }))
      .max(12)
      .default([]),
    /**
     * standard = regular nav with simple dropdown on hover.
     * mega = full-width dropdown panel with columns per top-level link — like Fashion Nova / Best Buy.
     */
    navStyle: z.enum(["standard", "mega"]).optional().default("standard"),
    /** compact → fullscreen width; combined with navScale. */
    navSize: z.enum(["compact", "comfortable", "large", "fullscreen"]).optional().default("comfortable"),
    navScale: z.number().min(0.7).max(2.2).optional().default(1),
    /** Top bar (regular) or left side rail. */
    navLayout: z.enum(["top", "side"]).optional().default("top"),
    /** Logo / brand alignment inside the nav bar. */
    logoAlign: z.enum(["left", "center", "right"]).optional().default("left"),
    /** Whether the nav bar sticks to the top on scroll. */
    navSticky: z.boolean().optional().default(true),
    hidden: z.boolean().optional(),
    deviceOverrides: deviceOverridesSchema,
  }),
  hero: z.object({
    heading: z.string().trim().min(1).max(160),
    subheading: z.string().trim().max(400).default(""),
    buttonLabel: z.string().trim().max(60).default("Get started"),
    buttonHref: safeHref.default("#"),
    align: z.enum(["left", "center"]).default("center"),
    background: z.string().trim().max(40).optional(),
    hidden: z.boolean().optional(),
    deviceOverrides: deviceOverridesSchema,
  }),
  /** Full-bleed image/video hero with text overlay — editorial layouts and fashion templates. */
  "editorial-hero": z.object({
    heading: z.string().trim().min(1).max(160),
    subheading: z.string().trim().max(400).default(""),
    buttonLabel: z.string().trim().max(60).default(""),
    buttonHref: safeHref.default("#"),
    imageUrl: imageUrl.default(""),
    imageAlt: z.string().trim().max(160).default(""),
    /** 0–1 dark overlay opacity over the image. */
    overlayOpacity: z.number().min(0).max(1).default(0.5),
    align: z.enum(["left", "center", "right"]).default("left"),
    /** Height of the hero block as a viewport-height percentage. */
    heightVh: z.number().int().min(40).max(100).default(80),
    background: z.string().trim().max(40).optional(),
    hidden: z.boolean().optional(),
  }),
  /** Sticky top bar with a short promotional message — high contrast, attention-grabbing. */
  "announcement-bar": z.object({
    text: z.string().trim().min(1).max(200),
    /** Optional link destination when the bar is clicked. */
    href: safeHref.optional(),
    /** Background hex (e.g. "#B91C1C" for red — use a bold color per Boie pattern). */
    background: z.string().trim().max(40).optional(),
    /** Text/foreground color. */
    color: z.string().trim().max(40).optional(),
    /** Alias kept for backward-compat with templates that use textColor. */
    textColor: z.string().trim().max(40).optional(),
    /**
     * ISO datetime string — when set, the bar shows a live countdown timer.
     * E.g. "2025-12-31T23:59:59Z" → "VENTE — il reste 2h 14min 08s".
     * Great for flash sales and limited-time offers (LUXORA "SALE ENDS TODAY" pattern).
     */
    countdownTo: z.string().trim().max(30).optional(),
    countdownLabel: z.string().trim().max(80).optional(),
    /**
     * When set, the bar shows a free-shipping progress indicator.
     * E.g. freeShippingThreshold: 15000 → "Encore 8 500 FCFA pour la livraison gratuite".
     */
    freeShippingThreshold: z.number().int().min(0).optional(),
    freeShippingCurrency: z.string().trim().max(6).optional().default("FCFA"),
    freeShippingAchievedText: z.string().trim().max(120).optional(),
    hidden: z.boolean().optional(),
  }),
  /** Horizontally scrolling text ticker — brand names, product categories, mottos. */
  marquee: z.object({
    items: z.array(z.string().trim().min(1).max(80)).min(1).max(24).default(["Kebu"]),
    /** Scroll speed in pixels per second. */
    speed: z.number().int().min(5).max(200).default(40),
    background: z.string().trim().max(40).optional(),
    color: z.string().trim().max(40).optional(),
    separator: z.string().trim().max(10).optional().default("·"),
    hidden: z.boolean().optional(),
  }),
  /** Two-column image + text layout — brand story, about, product feature. */
  split: z.object({
    heading: z.string().trim().max(160).optional(),
    body: z.string().trim().max(1200).default(""),
    imageUrl: imageUrl.default(""),
    imageAlt: z.string().trim().max(160).default(""),
    imagePosition: z.enum(["left", "right"]).default("right"),
    buttonLabel: z.string().trim().max(60).optional(),
    buttonHref: safeHref.optional(),
    background: z.string().trim().max(40).optional(),
    hidden: z.boolean().optional(),
    deviceOverrides: deviceOverridesSchema,
  }),
  /** Grid of category / collection tiles — each is a clickable image + label. */
  "category-tiles": z.object({
    heading: z.string().trim().max(160).optional(),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional().default(4),
    items: z
      .array(z.object({
        label: z.string().trim().min(1).max(60),
        href: safeHref.default("#"),
        imageUrl: imageUrl.default(""),
        description: z.string().trim().max(120).optional(),
      }))
      .max(12)
      .default([]),
    hidden: z.boolean().optional(),
    deviceOverrides: deviceOverridesSchema,
  }),
  text: z.object({
    heading: z.string().trim().max(160).optional(),
    body: z.string().trim().min(1).max(2000),
    hidden: z.boolean().optional(),
    deviceOverrides: deviceOverridesSchema,
  }),
  image: z.object({
    src: imageUrl,
    alt: z.string().trim().max(160).default(""),
    caption: z.string().trim().max(200).optional(),
    hidden: z.boolean().optional(),
  }),
  gallery: z.object({
    heading: z.string().trim().max(160).optional(),
    items: z
      .array(
        z.object({
          src: z.string().trim().max(500),
          alt: z.string().trim().max(160).default(""),
          href: safeHref.optional().default(""),
        }),
      )
      .max(24)
      .default([]),
    /**
     * grid = thumbnails · single = one full-width photo · featured = first large + rest grid ·
     * carousel = horizontal scroll strip (LUXORA "Most-Loved Shades" pattern) ·
     * masonry = Pinterest-style unequal columns
     */
    layout: z.enum(["grid", "single", "featured", "carousel", "masonry"]).optional().default("grid"),
    columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().default(3),
    /**
     * Instagram handle (without @) — renders a "On the Gram" CTA card inside the grid
     * (Layers Beauty / Inspired theme pattern). Offline-first: photos are your own uploaded images.
     */
    instagramHandle: z.string().trim().max(60).optional(),
    followLabel: z.string().trim().max(60).optional().default("Suivez-nous"),
    hidden: z.boolean().optional(),
  }),
  video: z.object({
    heading: z.string().trim().max(160).optional(),
    /** Legacy single video — still works; prefer `items` for multi-video pages. */
    src: z.string().trim().max(500).optional().default(""),
    title: z.string().trim().max(120).optional(),
    caption: z.string().trim().max(200).optional(),
    /** Custom poster image (uploaded) for the legacy single video. */
    thumbnail: imageUrl.optional().default(""),
    items: z
      .array(
        z.object({
          src: z.string().trim().max(500).default(""),
          title: z.string().trim().max(120).optional().default(""),
          caption: z.string().trim().max(200).optional().default(""),
          thumbnail: imageUrl.optional().default(""),
        }),
      )
      .max(24)
      .optional()
      .default([]),
    /** grid = thumbnail cards · single = one player · featured = first large + rest as thumbs */
    layout: z.enum(["grid", "single", "featured"]).optional().default("grid"),
    columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().default(2),
    hidden: z.boolean().optional(),
  }),
  audio: z.object({
    heading: z.string().trim().max(160).optional(),
    /** Uploaded file URL, direct .mp3, or embed URL */
    src: z.string().trim().max(500).default(""),
    title: z.string().trim().max(120).optional(),
    artist: z.string().trim().max(80).optional(),
    hidden: z.boolean().optional(),
  }),
  map: z.object({
    heading: z.string().trim().max(160).default("Find us"),
    address: z.string().trim().max(240).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    zoom: z.number().int().min(1).max(18).default(14),
    hidden: z.boolean().optional(),
  }),
  events: z.object({
    heading: z.string().trim().max(160).default("Events"),
    items: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(120),
          date: z.string().trim().max(40),
          location: z.string().trim().max(120).optional(),
          description: z.string().trim().max(500).optional(),
          ticketUrl: safeHref.optional(),
        }),
      )
      .max(24)
      .default([]),
    hidden: z.boolean().optional(),
  }),
  features: z.object({
    heading: z.string().trim().max(160).default("Features"),
    subheading: z.string().trim().max(240).optional(),
    /** grid = cards · moodboard = animated mosaic tiles (May's World / artist hubs) */
    layout: z.enum(["grid", "moodboard"]).optional().default("grid"),
    /** Optional full-bleed background image behind the entire features section (image 1 pattern). */
    backgroundImageUrl: imageUrl.optional().default(""),
    background: z.string().trim().max(40).optional(),
    items: z
      .array(
        z.object({
          title: z.string().trim().max(80),
          body: z.string().trim().max(240),
          href: z.string().trim().max(500).optional(),
          image: imageUrl.optional().default(""),
          /** Per-item illustration / photo (agency case study pattern — "VELVET THEORY"). */
          imageUrl: imageUrl.optional().default(""),
          /** Icon emoji or short label displayed above the title (e.g. "⚡", "🌿", "shield"). */
          icon: z.string().trim().max(80).optional(),
        }),
      )
      .max(12)
      .default([]),
    hidden: z.boolean().optional(),
    deviceOverrides: deviceOverridesSchema,
  }),
  testimonials: z.object({
    heading: z.string().trim().max(160).default("What customers say"),
    /** Filter pill tags grouping review topics — e.g. "Hydration", "Texture & Feel". */
    topics: z.array(z.string().trim().max(60)).max(12).optional().default([]),
    items: z
      .array(z.object({
        quote: z.string().trim().max(400),
        name: z.string().trim().max(80),
        /** Short line shown under name — e.g. "Peau mixte · hyperpigmentation — Dakar". */
        role: z.string().trim().max(120).optional(),
        /** Structured: skin type (Normal, Mixte, Grasse, Sèche, Sensible). */
        skinType: z.string().trim().max(60).optional(),
        /** Structured: main skin concern. */
        skinConcern: z.string().trim().max(80).optional(),
        /** Topics this review covers — must match topics array entries for filtering. */
        reviewTopics: z.array(z.string().trim().max(60)).max(6).optional().default([]),
        verified: z.boolean().optional(),
        rating: z.number().int().min(1).max(5).optional(),
        imageUrl: imageUrl.optional().default(""),
      }))
      .max(24)
      .default([]),
    hidden: z.boolean().optional(),
  }),
  faq: z.object({
    heading: z.string().trim().max(160).default("FAQ"),
    items: z
      .array(z.object({ question: z.string().trim().max(200), answer: z.string().trim().max(800) }))
      .max(12)
      .default([]),
    /**
     * Optional "Still need help?" side panel shown next to the FAQ accordion
     * (Layers Beauty / split-FAQ pattern). Rendered as a right-hand panel with background image.
     */
    contactPanel: z.object({
      heading: z.string().trim().max(120).default("Encore des questions ?"),
      body: z.string().trim().max(300).default(""),
      buttonLabel: z.string().trim().max(60).default("Nous contacter"),
      buttonHref: safeHref.default("/contact"),
      background: z.string().trim().max(40).optional(),
      imageUrl: imageUrl.optional().default(""),
    }).optional(),
    hidden: z.boolean().optional(),
    deviceOverrides: deviceOverridesSchema,
  }),
  products: z.object({
    heading: z.string().trim().max(160).default("Products"),
    /** How products appear on the shop page. */
    layout: z.enum(["grid", "grid-dense", "list", "featured", "carousel"]).optional().default("grid"),
    /** Columns for grid layouts (ignored for list). */
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional().default(3),
    /**
     * How Place order opens — each aesthetic can pick a different checkout chrome.
     * inline = expand under product; sheet = bottom sheet; card = bordered panel; minimal = compact fields.
     */
    orderStyle: z.enum(["inline", "sheet", "card", "minimal"]).optional().default("inline"),
    orderCtaLabel: z.string().trim().max(40).optional().default("Place order"),
    items: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(120),
          description: z.string().trim().max(500).default(""),
          priceLabel: z.string().trim().max(60).default(""),
          imageUrl: imageUrl.default(""),
          whatsappMessage: z.string().trim().max(300).optional(),
          productId: z.string().uuid().optional(),
          isSubscription: z.boolean().optional(),
          subscriptionInterval: z
            .enum(["weekly", "monthly", "quarterly", "yearly"])
            .optional(),
          hasVariants: z.boolean().optional(),
          variants: z
            .array(
              z.object({
                id: z.string().uuid(),
                name: z.string().trim().max(120),
                option1: z.string().trim().max(60).default(""),
                option2: z.string().trim().max(60).default(""),
                option3: z.string().trim().max(60).default(""),
                priceLabel: z.string().trim().max(60).default(""),
                imageUrl: imageUrl.default(""),
              }),
            )
            .max(48)
            .optional(),
          /** ISO date string YYYY-MM-DD — displayed as freshness indicator on food/pharma product cards. */
          expiryDate: z.string().trim().max(10).optional(),
          /** Internal batch/lot reference for traceability. */
          batchCode: z.string().trim().max(40).optional(),
          /** Positive use cases — shown as ✓ checklist on product detail. E.g. "peaux grasses", "KP". */
          goodFor: z.array(z.string().trim().max(80)).max(8).optional().default([]),
          /** Contraindications — shown as ✗ list on product detail. */
          notGoodFor: z.array(z.string().trim().max(80)).max(6).optional().default([]),
          /** Icon+label attribute badges shown under the product (e.g. "🌿 Sans conservateurs"). */
          attributes: z.array(z.object({ icon: z.string().trim().max(4).optional(), label: z.string().trim().max(60) })).max(8).optional().default([]),
          /** Discount % shown when subscription is chosen. E.g. 10 → "Abonnement — économisez 10%". */
          subscriptionDiscount: z.number().int().min(1).max(50).optional(),
          /** "You might also like" — product names to surface as cross-sells (display only). */
          crossSells: z.array(z.string().trim().max(120)).max(4).optional().default([]),
          /** Short badge shown on the product card corner. E.g. "NOUVEAU", "PROMO", "EXCLUSIF EN LIGNE". */
          badge: z.string().trim().max(40).optional(),
          /** Comparison/original price shown struck-through beside current price. E.g. "24 000 FCFA". */
          valuePriceLabel: z.string().trim().max(60).optional(),
          /** Category tags used by client-side filter chips. E.g. ["visage", "hydratation"]. */
          filterTags: z.array(z.string().trim().max(40)).max(6).optional().default([]),
        }),
      )
      .max(24)
      .default([]),
    /** Label above the filter chip bar. E.g. "Filtrer par gamme". Shown only when items have filterTags. */
    filterLabel: z.string().trim().max(80).optional(),
    /**
     * Optional promotional banner card inserted into the product grid.
     * E.g. "Commandez 3 produits → livraison gratuite" — high contrast, like Sephora's bonus-points card.
     */
    promoBanner: z
      .object({
        text: z.string().trim().min(1).max(200),
        subtext: z.string().trim().max(120).optional(),
        background: z.string().trim().max(40).optional(),
        color: z.string().trim().max(40).optional(),
        /** Which grid position to insert it (0-indexed). Default: after 2nd product. */
        insertAfterIndex: z.number().int().min(0).max(23).optional().default(2),
      })
      .optional(),
    hidden: z.boolean().optional(),
    deviceOverrides: deviceOverridesSchema,
  }),
  /**
   * Interactive product-finder / consultation quiz.
   * Each step asks one question; the final step fires a pre-filled WhatsApp message
   * containing all answers so the merchant can recommend products personally.
   */
  quiz: z.object({
    heading: z.string().trim().max(160).default("Trouvez votre routine"),
    subheading: z.string().trim().max(240).default(""),
    /** Label on the final WhatsApp send button. */
    ctaLabel: z.string().trim().max(60).default("Voir ma recommandation sur WhatsApp"),
    /** Merchant WhatsApp number (E.164, digits only). */
    whatsappPhone: z.string().trim().max(20).default(""),
    /** Prefix prepended to the WhatsApp message before answers. */
    whatsappIntro: z.string().trim().max(200).default("Bonjour, voici mes réponses au quiz :"),
    /**
     * "discount-gate" = single-question quiz that unlocks a promo code on completion
     * (Blume "Mystery Discount" pattern — great for capturing engagement before first order).
     * "recommender" = multi-step quiz showing an inline product recommendation on the page
     * (Blume "What are you looking for?" pattern).
     * "whatsapp" = default — all answers go into a pre-filled WhatsApp message.
     */
    mode: z.enum(["whatsapp", "recommender", "discount-gate"]).optional().default("whatsapp"),
    /** discount-gate only: the promo code to reveal after answering (sent via WhatsApp). */
    discountCode: z.string().trim().max(40).optional(),
    /** discount-gate only: teaser text before the code is revealed. */
    discountTeaser: z.string().trim().max(160).optional().default("Répondez pour débloquer votre code promo"),
    steps: z
      .array(
        z.object({
          id: z.string().trim().min(1).max(40),
          question: z.string().trim().min(1).max(200),
          /** Single-choice option list. */
          options: z.array(z.string().trim().min(1).max(80)).min(2).max(8),
          /** Emoji or short icon shown next to this step in the progress rail. */
          icon: z.string().trim().max(4).optional(),
          /**
           * recommender mode only: maps each option (by index) to a product name to recommend.
           * E.g. { "0": "Sérum Éclat", "1": "Crème Hydratante Légère" }
           */
          recommendations: z.record(z.string(), z.string().trim().max(120)).optional(),
        }),
      )
      .min(1)
      .max(6)
      .default([
        { id: "skin_type", question: "Quel est votre type de peau ?", options: ["Normale", "Mixte", "Grasse", "Sèche", "Sensible"], icon: "🌿" },
        { id: "concern", question: "Votre priorité principale ?", options: ["Éclat & teint unifié", "Hydratation profonde", "Anti-taches", "Anti-âge", "Pores & points noirs"], icon: "✨" },
        { id: "routine", question: "Votre routine actuelle ?", options: ["Je débute", "Routine simple (2–3 soins)", "Routine complète", "Soins naturels uniquement"], icon: "🕐" },
      ]),
    hidden: z.boolean().optional(),
  }),
  /**
   * Numbers/achievements strip — social proof for agencies, freelancers, coaches.
   * PORTUM portfolio pattern: "3,460+ Clients · 1,452+ Projects · 15+ Years of Experience".
   */
  stats: z.object({
    heading: z.string().trim().max(160).optional(),
    subheading: z.string().trim().max(240).optional(),
    layout: z.enum(["row", "grid"]).optional().default("row"),
    items: z
      .array(z.object({
        value: z.string().trim().min(1).max(40),
        label: z.string().trim().min(1).max(80),
        /** Optional suffix appended to value: "+" → "1 452+". */
        suffix: z.string().trim().max(10).optional(),
        /** Optional prefix: ">" or "+". */
        prefix: z.string().trim().max(10).optional(),
      }))
      .min(1)
      .max(8)
      .default([]),
    /**
     * Optional certification/accreditation badge floating beside the stats.
     * E.g. "Certified UX Professional", "ISO 9001", "Google Partner".
     */
    badge: z.object({
      label: z.string().trim().min(1).max(80),
      background: z.string().trim().max(40).optional(),
      color: z.string().trim().max(40).optional(),
    }).optional(),
    background: z.string().trim().max(40).optional(),
    hidden: z.boolean().optional(),
  }),
  contact: z.object({
    heading: z.string().trim().max(160).default("Contact"),
    email: z.union([z.literal(""), z.string().trim().email().max(254)]).optional(),
    phone: z.string().trim().max(40).optional(),
    address: z.string().trim().max(240).optional(),
    hidden: z.boolean().optional(),
  }),
  newsletter: z.object({
    heading: z.string().trim().max(160).default("Stay in the loop"),
    subheading: z.string().trim().max(240).default("Get updates, offers, and news by email."),
    buttonLabel: z.string().trim().max(40).default("Subscribe"),
    successMessage: z.string().trim().max(160).default("Thanks — you're on the list."),
    hidden: z.boolean().optional(),
  }),
  form: z.object({
    heading: z.string().trim().max(160).default("Contact us"),
    subheading: z
      .string()
      .trim()
      .max(240)
      .default("Send a message — we reply on WhatsApp or email."),
    buttonLabel: z.string().trim().max(40).default("Send"),
    successMessage: z.string().trim().max(160).default("Thanks — we received your message."),
    notifyEmail: z.union([z.literal(""), z.string().trim().email().max(254)]).optional(),
    fields: z
      .array(
        z.object({
          id: z.string().trim().min(1).max(40),
          label: z.string().trim().min(1).max(80),
          type: z.enum(["text", "email", "phone", "textarea", "select"]).default("text"),
          required: z.boolean().default(false),
          placeholder: z.string().trim().max(120).default(""),
          options: z.array(z.string().trim().max(60)).max(12).default([]),
        }),
      )
      .min(1)
      .max(12)
      .default([
        { id: "name", label: "Your name", type: "text", required: true, placeholder: "", options: [] },
        { id: "email", label: "Email", type: "email", required: false, placeholder: "", options: [] },
        { id: "message", label: "Message", type: "textarea", required: true, placeholder: "", options: [] },
      ]),
    hidden: z.boolean().optional(),
  }),
  "blog-list": z.object({
    heading: z.string().trim().max(160).default("Blog"),
    subheading: z.string().trim().max(240).default("News and updates from our team."),
    postsPerPage: z.number().int().min(1).max(12).default(6),
    hidden: z.boolean().optional(),
  }),
  /** Overlay: cookie/privacy consent and/or email capture (persists via localStorage + DB list). */
  "email-popup": z.object({
    enabled: z.boolean().optional().default(true),
    mode: z.enum(["email", "consent", "both"]).default("both"),
    heading: z.string().trim().max(160).default("Stay in the loop"),
    body: z
      .string()
      .trim()
      .max(400)
      .default("Get offers by email. We respect your inbox — unsubscribe anytime."),
    buttonLabel: z.string().trim().max(40).default("Subscribe"),
    dismissLabel: z.string().trim().max(40).default("No thanks"),
    consentLabel: z
      .string()
      .trim()
      .max(200)
      .default("I agree to cookies needed for this site to work."),
    acceptConsentLabel: z.string().trim().max(40).default("Accept"),
    successMessage: z.string().trim().max(160).default("You're on the list."),
    delaySeconds: z.number().int().min(0).max(60).default(4),
    /** Days before showing again after dismiss (0 = every visit until accept). */
    remindAfterDays: z.number().int().min(0).max(365).default(14),
    hidden: z.boolean().optional(),
  }),
  whatsapp: z.object({
    label: z.string().trim().max(60).default("Chat on WhatsApp"),
    phone: z.string().trim().min(5).max(40),
    message: z.string().trim().max(200).optional(),
    hidden: z.boolean().optional(),
  }),
  joko: z.object({
    label: z.string().trim().max(60).default("Payer via Joko"),
    /** Joko merchant phone or identifier (E.164 digits only). */
    phone: z.string().trim().max(40).default(""),
    /** Optional direct Joko pay link (overrides phone-based link). */
    jokoPayLink: z.string().trim().max(500).optional(),
    message: z.string().trim().max(200).optional(),
    hidden: z.boolean().optional(),
  }),
  "free-text": z.object({
    heading: z.string().trim().max(160).optional(),
    minHeight: z.number().int().min(120).max(2400).default(420),
    backgroundImage: imageUrl.optional().default(""),
    blocks: z
      .array(
        z.object({
          id: z.string().trim().min(1).max(80),
          text: z.string().trim().max(2000).default(""),
          x: z.number().min(0).max(100).default(8),
          y: z.number().min(0).max(100).default(8),
          width: z.number().min(15).max(100).default(84),
          fontSize: z.enum(["sm", "md", "lg", "xl", "hero"]).default("md"),
          align: z.enum(["left", "center", "right"]).default("left"),
          color: z.string().trim().max(40).optional().default(""),
          /** Empty / omitted = site display font from Aesthetic Editor. */
          fontFamily: z.string().trim().max(80).optional().default(""),
        }),
      )
      .max(24)
      .default([]),
    hidden: z.boolean().optional(),
  }),
  footer: z.object({
    text: z.string().trim().max(240).default(""),
    links: z
      .array(z.object({ label: z.string().trim().max(40), href: safeHref }))
      .max(6)
      .default([]),
    bgColor: z.string().trim().max(32).optional(),
    textColor: z.string().trim().max(32).optional(),
    hidden: z.boolean().optional(),
  }),
  "maylecor-home": z.object({
    artistName: z.string().trim().min(1).max(80),
    backgroundImage: imageUrl,
    portraitMain: imageUrl,
    collageTop: imageUrl,
    collageMiddle: imageUrl,
    logoBanner: imageUrl,
    bottomLeft: imageUrl,
    bottomRight: imageUrl,
    logoSmall: imageUrl,
    ctaLabel: z.string().trim().min(1).max(120),
    musicPageSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(40).default("music"),
    homeLogoHref: safeHref.default("#top"),
    socialLinks: socialLinksSchema,
    ...socialRailFields,
    motionEnabled: z.boolean().optional().default(true),
    hidden: z.boolean().optional(),
  }),
  "maylecor-music": z.object({
    artistName: z.string().trim().min(1).max(80),
    albumArt: imageUrl,
    homePageSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(40).default("home"),
    tracks: z
      .array(
        z.object({
          id: z.string().trim().min(1).max(40),
          title: z.string().trim().min(1).max(120),
          coverUrl: imageUrl.optional().default(""),
          links: z
            .array(
              z.object({
                platform: z.enum(["spotify", "apple", "youtube", "soundcloud", "other"]),
                href: safeHref.optional().default(""),
              }),
            )
            .max(8)
            .default([]),
        }),
      )
      .max(24)
      .optional()
      .default([]),
    socialLinks: socialLinksSchema,
    ...socialRailFields,
    motionEnabled: z.boolean().optional().default(true),
    hidden: z.boolean().optional(),
  }),
  "legally-blonde-hero": z.object({
    title: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().max(500),
    brandLabel: z.string().trim().max(80).optional(),
    backgroundLayer: imageUrl,
    titleLogo: imageUrl,
    cutoutLeft: imageUrl,
    cutoutRight: imageUrl,
    cutoutAccent: imageUrl,
    cutoutSparkle: imageUrl.optional().default(""),
    macbook: imageUrl,
    sparkleGif: imageUrl.optional().default(""),
    heroPhoto: imageUrl,
    accentColor: z.string().trim().max(40).default("#e9006b"),
    /** Steelfish = Russian original; swap to Oswald/Bebas/etc in editor. */
    displayFont: z.string().trim().max(80).optional().default("Steelfish"),
    motionEnabled: z.boolean().optional().default(true),
    navLinks: navLinksArraySchema.optional().default([]),
    /** Top nav size: compact / comfortable / large / fullscreen (edge-to-edge). */
    navSize: z.enum(["compact", "comfortable", "large", "fullscreen"]).optional().default("comfortable"),
    /** Extra scale on nav type & padding (0.7–2.2). */
    navScale: z.number().min(0.7).max(2.2).optional().default(1),
    /** Top bar (regular) or left side rail. */
    navLayout: z.enum(["top", "side"]).optional().default("top"),
    /**
     * How top nav labels render: words · built-in icons · custom photos/icons per link.
     * Per-link iconUrl always wins when set.
     */
    navDisplay: z.enum(["text", "icons", "photos"]).optional().default("text"),
    /** Small May logo in the upper chrome (click → home). Empty + showChromeLogo false = hidden. */
    chromeLogo: imageUrl.optional().default(""),
    showChromeLogo: z.boolean().optional().default(true),
    socialLinks: socialLinksSchema.optional().default([]),
    ...socialRailFields,
    /** Pixel nudges for Tilda layers while editing (keyed by layer id). */
    layerMoves: z
      .record(z.string(), z.object({ dx: z.number().min(-2000).max(2000), dy: z.number().min(-2000).max(2000) }))
      .optional()
      .default({}),
    /** Absolute % positions for builder canvas layers (preferred over layerMoves for edit canvas). */
    layerPositions: z
      .record(
        z.string(),
        z.object({
          leftPct: z.number().min(-20).max(110),
          topPct: z.number().min(-20).max(110),
        }),
      )
      .optional()
      .default({}),
    /** Scale multipliers for layers / cutouts (1 = default). Mouse-resize writes here. */
    layerScales: z
      .record(z.string(), z.number().min(0.15).max(3))
      .optional()
      .default({}),
    /** Per-layer motion: spin / float / bob / none. */
    layerMotions: z
      .record(z.string(), z.enum(["spin", "float", "bob", "none"]))
      .optional()
      .default({}),
    /** Click-through links for built-in cutout slots (keyed by prop name, e.g. cutoutLeft). */
    layerLinks: z
      .record(z.string().trim().min(1).max(40), safeHref)
      .optional()
      .default({}),
    /** Paint order for built-in cutout slots + extras (1 = back, 80 = front). */
    layerZIndex: z
      .record(z.string().trim().min(1).max(40), z.number().int().min(1).max(80))
      .optional()
      .default({}),
    /** Built-in cutout keys the founder removed (do not fall back to Russian assets). */
    hiddenLayers: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
    /** Solid accent color only — no photo background. */
    backgroundHidden: z.boolean().optional().default(false),
    /** Extra user cutouts on the hero artboard (drag / upload / delete). */
    extraCutouts: z
      .array(
          z.object({
          id: z.string().trim().min(1).max(40),
          src: imageUrl,
          alt: z.string().trim().max(120).optional().default(""),
          href: safeHref.optional().default(""),
          topPct: z.number().min(-20).max(110).default(30),
          leftPct: z.number().min(-20).max(110).default(40),
          widthPct: z.number().min(4).max(80).default(14),
          rotate: z.number().min(-45).max(45).optional().default(0),
          zIndex: z.number().int().min(1).max(40).optional().default(12),
          /** city = scrolls behind May; figure = stays forward; none = fixed. */
          parallaxRole: z.enum(["city", "figure", "none"]).optional().default("none"),
        }),
      )
      .max(12)
      .optional()
      .default([]),
    ctaLabel: z.string().trim().max(80).optional(),
    ctaHref: safeHref.optional(),
    appearance: z.enum(["light", "dark"]).optional(),
    showExtras: z.boolean().optional().default(false),
    /** viewport = single-screen hero (nav to other pages). parallax = Russian-style scroll scene. */
    scrollMode: z.enum(["viewport", "parallax"]).optional().default("parallax"),
    /** false = use titleLogo image (May Lècor circle seal); true = CircularBrandRing text. */
    titleAsText: z.boolean().optional().default(false),
    hidden: z.boolean().optional(),
  }),
  "kdirection-home": z.object({
    brandLine1: z.string().trim().max(12).default("K"),
    brandLine2: z.string().trim().max(40).default("DIRECTION"),
    showMirrorLogo: z.boolean().optional().default(true),
    mission: z.string().trim().max(400).default(""),
    backgroundImage: imageUrl.optional().default(""),
    /** Exact Wix multi-radial CSS gradient (editable). */
    backgroundCss: z.string().trim().max(4000).optional().default(""),
    showOverlay: z.boolean().optional().default(false),
    overlayOpacity: z.number().min(0).max(0.9).optional().default(0),
    gradientFrom: z.string().trim().max(40).default("#f8bcfa"),
    gradientVia: z.string().trim().max(40).default("#c9c6ff"),
    gradientTo: z.string().trim().max(40).default("#93c3ff"),
    logoColor: z.string().trim().max(40).optional().default("#FFFFFF"),
    logoMirrorColor: z.string().trim().max(40).optional().default("#F5C4B8"),
    displayFont: z.string().trim().max(80).optional().default("Oswald"),
    navButtonBg: z.string().trim().max(40).optional().default("#FFF86B"),
    logoImage: imageUrl.optional().default(""),
    showHomeIcon: z.boolean().optional().default(true),
    showArrows: z.boolean().optional().default(true),
    featuredArtistName: z.string().trim().max(80).default(""),
    featuredArtistImage: imageUrl.optional().default(""),
    featuredArtistHref: safeHref.default("/artists"),
    newsCardLabel: z.string().trim().max(40).default("News"),
    newsCardHref: safeHref.default("/news"),
    brandCardLabel: z.string().trim().max(40).default("K-DIRECTION"),
    brandCardHref: safeHref.default("/about"),
    collagePhotos: z
      .array(
        z.object({
          src: imageUrl,
          alt: z.string().trim().max(80).optional().default(""),
          href: safeHref.optional().default(""),
          rotate: z.number().min(-60).max(60).default(0),
          topPct: z.number().min(-20).max(120).default(10),
          leftPct: z.number().min(-20).max(120).default(10),
          widthPct: z.number().min(6).max(55).default(16),
          zIndex: z.number().int().min(1).max(50).optional().default(3),
          /** Per-device layout overrides — edit in tablet/phone preview, publish responsively. */
          tablet: z
            .object({
              rotate: z.number().min(-60).max(60).optional(),
              topPct: z.number().min(-20).max(120).optional(),
              leftPct: z.number().min(-20).max(120).optional(),
              widthPct: z.number().min(6).max(55).optional(),
              zIndex: z.number().int().min(1).max(50).optional(),
              hidden: z.boolean().optional(),
            })
            .optional(),
          mobile: z
            .object({
              rotate: z.number().min(-60).max(60).optional(),
              topPct: z.number().min(-20).max(120).optional(),
              leftPct: z.number().min(-20).max(120).optional(),
              widthPct: z.number().min(6).max(55).optional(),
              zIndex: z.number().int().min(1).max(50).optional(),
              hidden: z.boolean().optional(),
            })
            .optional(),
        }),
      )
      .max(12)
      .optional()
      .default([]),
    navLinks: navLinksArraySchema.default([]),
    navSize: z.enum(["compact", "comfortable", "large", "fullscreen"]).optional().default("comfortable"),
    navScale: z.number().min(0.7).max(2.2).optional().default(1),
    navLayout: z.enum(["top", "side"]).optional().default("top"),
    socialLinks: socialLinksSchema.default([]),
    footerText: z.string().trim().max(160).default(""),
    motionEnabled: z.boolean().optional().default(true),
    hidden: z.boolean().optional(),
  }),
  "kdirection-page": z.object({
    title: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().max(240).optional().default(""),
    body: z.string().trim().max(4000).default(""),
    heroImage: imageUrl.optional().default(""),
    backgroundImage: imageUrl.optional().default(""),
    backgroundCss: z.string().trim().max(4000).optional().default(""),
    showOverlay: z.boolean().optional().default(false),
    overlayOpacity: z.number().min(0).max(0.9).optional().default(0.35),
    displayFont: z.string().trim().max(80).optional().default("Oswald"),
    navButtonBg: z.string().trim().max(40).optional().default("#FFF86B"),
    ctaLabel: z.string().trim().max(80).optional().default(""),
    ctaHref: safeHref.optional().default(""),
    navLinks: navLinksArraySchema.default([]),
    navSize: z.enum(["compact", "comfortable", "large", "fullscreen"]).optional().default("comfortable"),
    navScale: z.number().min(0.7).max(2.2).optional().default(1),
    navLayout: z.enum(["top", "side"]).optional().default("top"),
    socialLinks: socialLinksSchema.default([]),
    footerText: z.string().trim().max(160).default(""),
    hidden: z.boolean().optional(),
  }),
} as const;

export const websiteSectionSchema = z
  .object({
    id: z.string().trim().min(1).max(80).optional(),
    type: sectionTypeSchema,
    props: z.record(z.string(), z.unknown()),
  })
  .superRefine((val, ctx) => {
    const schema = sectionPropsSchemas[val.type];
    const parsed = schema.safeParse(val.props);
    if (!parsed.success) {
      ctx.addIssue({
        code: "custom",
        message: `Invalid props for section type ${val.type}: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
        path: ["props"],
      });
    }
  });

export const websitePageSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60),
  title: z.string().trim().min(1).max(120),
  sections: z.array(websiteSectionSchema).min(1).max(40),
});

export const websiteDefinitionSchema = z.object({
  schemaVersion: z.literal("website-v1"),
  title: z.string().trim().min(1).max(120),
  theme: themeSchema,
  seo: siteSeoSchema.optional(),
  pages: z.array(websitePageSchema).min(1).max(12),
});

export type WebsiteDefinition = z.infer<typeof websiteDefinitionSchema>;
export type ThemeTokens = z.infer<typeof themeSchema>;

export function validateWebsiteDefinition(input: unknown): {
  ok: true;
  data: WebsiteDefinition;
} | { ok: false; error: string; issues?: unknown } {
  const parsed = websiteDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Website schema validation failed.", issues: parsed.error.flatten() };
  }

  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const page of parsed.data.pages) {
    if (slugs.has(page.slug)) {
      return { ok: false, error: `Duplicate page slug: ${page.slug}` };
    }
    slugs.add(page.slug);
    for (const section of page.sections) {
      if (section.id) {
        if (ids.has(section.id)) return { ok: false, error: `Duplicate section id: ${section.id}` };
        ids.add(section.id);
      }
      // Sanitize: reject script-like content in text fields
      const blob = JSON.stringify(section.props);
      if (containsUnsafeSiteContent(blob)) {
        return { ok: false, error: "Unsafe content detected in section props." };
      }
    }
  }
  return { ok: true, data: parsed.data };
}

export const createWebsiteBriefSchema = z.object({
  mode: z.enum(["blank", "template", "ai", "photos"]),
  /** Optional — link a Kebu ID business later from Business or project settings. */
  businessId: z.string().uuid().optional(),
  businessName: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(10).max(1000),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  locale: z.string().trim().min(2).max(12).default("en"),
  desiredPages: z.array(z.string().trim().max(40)).max(8).default(["home"]),
  visualDirection: z.string().trim().max(240).optional(),
  templateSlug: z.string().trim().max(80).optional(),
  /** A4 — public image URLs from draft photo upload (required when mode is photos). */
  photoUrls: z
    .array(
      z.union([
        z.string().trim().url().max(500),
        z
          .string()
          .trim()
          .max(500)
          .regex(/^\/[a-zA-Z0-9._\-/]+$/),
      ]),
    )
    .max(8)
    .optional(),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(48)
    .optional(),
});

export type CreateWebsiteBrief = z.infer<typeof createWebsiteBriefSchema>;

/** Optional instruction when improving an existing draft site with AI. */
export const aiImproveBriefSchema = z.object({
  /**
   * A5 redesign · A6 page/section · A7 rewrite copy · A8 convert/mobile.
   * Modes shape the default instruction when the user picks a chip.
   */
  mode: z.enum(["redesign", "page", "rewrite", "convert", "free"]).optional().default("free"),
  instruction: z
    .string()
    .trim()
    .max(800)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  focusSectionTypes: z
    .array(sectionTypeSchema)
    .max(8)
    .optional(),
  /** Target page slug for A6 generate/rewrite on one page. */
  focusPageSlug: z.string().trim().max(80).optional(),
});

export type AiImproveBrief = z.infer<typeof aiImproveBriefSchema>;
