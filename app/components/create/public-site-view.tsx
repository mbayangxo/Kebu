"use client";

import { useEffect } from "react";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { SiteAnalyticsBeacon } from "@/app/components/create/site-analytics-beacon";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { registerSiteOfflineCache } from "@/lib/create/site-offline";

export function PublicSiteView({
  definition,
  subdomain,
  pageSlug = "home",
  projectId,
  siteBase: siteBaseProp,
}: {
  definition: WebsiteDefinition;
  subdomain: string;
  pageSlug?: string;
  projectId?: string;
  /** Empty string on custom domains so links stay on the brand URL. */
  siteBase?: string;
}) {
  const siteBase = siteBaseProp ?? `/sites/${subdomain}`;

  useEffect(() => {
    registerSiteOfflineCache();
  }, []);

  return (
    <>
      <SiteAnalyticsBeacon subdomain={subdomain} path={pageSlug === "home" ? "/" : `/${pageSlug}`} />
      <SiteRenderer
        definition={definition}
        mode="live"
        pageSlug={pageSlug}
        siteBase={siteBase}
        projectId={projectId}
      />
    </>
  );
}
