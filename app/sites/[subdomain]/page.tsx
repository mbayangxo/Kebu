import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";
import { PublicSiteView } from "@/app/components/create/public-site-view";
import { SiteBillingSuspendedView } from "@/app/components/create/site-billing-suspended";
import { SitePasswordGate } from "@/app/components/create/site-password-gate";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Cache the rendered HTML for 10 minutes; CDN serves stale while revalidating in background.
export const revalidate = 600;

type Params = { params: Promise<{ subdomain: string }> };

async function loadPasswordStatus(projectId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  const admin = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await admin
    .from("projects")
    .select("site_password_enabled")
    .eq("id", projectId)
    .maybeSingle();
  return Boolean(data?.site_password_enabled);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { subdomain } = await params;
  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment) return {};
  const { definition, seo } = deployment;
  const title = seo?.metaTitle || definition.title || subdomain;
  const description = seo?.metaDescription || "";
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicSitePage({ params }: Params) {
  const { subdomain } = await params;
  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment) notFound();

  if (deployment.billingSuspended) {
    return (
      <SiteBillingSuspendedView subdomain={deployment.subdomain} projectId={deployment.projectId} />
    );
  }

  const siteBase = deployment.customDomainUrl ? "" : `/sites/${deployment.subdomain}`;

  const passwordEnabled = await loadPasswordStatus(deployment.projectId);
  const shopName = deployment.seo?.metaTitle || deployment.seo?.businessName || deployment.definition.title || subdomain;

  return (
    <>
      {passwordEnabled && (
        <SitePasswordGate subdomain={deployment.subdomain} shopName={shopName} />
      )}
      <PublicSiteView
        definition={deployment.definition}
        subdomain={deployment.subdomain}
        pageSlug="home"
        projectId={deployment.projectId}
        siteBase={siteBase}
      />
    </>
  );
}
