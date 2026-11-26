import { NextResponse, type NextRequest } from "next/server";
import { mapsProxyRateLimit } from "@/lib/api-guard";
import { geocodeSearch } from "@/lib/maps/provider";

export const dynamic = "force-dynamic";

/** "Where is this place?" — server-side proxy to the geocoding provider. */
export async function GET(req: NextRequest) {
  const limited = mapsProxyRateLimit(req);
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }
  if (q.length > 200) {
    return NextResponse.json({ error: "Query too long." }, { status: 400 });
  }

  const result = await geocodeSearch(q);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 502 });
  }
  return NextResponse.json({ results: result.results });
}
