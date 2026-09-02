import { NextResponse } from "next/server";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";

type Params = { params: Promise<{ subdomain: string }> };

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Explicit route so `/sitemap.xml` is not swallowed by `[pageSlug]`. */
export async function GET(_req: Request, { params }: Params) {
  const { subdomain } = await params;
  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment || deployment.seo.noIndex) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      {
        status: 200,
        headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
      },
    );
  }

  const base = deployment.httpsUrl.replace(/\/$/, "");
  const lastmod = deployment.publishedAt
    ? new Date(deployment.publishedAt).toISOString()
    : new Date().toISOString();
  const og = deployment.seo.ogImageUrl;

  const urls = deployment.definition.pages
    .slice()
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((page) => {
      const loc = page.slug === "home" ? base : `${base}/${page.slug}`;
      const priority = page.slug === "home" ? "1.0" : "0.7";
      const imageBlock = og
        ? `<image:image><image:loc>${xmlEscape(og)}</image:loc></image:image>`
        : "";
      return `<url><loc>${xmlEscape(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>${priority}</priority>${imageBlock}</url>`;
    })
    .join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
