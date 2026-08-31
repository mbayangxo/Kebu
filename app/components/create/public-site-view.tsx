"use client";

import { SiteRenderer } from "@/app/components/create/site-renderer";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

export function PublicSiteView({
  definition,
  subdomain,
  pageSlug = "home",
}: {
  definition: WebsiteDefinition;
  subdomain: string;
  pageSlug?: string;
}) {
  const siteBase = `/sites/${subdomain}`;
  return (
    <SiteRenderer definition={definition} mode="live" pageSlug={pageSlug} siteBase={siteBase} />
  );
}
