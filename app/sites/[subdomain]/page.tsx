import { notFound } from "next/navigation";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";
import { PublicSiteView } from "@/app/components/create/public-site-view";

type Params = { params: Promise<{ subdomain: string }> };

export default async function PublicSitePage({ params }: Params) {
  const { subdomain } = await params;
  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment) notFound();

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
