import { z } from "zod";
import { siteSeoSchema, containsUnsafeSiteContent } from "./site-seo";

export const SECTION_TYPES = [
  "navigation",
  "hero",
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
  "contact",
  "newsletter",
  "whatsapp",
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
  fontDisplay: z.string().trim().max(80).default("Fraunces"),
  fontBody: z.string().trim().max(80).default("system-ui"),
  spacing: z.enum(["compact", "comfortable", "airy"]).default("comfortable"),
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

export const sectionPropsSchemas = {
  navigation: z.object({
    brand: z.string().trim().min(1).max(80),
    links: z
      .array(z.object({ label: z.string().trim().max(40), href: safeHref }))
      .max(8)
      .default([]),
    hidden: z.boolean().optional(),
  }),
  hero: z.object({
    heading: z.string().trim().min(1).max(160),
    subheading: z.string().trim().max(400).default(""),
    buttonLabel: z.string().trim().max(60).default("Get started"),
    buttonHref: safeHref.default("#"),
    align: z.enum(["left", "center"]).default("center"),
    background: z.string().trim().max(40).optional(),
    hidden: z.boolean().optional(),
  }),
  text: z.object({
    heading: z.string().trim().max(160).optional(),
    body: z.string().trim().min(1).max(2000),
    hidden: z.boolean().optional(),
  }),
  image: z.object({
    src: imageUrl,
    alt: z.string().trim().max(160).default(""),
    caption: z.string().trim().max(200).optional(),
    hidden: z.boolean().optional(),
  }),
  gallery: z.object({
    items: z
      .array(z.object({ src: z.string().trim().max(500), alt: z.string().trim().max(160).default("") }))
      .max(12)
      .default([]),
    hidden: z.boolean().optional(),
  }),
  video: z.object({
    heading: z.string().trim().max(160).optional(),
    src: z.string().trim().max(500).default(""),
    title: z.string().trim().max(120).optional(),
    caption: z.string().trim().max(200).optional(),
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
    items: z
      .array(z.object({ title: z.string().trim().max(80), body: z.string().trim().max(240) }))
      .max(8)
      .default([]),
    hidden: z.boolean().optional(),
  }),
  testimonials: z.object({
    heading: z.string().trim().max(160).default("What customers say"),
    items: z
      .array(z.object({ quote: z.string().trim().max(400), name: z.string().trim().max(80) }))
      .max(8)
      .default([]),
    hidden: z.boolean().optional(),
  }),
  faq: z.object({
    heading: z.string().trim().max(160).default("FAQ"),
    items: z
      .array(z.object({ question: z.string().trim().max(200), answer: z.string().trim().max(800) }))
      .max(12)
      .default([]),
    hidden: z.boolean().optional(),
  }),
  products: z.object({
    heading: z.string().trim().max(160).default("Products"),
    items: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(120),
          description: z.string().trim().max(500).default(""),
          priceLabel: z.string().trim().max(60).default(""),
          imageUrl: imageUrl.default(""),
          whatsappMessage: z.string().trim().max(300).optional(),
        }),
      )
      .max(24)
      .default([]),
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
  whatsapp: z.object({
    label: z.string().trim().max(60).default("Chat on WhatsApp"),
    phone: z.string().trim().min(5).max(40),
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
    navLinks: z
      .array(z.object({ label: z.string().trim().max(40), href: safeHref }))
      .max(8)
      .optional()
      .default([]),
    socialLinks: socialLinksSchema.optional().default([]),
    ...socialRailFields,
    /** Pixel nudges for Tilda layers while editing (keyed by layer id). */
    layerMoves: z
      .record(z.string(), z.object({ dx: z.number().min(-800).max(800), dy: z.number().min(-800).max(800) }))
      .optional()
      .default({}),
    /** Extra user cutouts on the hero artboard (drag / upload / delete). */
    extraCutouts: z
      .array(
        z.object({
          id: z.string().trim().min(1).max(40),
          src: imageUrl,
          alt: z.string().trim().max(120).optional().default(""),
          topPct: z.number().min(-20).max(110).default(30),
          leftPct: z.number().min(-20).max(110).default(40),
          widthPct: z.number().min(4).max(60).default(14),
          rotate: z.number().min(-45).max(45).optional().default(0),
          zIndex: z.number().int().min(1).max(40).optional().default(12),
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
    /** Show brand name as editable text instead of the spinning Russian logo circle. */
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
    navLinks: z
      .array(z.object({ label: z.string().trim().max(40), href: safeHref }))
      .max(10)
      .default([]),
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
    navLinks: z
      .array(z.object({ label: z.string().trim().max(40), href: safeHref }))
      .max(10)
      .default([]),
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
  mode: z.enum(["blank", "template", "ai"]),
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
});

export type AiImproveBrief = z.infer<typeof aiImproveBriefSchema>;
