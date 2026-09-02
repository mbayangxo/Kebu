import { z } from "zod";
import { siteCommerceSchema } from "./site-commerce";

const imageUrl = z.union([z.literal(""), z.string().trim().url().max(500)]);

export const siteSeoSchema = z.object({
  metaTitle: z.string().trim().max(120).default(""),
  metaDescription: z.string().trim().max(320).default(""),
  faviconUrl: imageUrl.default(""),
  ogImageUrl: imageUrl.default(""),
  ogTitle: z.string().trim().max(120).default(""),
  keywords: z.string().trim().max(240).default(""),
  noIndex: z.boolean().optional().default(false),
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
  };
}

export function siteMetadataFromDefinition(input: {
  title: string;
  seo?: SiteSeo | null;
  canonicalBase: string;
  pageSlug?: string;
}) {
  const seo = mergeSiteSeo(input.seo, input.title);
  const pagePath = input.pageSlug && input.pageSlug !== "home" ? `/${input.pageSlug}` : "";
  const canonical = `${input.canonicalBase.replace(/\/$/, "")}${pagePath}`;
  const title = seo.metaTitle || input.title;
  const description = seo.metaDescription || undefined;
  const ogTitle = seo.ogTitle || title;

  return {
    title,
    description,
    keywords: seo.keywords || undefined,
    robots: seo.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    alternates: { canonical },
    icons: seo.faviconUrl ? { icon: seo.faviconUrl, shortcut: seo.faviconUrl } : undefined,
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      type: "website" as const,
      ...(seo.ogImageUrl ? { images: [{ url: seo.ogImageUrl }] } : {}),
    },
    twitter: {
      card: seo.ogImageUrl ? ("summary_large_image" as const) : ("summary" as const),
      title: ogTitle,
      description,
      ...(seo.ogImageUrl ? { images: [seo.ogImageUrl] } : {}),
    },
  };
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
