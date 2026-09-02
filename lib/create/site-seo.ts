import { z } from "zod";
import { siteCommerceSchema } from "./site-commerce";
import type { WebsiteDefinition } from "./website-schema";

const imageUrl = z.union([z.literal(""), z.string().trim().url().max(500)]);

const socialUrlList = z
  .string()
  .trim()
  .max(1200)
  .default("")
  .transform((s) => s);

export const siteBusinessTypeSchema = z.enum([
  "Organization",
  "LocalBusiness",
  "Person",
  "MusicGroup",
  "Store",
  "Restaurant",
  "ProfessionalService",
]);

export type SiteBusinessType = z.infer<typeof siteBusinessTypeSchema>;

export const siteSeoSchema = z.object({
  metaTitle: z.string().trim().max(120).default(""),
  metaDescription: z.string().trim().max(320).default(""),
  faviconUrl: imageUrl.default(""),
  ogImageUrl: imageUrl.default(""),
  ogTitle: z.string().trim().max(120).default(""),
  keywords: z.string().trim().max(240).default(""),
  noIndex: z.boolean().optional().default(false),
  /** Plain-language primary topic Google should associate with this site */
  focusKeyword: z.string().trim().max(80).default(""),
  /** Public brand name (defaults to site title) */
  siteName: z.string().trim().max(120).default(""),
  locale: z.string().trim().max(16).default("en"),
  twitterHandle: z.string().trim().max(40).default(""),
  /** Google Search Console HTML-tag content value */
  googleSiteVerification: z.string().trim().max(120).default(""),
  businessType: siteBusinessTypeSchema.default("Organization"),
  businessName: z.string().trim().max(120).default(""),
  city: z.string().trim().max(80).default(""),
  country: z.string().trim().max(80).default(""),
  /** Social / profile URLs, one per line or comma-separated */
  sameAs: socialUrlList,
  commerce: siteCommerceSchema.optional(),
});

export type SiteSeo = z.infer<typeof siteSeoSchema>;

export function defaultSiteSeo(title = "My website"): SiteSeo {
  return siteSeoSchema.parse({
    metaTitle: title,
    metaDescription: "",
    faviconUrl: "",
    ogImageUrl: "",
    ogTitle: title,
    keywords: "",
    noIndex: false,
    focusKeyword: "",
    siteName: title,
    locale: "en",
    twitterHandle: "",
    googleSiteVerification: "",
    businessType: "Organization",
    businessName: title,
    city: "",
    country: "",
    sameAs: "",
  });
}

export function mergeSiteSeo(partial: unknown, fallbackTitle: string): SiteSeo {
  const base = defaultSiteSeo(fallbackTitle);
  const parsed = siteSeoSchema.safeParse(partial);
  if (!parsed.success) return base;
  return {
    ...base,
    ...parsed.data,
    metaTitle: parsed.data.metaTitle || base.metaTitle,
    ogTitle: parsed.data.ogTitle || parsed.data.metaTitle || base.metaTitle,
    siteName: parsed.data.siteName || parsed.data.metaTitle || base.siteName,
    businessName: parsed.data.businessName || parsed.data.siteName || parsed.data.metaTitle || base.businessName,
  };
}

export function parseSameAsUrls(sameAs: string): string[] {
  return sameAs
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
    .slice(0, 12);
}

/** Pull plain text from section props for auto meta description. */
export function extractTextFromDefinition(
  definition: WebsiteDefinition,
  pageSlug = "home",
  maxLen = 300,
): string {
  const page =
    definition.pages.find((p) => p.slug === pageSlug) ??
    definition.pages.find((p) => p.slug === "home") ??
    definition.pages[0];
  if (!page) return "";

  const chunks: string[] = [];
  for (const section of page.sections) {
    const props = section.props as Record<string, unknown>;
    for (const key of [
      "heading",
      "subheading",
      "title",
      "subtitle",
      "body",
      "text",
      "description",
      "artistName",
      "ctaLabel",
      "tagline",
    ]) {
      const v = props[key];
      if (typeof v === "string" && v.trim()) chunks.push(v.trim());
    }
  }

  const joined = chunks.join(" — ").replace(/\s+/g, " ").trim();
  if (!joined) return "";
  if (joined.length <= maxLen) return joined;
  return `${joined.slice(0, maxLen - 1).trim()}…`;
}

export function resolveSeoDescription(
  seo: SiteSeo,
  definition?: WebsiteDefinition | null,
  pageSlug = "home",
): string | undefined {
  if (seo.metaDescription.trim()) return seo.metaDescription.trim();
  if (!definition) return undefined;
  const auto = extractTextFromDefinition(definition, pageSlug);
  return auto || undefined;
}

