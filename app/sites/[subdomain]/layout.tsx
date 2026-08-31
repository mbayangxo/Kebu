import type { Metadata } from "next";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";
import { siteMetadataFromDefinition } from "@/lib/create/site-seo";

type Params = { params: Promise<{ subdomain: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { subdomain } = await params;
  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment) {
    return { title: "Site not found" };
  }

  return siteMetadataFromDefinition({
    title: deployment.definition.title,
    seo: deployment.seo,
    canonicalBase: deployment.httpsUrl,
  });
}

export default function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
