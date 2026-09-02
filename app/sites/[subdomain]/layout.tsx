import type { Metadata } from "next";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";
import { siteMetadataFromDefinition } from "@/lib/create/site-seo";
import { SiteJsonLd } from "@/app/components/create/site-json-ld";

type Params = { params: Promise<{ subdomain: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { subdomain } = await params;
  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment) {
    return { title: "Site not found", robots: { index: false, follow: false } };
  }

  return siteMetadataFromDefinition({
    title: deployment.definition.title,
    seo: deployment.seo,
    canonicalBase: deployment.httpsUrl,
    definition: deployment.definition,
    pageSlug: "home",
  });
}

export default async function PublicSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const deployment = await loadPublicDeployment(subdomain);

  return (
    <>
      {deployment ? (
        <SiteJsonLd
          seo={deployment.seo}
          title={deployment.definition.title}
          canonicalBase={deployment.httpsUrl}
          pageSlug="home"
          definition={deployment.definition}
        />
      ) : null}
      {children}
    </>
  );
}
