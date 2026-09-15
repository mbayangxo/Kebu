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

/**
 * Extract a clean numeric price string from a raw price value.
 * Handles "5 000 FCFA", "12,500", 5000, "15.99" → "5000", "12500", "5000", "15.99"
 */
function numericPrice(val: unknown): string | null {
  if (typeof val === "number" && isFinite(val) && val > 0) return String(Math.round(val));
  if (typeof val !== "string") return null;
  // Strip currency words and whitespace, then extract leading number
  const stripped = val.replace(/[a-zA-Z\s]/g, "").replace(/,(?=\d{3}(?!\d))/g, "");
  const m = stripped.match(/^(\d+(?:\.\d+)?)/);
  return m ? m[1] : null;
}

/** Collect all products from a site definition across all pages. */
function collectProducts(definition: WebsiteDefinition): Array<Record<string, unknown>> {
  const products: Array<Record<string, unknown>> = [];
  for (const page of definition.pages) {
    for (const section of page.sections) {
      if (section.type !== "products") continue;
      const items = (section.props as { items?: Array<Record<string, unknown>> }).items;
      if (!Array.isArray(items)) continue;
      for (const item of items.slice(0, 50)) {
        if (typeof item.name === "string" && item.name.trim()) products.push(item);
      }
    }
  }
  return products;
}

/** Collect FAQ pairs from any FAQ-type section. */
function collectFaqPairs(definition: WebsiteDefinition): Array<{ q: string; a: string }> {
  const pairs: Array<{ q: string; a: string }> = [];
  for (const page of definition.pages) {
    for (const section of page.sections) {
      if (!["faq", "faq-section", "faqs"].includes(section.type)) continue;
      const items = (section.props as { items?: Array<Record<string, unknown>> }).items;
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        const q = typeof item.question === "string" ? item.question.trim() : "";
        const a =
          typeof item.answer === "string"
            ? item.answer.trim()
            : typeof item.body === "string"
              ? item.body.trim()
              : "";
        if (q && a) pairs.push({ q, a });
      }
    }
  }
  return pairs;
}

/** JSON-LD for Google rich results + AI crawlers (Organization / WebSite / WebPage / Product / FAQPage). */
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

  // ── Organization / LocalBusiness ─────────────────────────────────────────
  const businessTypes = ["Store", "Restaurant", "LocalBusiness", "ProfessionalService"];
  const isLocalBusiness = businessTypes.includes(seo.businessType);

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

  // Commerce-aware fields for Store / LocalBusiness
  if (isLocalBusiness) {
    org.currenciesAccepted = "XOF";
    org.paymentAccepted = "Cash, Mobile Money (Wave, Orange Money), WhatsApp";
    if (seo.commerce?.merchantWhatsApp) {
      org.telephone = seo.commerce.merchantWhatsApp;
      org.contactPoint = {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: seo.commerce.merchantWhatsApp,
        availableLanguage: ["fr", "en"],
      };
    }
  }

  graphs.push(org);

  // ── WebSite with SearchAction ─────────────────────────────────────────────
  graphs.push({
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: base,
    name: seo.siteName || name,
    publisher: { "@id": `${base}/#organization` },
    inLanguage: seo.locale || "fr",
    ...(description ? { description } : {}),
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  });

  // ── WebPage ───────────────────────────────────────────────────────────────
  graphs.push({
    "@type": "WebPage",
    "@id": `${pageUrl}/#webpage`,
    url: pageUrl,
    name: input.pageTitle || seo.metaTitle || input.title,
    isPartOf: { "@id": `${base}/#website` },
    about: { "@id": `${base}/#organization` },
    ...(description ? { description } : {}),
    inLanguage: seo.locale || "fr",
    dateModified: new Date().toISOString().split("T")[0],
  });

  // ── Breadcrumb ────────────────────────────────────────────────────────────
  if (pagePath) {
    graphs.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: base },
        {
          "@type": "ListItem",
          position: 2,
          name: input.pageTitle || input.pageSlug,
          item: pageUrl,
        },
      ],
    });
  }

  // ── Products + ItemList ───────────────────────────────────────────────────
  if (input.definition) {
    const allProducts = collectProducts(input.definition);

    if (allProducts.length > 0) {
      const productGraphs: Record<string, unknown>[] = [];

      for (const item of allProducts.slice(0, 24)) {
        const productName = String(item.name);
        const price = numericPrice(item.price ?? item.priceLabel);
        const image = typeof item.imageUrl === "string" && item.imageUrl ? item.imageUrl : undefined;
        const currency =
          typeof item.currency === "string" && item.currency ? item.currency : "XOF";
        const inStock = item.inStock !== false;

        const product: Record<string, unknown> = {
          "@type": "Product",
          name: productName,
          brand: { "@type": "Brand", name },
          seller: { "@id": `${base}/#organization` },
          ...(typeof item.description === "string" && item.description
            ? { description: item.description }
            : {}),
          ...(image ? { image } : {}),
        };

        if (price) {
          product.offers = {
            "@type": "Offer",
            "@id": `${base}/#product-${productGraphs.length + 1}`,
            priceCurrency: currency,
            price,
            priceSpecification: {
              "@type": "PriceSpecification",
              priceCurrency: currency,
              price,
            },
            availability: inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
            url: pageUrl,
            seller: { "@id": `${base}/#organization` },
          };
        }

        productGraphs.push(product);
      }

      graphs.push(...productGraphs);

      // ItemList — lets Google show a product carousel in search results
      if (productGraphs.length > 1) {
        graphs.push({
          "@type": "ItemList",
          name: `${name} — Catalogue`,
          description: `Produits disponibles sur ${name}`,
          numberOfItems: productGraphs.length,
          itemListElement: productGraphs.slice(0, 10).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: p.name,
            url: pageUrl,
          })),
        });
      }
    }

    // ── FAQPage ───────────────────────────────────────────────────────────
    const faqs = collectFaqPairs(input.definition);
    if (faqs.length > 0) {
      graphs.push({
        "@type": "FAQPage",
        mainEntity: faqs.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      });
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
