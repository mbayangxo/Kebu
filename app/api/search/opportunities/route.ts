import { NextResponse } from "next/server";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { requireUser } from "@/lib/create/auth";
import {
  hasVerifiedAfricanOpportunityAccess,
  loadAfricanOpportunityEntitlement,
} from "@/lib/entitlements/african-opportunity-access";
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

type OpportunityResult = {
  id: string;
  title: string;
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

function toResult(row: Row): OpportunityResult {
  return {
    id: row.entity_id,
    title: row.title,
    summary: row.summary,
    trustLabel: row.trust_label || "needs_review",
    sourceName: row.source_name || "Opportunity source",
    sourceUrl: row.source_url,
    fetchedAt: row.fetched_at,
    href: `/opportunity/${row.entity_id}`,
  };
}

/**
 * The first authenticated Search mode. Checks the entitlement first for a
 * clear, actionable 401 (not signed in) / 403 (needsEntitlement: true,
 * signed in but not verified) — public.search_opportunities()'s own live
 * check is defense-in-depth behind that: it re-verifies the caller's
 * afrique_ids row on every call and returns zero rows (never an error) for
 * any unverified/missing caller, so even a direct RPC call independent of
 * this route can never leak a result.
 */
export async function GET(req: Request) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const entitlement = await loadAfricanOpportunityEntitlement({ supabase, userId: user.id });
  if (!hasVerifiedAfricanOpportunityAccess(entitlement)) {
    return NextResponse.json({ error: "Verify your Afrique ID to search Opportunities.", needsEntitlement: true }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const limit = clampInt(searchParams.get("limit"), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const offset = clampInt(searchParams.get("offset"), 0, 0, MAX_OFFSET);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("search_opportunities", {
    p_user_id: user.id,
    p_query: q || null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("[kebu-search/opportunities] search_opportunities RPC failed:", error);
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
