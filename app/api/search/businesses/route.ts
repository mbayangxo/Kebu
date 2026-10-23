import { NextResponse } from "next/server";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 120;
const RESULT_LIMIT = 20;
const COUNTRY_CODE_RE = /^[A-Z]{2}$/;

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
  category: string | null;
  country_code: string | null;
  fetched_at: string;
};

function toResult(row: Row): BusinessResult {
  return {
    id: row.entity_id,
    name: row.title,
    summary: row.summary,
    category: row.category,
    countryCode: row.country_code,
    trustLabel: row.trust_label === "verified" ? "verified" : "unverified",
    sourceName: row.source_name || "Kebu Business Directory",
    sourceUrl: row.source_url,
    fetchedAt: row.fetched_at,
    href: `/kebu-search/business/${row.entity_id}`,
  };
}

const SELECT_COLUMNS =
  "entity_id, title, summary, source_url, source_name, trust_label, category, country_code, fetched_at";

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
  const rawCountry = (searchParams.get("country") ?? "").trim().toUpperCase();
  const country = COUNTRY_CODE_RE.test(rawCountry) ? rawCountry : null;

  const admin = createAdminClient();

  if (!q) {
    // Honest empty-query state: real, recently-indexed businesses, not fabricated results.
    let browse = admin
      .from("search_documents")
      .select(SELECT_COLUMNS)
      .eq("mode", "businesses")
      .eq("access_scope", "public")
      .order("updated_at", { ascending: false })
      .limit(RESULT_LIMIT);
    if (country) browse = browse.eq("country_code", country);
    const { data, error } = await browse;
    if (error) {
      console.error("[kebu-search/businesses] browse query failed:", error);
      return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 500 });
    }
    return NextResponse.json({ query: "", results: (data ?? []).map(toResult), mode: "recent" as const });
  }

  let query = admin
    .from("search_documents")
    .select(SELECT_COLUMNS)
    .eq("mode", "businesses")
    .eq("access_scope", "public")
    .textSearch("search_vector", q, { type: "websearch", config: "simple" })
    .limit(RESULT_LIMIT);
  if (country) query = query.eq("country_code", country);

  const { data, error } = await query;
  if (error) {
    console.error("[kebu-search/businesses] search query failed:", error);
    return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 500 });
  }

  return NextResponse.json({ query: q, results: (data ?? []).map(toResult), mode: "query" as const });
}