export function siteMetadataFromDefinition(input: {
  title: string;
  seo?: SiteSeo | null;
  canonicalBase: string;
  pageSlug?: string;
  definition?: WebsiteDefinition | null;
}) {
  const seo = mergeSiteSeo(input.seo, input.title);
  const pagePath = input.pageSlug && input.pageSlug === "home" ? "" : input.pageSlug ? `/${input.pageSlug}` : "";
  const canonical = `${input.canonicalBase.replace(/\/$/, "")}${pagePath}`;
  const siteName = seo.siteName || input.title;
  const pageTitle =
    input.pageSlug && input.pageSlug !== "home" && input.title !== siteName
      ? `${input.title} · ${siteName}`
      : seo.metaTitle || input.title;
  const description = resolveSeoDescription(seo, input.definition, input.pageSlug ?? "home");
  const ogTitle = seo.ogTitle || pageTitle;
  const keywords = [seo.focusKeyword, seo.keywords]
    .filter(Boolean)
    .join(", ")
    .replace(/^,\s*|,\s*$/g, "")
    .trim();

  const twitter = seo.twitterHandle.replace(/^@/, "").trim();

  return {
    metadataBase: new URL(input.canonicalBase.replace(/\/$/, "") + "/"),
    title: pageTitle,
    description,
    keywords: keywords || undefined,
    applicationName: siteName,
    robots: seo.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    alternates: { canonical },
    icons: seo.faviconUrl ? { icon: seo.faviconUrl, shortcut: seo.faviconUrl } : undefined,
    verification: seo.googleSiteVerification
      ? { google: seo.googleSiteVerification }
      : undefined,
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      siteName,
      locale: seo.locale || "en",
      type: "website" as const,
      ...(seo.ogImageUrl
        ? { images: [{ url: seo.ogImageUrl, width: 1200, height: 630, alt: ogTitle }] }
        : {}),
    },
    twitter: {
      card: seo.ogImageUrl ? ("summary_large_image" as const) : ("summary" as const),
      title: ogTitle,
      description,
      ...(twitter ? { creator: `@${twitter}`, site: `@${twitter}` } : {}),
      ...(seo.ogImageUrl ? { images: [seo.ogImageUrl] } : {}),
    },
  };
}

export type SiteJsonLdInput = {
  seo: SiteSeo;
  title: string;
  canonicalBase: string;
  pageSlug?: string;
  pageTitle?: string;
  definition?: WebsiteDefinition | null;
};

/** JSON-LD for Google rich results (Organization / WebSite / WebPage + optional products). */
export function buildSiteJsonLd(input: SiteJsonLdInput): Record<string, unknown>[] {
  const seo = mergeSiteSeo(input.seo, input.title);
  const base = input.canonicalBase.replace(/\/$/, "");
  const pagePath =
    input.pageSlug && input.pageSlug !== "home" ? `/${input.pageSlug}` : "";
  const pageUrl = `${base}${pagePath}`;
  const description = resolveSeoDescription(seo, input.definition, input.pageSlug ?? "home");
  const name = seo.businessName || seo.siteName || input.title;
  const sameAs = parseSameAsUrls(seo.sameAs);
  const graphs: Record<string, unknown>[] = [];

  const org: Record<string, unknown> = {
    "@type": seo.businessType || "Organization",
    "@id": `${base}/#organization`,
    name,
    url: base,
    ...(seo.ogImageUrl ? { image: seo.ogImageUrl, logo: seo.faviconUrl || seo.ogImageUrl } : {}),
    ...(seo.faviconUrl && !seo.ogImageUrl ? { logo: seo.faviconUrl } : {}),
    ...(description ? { description } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
  if (seo.city || seo.country) {
    org.address = {
      "@type": "PostalAddress",
      ...(seo.city ? { addressLocality: seo.city } : {}),
      ...(seo.country ? { addressCountry: seo.country } : {}),
    };
  }
  graphs.push(org);

  graphs.push({
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: base,
    name: seo.siteName || name,
    publisher: { "@id": `${base}/#organization` },
    inLanguage: seo.locale || "en",
    ...(description ? { description } : {}),
  });

  graphs.push({
    "@type": "WebPage",
    "@id": `${pageUrl}/#webpage`,
    url: pageUrl,
    name: input.pageTitle || seo.metaTitle || input.title,
    isPartOf: { "@id": `${base}/#website` },
    about: { "@id": `${base}/#organization` },
    ...(description ? { description } : {}),
    inLanguage: seo.locale || "en",
  });

  if (pagePath) {
    graphs.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: base },
        {
          "@type": "ListItem",
          position: 2,
          name: input.pageTitle || input.pageSlug,
          item: pageUrl,
        },
      ],
    });
  }

  if (input.definition) {
    for (const page of input.definition.pages) {
      for (const section of page.sections) {
        if (section.type !== "products") continue;
        const items = (section.props as { items?: Array<Record<string, unknown>> }).items;
        if (!Array.isArray(items)) continue;
        for (const item of items.slice(0, 24)) {
          const productName = typeof item.name === "string" ? item.name : null;
          if (!productName) continue;
          const price = typeof item.price === "string" || typeof item.price === "number" ? String(item.price) : null;
          const image = typeof item.imageUrl === "string" ? item.imageUrl : undefined;
          graphs.push({
            "@type": "Product",
            name: productName,
            ...(typeof item.description === "string" ? { description: item.description } : {}),
            ...(image ? { image } : {}),
            ...(price
              ? {
                  offers: {
                    "@type": "Offer",
                    priceCurrency: typeof item.currency === "string" ? item.currency : "XOF",
                    price,
                    availability: "https://schema.org/InStock",
                    url: pageUrl,
                  },
                }
              : {}),
          });
        }
      }
    }
  }

  return graphs;
}

export function siteJsonLdScriptPayload(input: SiteJsonLdInput): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": buildSiteJsonLd(input),
  });
}

/** Block common XSS / injection patterns in serialized section props. */
export function containsUnsafeSiteContent(blob: string): boolean {
  const lower = blob.toLowerCase();
  const blocked = [
    "<script",
    "</script",
    "javascript:",
    "vbscript:",
    "data:text/html",
    "onerror=",
    "onload=",
    "<iframe",
    "<object",
    "<embed",
    "<svg on",
  ];
  return blocked.some((token) => lower.includes(token));
}
