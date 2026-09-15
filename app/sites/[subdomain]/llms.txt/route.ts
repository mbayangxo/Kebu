import { NextResponse } from "next/server";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";

type Params = { params: Promise<{ subdomain: string }> };

/**
 * Per-shop llms.txt following the llmstxt.org standard.
 * Helps AI assistants (ChatGPT, Claude, Perplexity, Gemini) understand the shop.
 */
export async function GET(_req: Request, { params }: Params) {
  const { subdomain } = await params;
  const deployment = await loadPublicDeployment(subdomain);

  if (!deployment || deployment.seo.noIndex) {
    return new NextResponse("# This site is not indexed.\n", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  }

  const { definition, seo, httpsUrl } = deployment;
  const base = httpsUrl.replace(/\/$/, "");
  const name = seo.metaTitle || seo.businessName || definition.title || subdomain;
  const description = seo.metaDescription || "";
  const businessType = seo.businessType || "Online Shop";
  const location = [seo.city, seo.country].filter(Boolean).join(", ");
  const whatsapp = seo.commerce?.merchantWhatsApp || "";

  // Collect products across all pages
  const products: { title: string; price?: string; slug?: string }[] = [];
  for (const page of definition.pages) {
    for (const section of page.sections ?? []) {
      const items: unknown[] = (section as Record<string, unknown>).items as unknown[] ?? [];
      for (const item of items) {
        const p = item as Record<string, unknown>;
        if (p.title || p.name) {
          products.push({
            title: String(p.title ?? p.name ?? ""),
            price: p.price ? String(p.price) : undefined,
          });
        }
      }
    }
  }

  // Build pages list
  const pages = definition.pages.map((page) => {
    const url = page.slug === "home" ? base : `${base}/${page.slug}`;
    return `- [${page.title || page.slug}](${url})`;
  });

  const lines: string[] = [
    `# ${name}`,
    "",
    description,
    "",
    `> ${businessType}${location ? ` based in ${location}` : ""}. Powered by Kebu.`,
    "",
    "## Pages",
    "",
    ...pages,
    "",
  ];

  if (products.length > 0) {
    lines.push("## Products", "");
    for (const p of products.slice(0, 50)) {
      const priceStr = p.price ? ` — ${p.price}` : "";
      lines.push(`- ${p.title}${priceStr}`);
    }
    lines.push("");
  }

  if (whatsapp) {
    lines.push(
      "## Contact",
      "",
      `- WhatsApp: https://wa.me/${whatsapp.replace(/\D/g, "")}`,
      "",
    );
  }

  lines.push(
    "## Notes",
    "",
    "- Currency: XOF (West African CFA franc)",
    "- Payment: Mobile Money (Wave, Orange Money), Cash",
    `- Sitemap: ${base}/sitemap.xml`,
    "",
  );

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
