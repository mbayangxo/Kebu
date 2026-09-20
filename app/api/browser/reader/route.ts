import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { resolveSafePublicUrl } from "@/lib/browser/url-safety";
import { requestPinnedReaderTarget } from "@/lib/browser/pinned-reader-request";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

function stripHtml(html: string): { title: string; text: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
    .replace(/\s+/g, " ").trim().slice(0, 240);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120000);
  return { title, text };
}

async function fetchSafe(initial: URL) {
  let url = initial;
  for (let redirects = 0; redirects < 5; redirects += 1) {
    const target = await resolveSafePublicUrl(url.toString());
    const response = await requestPinnedReaderTarget(target);

    if (response.status >= 300 && response.status < 400) {
      const rawLocation = response.headers.location;
      const location = Array.isArray(rawLocation) ? rawLocation[0] : rawLocation;
      if (!location) throw new Error("Redirect missing location.");
      url = new URL(location, url);
      continue;
    }
    if (response.status < 200 || response.status >= 300) throw new Error("Page returned HTTP " + response.status + ".");
    const rawType = response.headers["content-type"];
    const type = (Array.isArray(rawType) ? rawType[0] : rawType) || "";
    if (!type.includes("text/html") && !type.includes("text/plain")) throw new Error("Reader supports HTML and plain text pages.");
    const raw = new TextDecoder().decode(response.body);
    const parsed = type.includes("text/html") ? stripHtml(raw) : { title: url.hostname, text: raw.slice(0, 120000) };
    return { ...parsed, finalUrl: url.toString() };
  }
  throw new Error("Too many redirects.");
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "URL required." }, { status: 400 });
  try {
    const safe = await resolveSafePublicUrl(raw);
    const page = await fetchSafe(safe.url);
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not open page." }, { status: 400 });
  }
}
