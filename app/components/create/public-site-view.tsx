"use client";

import { useEffect } from "react";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { registerSiteOfflineCache } from "@/lib/create/site-offline";

export function PublicSiteView({
  definition,
  subdomain,
  pageSlug = "home",
  projectId,
}: {
  definition: WebsiteDefinition;
  subdomain: string;
  pageSlug?: string;
  projectId?: string;
}) {
  const siteBase = `/sites/${subdomain}`;

  useEffect(() => {
    registerSiteOfflineCache();
  }, []);

  return (
    <SiteRenderer
      definition={definition}
      mode="live"
      pageSlug={pageSlug}
      siteBase={siteBase}
      projectId={projectId}
    />
  );
}
