import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";
import { PublicSiteView } from "@/app/components/create/public-site-view";
import { SiteBillingSuspendedView } from "@/app/components/create/site-billing-suspended";

// Cache the rendered HTML for 10 minutes; CDN serves stale while revalidating in background.
export const revalidate = 600;

type Params = { params: Promise<{ subdomain: string }> };

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

  return (
    <PublicSiteView
      definition={deployment.definition}
      subdomain={deployment.subdomain}
      pageSlug="home"
      projectId={deployment.projectId}
      siteBase={siteBase}
    />
  );
}
