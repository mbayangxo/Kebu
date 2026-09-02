import { siteJsonLdScriptPayload, type SiteSeo } from "@/lib/create/site-seo";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

/** Server-rendered JSON-LD for public sites (Google / Bing rich results). */
export function SiteJsonLd({
  seo,
  title,
  canonicalBase,
  pageSlug,
  pageTitle,
  definition,
}: {
  seo: SiteSeo;
  title: string;
  canonicalBase: string;
  pageSlug?: string;
  pageTitle?: string;
  definition?: WebsiteDefinition | null;
}) {
  if (seo.noIndex) return null;
  const json = siteJsonLdScriptPayload({
    seo,
    title,
    canonicalBase,
    pageSlug,
    pageTitle,
    definition,
  });
  return (
    <script
      type="application/ld+json"
      // Payload is built server-side from validated SEO + definition fields only.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
