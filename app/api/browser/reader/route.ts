import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertSafePublicUrl } from "@/lib/browser/url-safety";

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
    await assertSafePublicUrl(url.toString());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": "KebuBrowserReader/1.0 (+https://thekebu.com)" },
    }).finally(() => clearTimeout(timeout));

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect missing location.");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new Error("Page returned HTTP " + response.status + ".");
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html") && !type.includes("text/plain")) throw new Error("Reader supports HTML and plain text pages.");
    const length = Number(response.headers.get("content-length") || "0");
    if (length > 1_500_000) throw new Error("Page is too large for reader mode.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Page body unavailable.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > 1_500_000) { await reader.cancel(); throw new Error("Page is too large for reader mode."); }
      chunks.push(part.value);
    }
    const all = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
    const raw = new TextDecoder().decode(all);
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
    const safe = await assertSafePublicUrl(raw);
    const page = await fetchSafe(safe);
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not open page." }, { status: 400 });
  }
}
