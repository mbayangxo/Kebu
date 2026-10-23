import { NextResponse } from "next/server";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 120;
const RESULT_LIMIT = 20;

type BusinessResult = {
  id: string;
  name: string;
  summary: string;
  category: string | null;
  countryCode: string | null;
  trustLabel: "verified" | "unverified";
  sourceName: string;
  sourceUrl: string | null;
  fetchedAt: string;
  href: string;
};

type Row = {
  entity_id: string;
  title: string;
  summary: string;
  source_url: string | null;
  source_name: string | null;
  trust_label: string | null;
  fetched_at: string;
};

function toResult(row: Row): BusinessResult {
  const [category, countryCode] = row.summary.split(" · ");
  return {
    id: row.entity_id,
    name: row.title,
    summary: row.summary,
    category: category || null,
    countryCode: countryCode && countryCode.length === 2 ? countryCode : null,
    trustLabel: row.trust_label === "verified" ? "verified" : "unverified",
    sourceName: row.source_name || "Kebu Business Directory",
    sourceUrl: row.source_url,
    fetchedAt: row.fetched_at,
    href: `/kebu-search/business/${row.entity_id}`,
  };
}

/**
 * Public, unauthenticated Business Search — the first real Kebu Search mode.
 * Reads only search_documents rows that are mode='businesses' and
 * access_scope='public' (service-role only table; RLS blocks anon/authenticated
 * direct reads, so this route is the sole read path for anonymous visitors).
 */
export async function GET(req: Request) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const country = (searchParams.get("country") ?? "").trim().toUpperCase().slice(0, 2);

  const admin = createAdminClient();

  if (!q) {
    // Honest empty-query state: real, recently-indexed businesses, not fabricated results.
    let browse = admin
      .from("search_documents")
      .select("entity_id, title, summary, source_url, source_name, trust_label, fetched_at")
      .eq("mode", "businesses")
      .eq("access_scope", "public")
      .order("updated_at", { ascending: false })
      .limit(RESULT_LIMIT);
    if (country) browse = browse.ilike("summary", `%· ${country}%`);
    const { data, error } = await browse;
    if (error) {
      console.error("[kebu-search/businesses] browse query failed:", error);
      return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 500 });
    }
    return NextResponse.json({ query: "", results: (data ?? []).map(toResult), mode: "recent" as const });
  }

  let query = admin
    .from("search_documents")
    .select("entity_id, title, summary, source_url, source_name, trust_label, fetched_at")
    .eq("mode", "businesses")
    .eq("access_scope", "public")
    .textSearch("search_vector", q, { type: "websearch", config: "simple" })
    .limit(RESULT_LIMIT);
  if (country) query = query.ilike("summary", `%· ${country}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 500 });

  return NextResponse.json({ query: q, results: (data ?? []).map(toResult), mode: "query" as const });
}
