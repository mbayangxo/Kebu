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
  "contact",
  "whatsapp",
  "footer",
  "maylecor-home",
  "maylecor-music",
  "legally-blonde-hero",
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
      v === "#" ||
      v.startsWith("#") ||
      v.startsWith("/") ||
      v.startsWith("https://") ||
      v.startsWith("http://") ||
      v.startsWith("mailto:") ||
      v.startsWith("tel:"),
    { message: "Invalid URL" }
  );

const imageUrl = z.union([
  z.literal(""),
  z.string().trim().url().max(500),
  // Same-origin public assets (e.g. /templates/maylecor/portrait.jpg)
  z
    .string()
    .trim()
    .max(500)
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
  .max(8)
  .default([]);

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
    src: z.string().trim().min(1).max(500),
    title: z.string().trim().max(120).optional(),
    caption: z.string().trim().max(200).optional(),
    hidden: z.boolean().optional(),
  }),
  audio: z.object({
    heading: z.string().trim().max(160).optional(),
    /** YouTube, Spotify embed URL, SoundCloud, or direct .mp3 */
    src: z.string().trim().min(1).max(500),
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
  contact: z.object({
    heading: z.string().trim().max(160).default("Contact"),
    email: z.union([z.literal(""), z.string().trim().email().max(254)]).optional(),
    phone: z.string().trim().max(40).optional(),
    address: z.string().trim().max(240).optional(),
    hidden: z.boolean().optional(),
  }),
  whatsapp: z.object({
    label: z.string().trim().max(60).default("Chat on WhatsApp"),
    phone: z.string().trim().min(5).max(40),
    message: z.string().trim().max(200).optional(),
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
    motionEnabled: z.boolean().optional().default(true),
    hidden: z.boolean().optional(),
  }),
  "maylecor-music": z.object({
    artistName: z.string().trim().min(1).max(80),
    albumArt: imageUrl,
    homePageSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(40).default("home"),
    socialLinks: socialLinksSchema,
    motionEnabled: z.boolean().optional().default(true),
    hidden: z.boolean().optional(),
  }),
  "legally-blonde-hero": z.object({
    title: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().max(500),
    backgroundLayer: imageUrl,
    titleLogo: imageUrl,
    cutoutLeft: imageUrl,
    cutoutRight: imageUrl,
    cutoutAccent: imageUrl,
    cutoutSparkle: imageUrl.optional().default(""),
    macbook: imageUrl,
    sparkleGif: imageUrl,
    heroPhoto: imageUrl,
    accentColor: z.string().trim().max(40).default("#e9006b"),
    motionEnabled: z.boolean().optional().default(true),
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
  businessId: z.string().uuid(),
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
