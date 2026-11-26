import { NextResponse } from "next/server";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 120;
const COUNTRY_CODE_RE = /^[A-Z]{2}$/;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_OFFSET = 2000;

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  // Number(null) is 0 and Number("") is also 0, not NaN — both would silently
  // become a real, clamped value here instead of falling back to the default,
  // which for `limit` would mean "no limit param" quietly becomes limit=1.
  if (raw === null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

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
  total_count: number | string;
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

/**
 * Public, unauthenticated Business Search — the first real Kebu Search mode.
 * Calls public.search_businesses(), which joins search_documents to the live
 * businesses table on every call: a business that has moved out of
 * lifecycle_status='active' (demoted or deleted) can never appear here,
 * regardless of how stale the cached index is. Real relevance ranking
 * (ts_rank) with a deterministic tie-break, and real pagination with a true
 * total count (not just a top-20 cutoff), both happen inside that function
 * — this route only clamps the untrusted limit/offset inputs and passes them
 * through.
 */
export async function GET(req: Request) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const rawCountry = (searchParams.get("country") ?? "").trim().toUpperCase();
  const country = COUNTRY_CODE_RE.test(rawCountry) ? rawCountry : null;
  const limit = clampInt(searchParams.get("limit"), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const offset = clampInt(searchParams.get("offset"), 0, 0, MAX_OFFSET);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("search_businesses", {
    p_query: q || null,
    p_country: country,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("[kebu-search/businesses] search_businesses RPC failed:", error);
    return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  const results = rows.map(toResult);
  const total = rows.length > 0 ? Number(rows[0]!.total_count) : 0;
  return NextResponse.json({
    query: q,
    results,
    mode: q ? ("query" as const) : ("recent" as const),
    total,
    offset,
    limit,
  });
}
