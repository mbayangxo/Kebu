import { notFound } from "next/navigation";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";
import { PublicSiteView } from "@/app/components/create/public-site-view";
import { siteMetadataFromDefinition } from "@/lib/create/site-seo";

type Params = { params: Promise<{ subdomain: string; pageSlug: string }> };

export async function generateMetadata({ params }: Params) {
  const { subdomain, pageSlug } = await params;
  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment) return { title: "Site not found" };

  const page = deployment.definition.pages.find((p) => p.slug === pageSlug);
  return siteMetadataFromDefinition({
    title: page?.title || deployment.definition.title,
    seo: deployment.seo,
    canonicalBase: deployment.httpsUrl,
    pageSlug,
  });
}

export default async function PublicSiteSubPage({ params }: Params) {
  const { subdomain, pageSlug } = await params;
  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment) notFound();

  const pageExists = deployment.definition.pages.some((p) => p.slug === pageSlug);
  if (!pageExists) notFound();

  return (
    <PublicSiteView
      definition={deployment.definition}
      subdomain={deployment.subdomain}
      pageSlug={pageSlug}
      projectId={deployment.projectId}
    />
  );
}
