import { NextResponse } from "next/server";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 120;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_OFFSET = 2000;

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  // Number(null) is 0 and Number("") is also 0, not NaN — both would silently
  // become a real, clamped value here instead of falling back to the default.
  if (raw === null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

type CountryIntelResult = {
  id: string;
  name: string;
  summary: string;
  trustLabel: string;
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
  total_count: number | string;
};

function toResult(row: Row): CountryIntelResult {
  return {
    id: row.entity_id,
    name: row.title,
    summary: row.summary,
    trustLabel: row.trust_label || "unverified",
    sourceName: row.source_name || "Kebu",
    sourceUrl: row.source_url,
    fetchedAt: row.fetched_at,
    href: `/kebu-search/country/${row.entity_id}`,
  };
}

/**
 * Public, unauthenticated Research Search — country-level market
 * intelligence. Calls public.search_country_intel('research', ...), which
 * live-joins each candidate to country_profiles.publish_status on every
 * call: a profile reverted to draft or archived can never appear here,
 * regardless of how stale the cached index is.
 */
export async function GET(req: Request) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const limit = clampInt(searchParams.get("limit"), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const offset = clampInt(searchParams.get("offset"), 0, 0, MAX_OFFSET);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("search_country_intel", {
    p_mode: "research",
    p_query: q || null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("[kebu-search/research] search_country_intel RPC failed:", error);
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
