import { NextResponse } from "next/server";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";

type Params = { params: Promise<{ subdomain: string }> };

/** Explicit route so `/robots.txt` is not swallowed by `[pageSlug]`. */
export async function GET(_req: Request, { params }: Params) {
  const { subdomain } = await params;
  const deployment = await loadPublicDeployment(subdomain);
  if (!deployment || deployment.seo.noIndex) {
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" },
    });
  }

  const base = deployment.httpsUrl.replace(/\/$/, "");

  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    // AI crawlers — explicit allow so content appears in AI answers and search summaries
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: Claude-Web",
    "Allow: /",
    "",
    "User-agent: anthropic-ai",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: Googlebot",
    "Allow: /",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");

  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
