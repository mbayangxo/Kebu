"use client";

import { useEffect } from "react";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { SiteAnalyticsBeacon } from "@/app/components/create/site-analytics-beacon";
import {
  DataModeControls,
  DataModeProvider,
  useDataMode,
} from "@/app/components/create/data-mode-provider";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { registerSiteOfflineCache } from "@/lib/create/site-offline";
import { dataModeSiteClass } from "@/lib/create/data-mode";

function PublicSiteInner({
  definition,
  subdomain,
  pageSlug = "home",
  projectId,
  siteBase,
}: {
  definition: WebsiteDefinition;
  subdomain: string;
  pageSlug?: string;
  projectId?: string;
  siteBase: string;
}) {
  const { mode, reportKb, online } = useDataMode();

  useEffect(() => {
    registerSiteOfflineCache();
  }, []);

  useEffect(() => {
    // Approximate open_site transfer from resource timings (document + same-origin assets).
    const run = () => {
      try {
        const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
        let bytes = 0;
        for (const e of entries) {
          if (e.name.includes("/sites/") || e.name.includes("/_next/") || e.name.includes("site-assets")) {
            bytes += e.transferSize || e.encodedBodySize || 0;
          }
        }
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        if (nav) bytes += nav.transferSize || nav.encodedBodySize || 0;
        if (bytes > 0) reportKb("open_site", bytes);
      } catch {
        /* ignore */
      }
    };
    const t = window.setTimeout(run, 1800);
    return () => window.clearTimeout(t);
  }, [reportKb, pageSlug]);

  return (
    <div className={dataModeSiteClass(mode)} data-kebu-online={online ? "1" : "0"}>
      <SiteAnalyticsBeacon subdomain={subdomain} path={pageSlug === "home" ? "/" : `/${pageSlug}`} />
      <SiteRenderer
        definition={definition}
        mode="live"
        pageSlug={pageSlug}
        siteBase={siteBase}
        liveSubdomain={subdomain}
        projectId={projectId}
        dataMode={mode}
      />
      <div className="kebu-data-mode-dock" aria-label="Data mode">
        <DataModeControls compact />
      </div>
    </div>
  );
}

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

  return (
    <DataModeProvider>
      <PublicSiteInner
        definition={definition}
        subdomain={subdomain}
        pageSlug={pageSlug}
        projectId={projectId}
        siteBase={siteBase}
      />
    </DataModeProvider>
  );
}
