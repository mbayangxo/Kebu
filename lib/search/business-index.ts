import type { SupabaseClient } from "@supabase/supabase-js";

type BusinessSearchDocument = {
  source_key: string;
  mode: "businesses";
  entity_type: "business";
  entity_id: string;
  title: string;
  summary: string;
  source_url: string | null;
  source_name: string;
  trust_label: "verified" | "unverified";
  access_scope: "public";
  category: string | null;
  country_code: string | null;
  fetched_at: string;
  updated_at: string;
};

type BusinessRow = {
  id: string;
  trading_name: string | null;
  legal_name: string;
  country_code: string | null;
  category: string | null;
  description: string | null;
  website: string | null;
  verification_level: number | null;
  updated_at: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  agriculture: "Agriculture",
  fashion: "Fashion",
  beauty: "Beauty",
  food: "Food",
  retail: "Retail",
  technology: "Technology",
  education: "Education",
  services: "Services",
  tourism: "Tourism",
  construction: "Construction",
  manufacturing: "Manufacturing",
  health: "Health",
  other: "Other",
};

const DEFAULT_PAGE_SIZE = 500;

function toDoc(business: BusinessRow, now: string): BusinessSearchDocument {
  const categoryLabel = business.category ? (CATEGORY_LABELS[business.category] ?? business.category) : null;
  return {
    source_key: "business:" + business.id,
    mode: "businesses",
    entity_type: "business",
    entity_id: business.id,
    title: business.trading_name || business.legal_name,
    summary: [categoryLabel, business.country_code, business.description].filter(Boolean).join(" · ").slice(0, 400),
    source_url: business.website || null,
    source_name: "Kebu Business Directory",
    trust_label: (business.verification_level ?? 0) > 0 ? "verified" : "unverified",
    access_scope: "public",
    category: business.category || null,
    country_code: business.country_code || null,
    fetched_at: now,
    updated_at: business.updated_at || now,
  };
}

/**
 * Indexes every business that has actually left draft status — not just the
 * first page. Pages through the full table with keyset pagination (stable
 * under concurrent writes, unlike OFFSET paging) instead of the previous
 * hard `.limit(5000)` cutoff, which would have silently stopped indexing
 * partway through once the business count passed it.
 *
 * If any page fails to load, this throws immediately and writes nothing —
 * a partial scan must never be treated as the complete active set, or the
 * reconciliation step below would delete businesses it simply hadn't
 * reached yet. Only after every page has loaded successfully does it
 * upsert the current set and then remove any previously-indexed business
 * that is no longer in it (demoted to draft/suspended/archived, or
 * deleted outright) — that removal is index hygiene, not the security
 * boundary: public.search_businesses() re-checks lifecycle_status live on
 * every query, so a search can never return a business that stopped being
 * active, even in the window before this cleanup next runs.
 */
export async function refreshBusinessSearchIndex(
  admin: SupabaseClient,
  opts: { pageSize?: number } = {},
) {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const now = new Date().toISOString();
  const docs: BusinessSearchDocument[] = [];
  let cursor: string | null = null;

  for (;;) {
    let page = admin
      .from("businesses")
      .select("id, public_kebu_id, legal_name, trading_name, country_code, category, description, website, verification_level, updated_at")
      .eq("lifecycle_status", "active")
      .order("id", { ascending: true });
    if (cursor) page = page.gt("id", cursor);

    const { data, error } = await page.limit(pageSize);
    if (error) throw error; // abort: nothing has been written yet, so nothing to roll back

    const rows = (data ?? []) as BusinessRow[];
    if (rows.length === 0) break;
    for (const business of rows) docs.push(toDoc(business, now));
    if (rows.length < pageSize) break;
    cursor = rows[rows.length - 1]!.id;
  }

  // Reached only after every page loaded successfully — docs is now the
  // complete, authoritative set of currently-active businesses.
  const activeIds = new Set(docs.map((d) => d.entity_id));

  if (docs.length) {
    const { error: upsertError } = await admin.from("search_documents").upsert(docs, { onConflict: "source_key" });
    if (upsertError) throw upsertError;
  }

  const { data: existingRows, error: existingError } = await admin
    .from("search_documents")
    .select("entity_id")
    .eq("mode", "businesses");
  if (existingError) throw existingError;

  const staleIds = ((existingRows ?? []) as Array<{ entity_id: string }>)
    .map((r) => r.entity_id)
    .filter((id) => !activeIds.has(id));

  if (staleIds.length) {
    const { error: deleteError } = await admin
      .from("search_documents")
      .delete()
      .eq("mode", "businesses")
      .in("entity_id", staleIds);
    if (deleteError) throw deleteError;
  }

  return { businesses: docs.length, stale_removed: staleIds.length };
}
