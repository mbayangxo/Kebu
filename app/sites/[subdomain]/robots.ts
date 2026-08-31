import type { MetadataRoute } from "next";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";

type Params = { params: Promise<{ subdomain: string }> };

export default async function robots({ params }: Params): Promise<MetadataRoute.Robots> {
  const { subdomain } = await params;
  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  if (deployment.seo.noIndex) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${deployment.httpsUrl}/sitemap.xml`,
  };
}
