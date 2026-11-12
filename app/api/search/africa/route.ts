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

type SiteResult = {
  id: string;
  kind: "site" | "store";
  name: string;
  summary: string;
  trustLabel: string;
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string;
  href: string;
};

type Row = {
  entity_id: string;
  entity_type: string;
  title: string;
  summary: string;
  source_url: string | null;
  source_name: string | null;
  trust_label: string | null;
  fetched_at: string;
  total_count: number | string;
};

function toResult(row: Row): SiteResult | null {
  // source_url is always set by the indexer (https://<subdomain>.thekebu.com)
  // for every real row this function can return — but never trust that
  // blindly across a boundary; skip rather than render a brokenly-hrefed card.
  if (!row.source_url) return null;
  return {
    id: row.entity_id,
    kind: row.entity_type === "store" ? "store" : "site",
    name: row.title,
    summary: row.summary,
    trustLabel: row.trust_label || "published",
    sourceName: row.source_name || "Kebu Sites",
    sourceUrl: row.source_url,
    fetchedAt: row.fetched_at,
    href: row.source_url,
  };
}

/**
 * Public, unauthenticated Africa Search — Kebu's own real published sites
 * and stores. Calls public.search_sites(), which live-joins each candidate
 * to projects.status on every call: a site unpublished after indexing can
 * never appear here, regardless of how stale the cached index is. Links go
 * straight to the real live site rather than a Search-specific detail page,
 * since the site itself already is the real destination.
 */
export async function GET(req: Request) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const limit = clampInt(searchParams.get("limit"), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const offset = clampInt(searchParams.get("offset"), 0, 0, MAX_OFFSET);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("search_sites", {
    p_query: q || null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("[kebu-search/africa] search_sites RPC failed:", error);
    return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  const results = rows.map(toResult).filter((r): r is SiteResult => r !== null);
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
