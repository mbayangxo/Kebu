import { notFound } from "next/navigation";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";
import { PublicSiteView } from "@/app/components/create/public-site-view";
import { siteMetadataFromDefinition } from "@/lib/create/site-seo";
import { SiteJsonLd } from "@/app/components/create/site-json-ld";

type Params = { params: Promise<{ subdomain: string; pageSlug: string }> };

const RESERVED = new Set(["robots.txt", "sitemap.xml", "favicon.ico", "manifest.json", "manifest.webmanifest"]);

export async function generateMetadata({ params }: Params) {
  const { subdomain, pageSlug } = await params;
  if (RESERVED.has(pageSlug)) return { title: "Not found", robots: { index: false, follow: false } };

  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment) return { title: "Site not found" };

  const page = deployment.definition.pages.find((p) => p.slug === pageSlug);
  return siteMetadataFromDefinition({
    title: page?.title || deployment.definition.title,
    seo: deployment.seo,
    canonicalBase: deployment.httpsUrl,
    pageSlug,
    definition: deployment.definition,
  });
}

export default async function PublicSiteSubPage({ params }: Params) {
  const { subdomain, pageSlug } = await params;
  if (RESERVED.has(pageSlug)) notFound();

  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment) notFound();

  const pageExists = deployment.definition.pages.some((p) => p.slug === pageSlug);
  if (!pageExists) notFound();

  const page = deployment.definition.pages.find((p) => p.slug === pageSlug);
  const siteBase = deployment.customDomainUrl ? "" : `/sites/${deployment.subdomain}`;

  return (
    <>
      <SiteJsonLd
        seo={deployment.seo}
        title={deployment.definition.title}
        canonicalBase={deployment.httpsUrl}
        pageSlug={pageSlug}
        pageTitle={page?.title}
        definition={deployment.definition}
      />
      <PublicSiteView
        definition={deployment.definition}
        subdomain={deployment.subdomain}
        pageSlug={pageSlug}
        projectId={deployment.projectId}
        siteBase={siteBase}
      />
    </>
  );
}
