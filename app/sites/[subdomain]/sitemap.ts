import type { MetadataRoute } from "next";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";

type Params = { params: Promise<{ subdomain: string }> };

export default async function sitemap({ params }: Params): Promise<MetadataRoute.Sitemap> {
  const { subdomain } = await params;
  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment) return [];

  const base = deployment.httpsUrl;
  return deployment.definition.pages.map((page) => ({
    url: page.slug === "home" ? base : `${base}/${page.slug}`,
    lastModified: deployment.publishedAt ? new Date(deployment.publishedAt) : new Date(),
    changeFrequency: "weekly" as const,
    priority: page.slug === "home" ? 1 : 0.7,
  }));
}
