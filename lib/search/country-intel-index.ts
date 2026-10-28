import type { SupabaseClient } from "@supabase/supabase-js";

type CountryIntelMode = "research" | "trade" | "culture";

type CountryIntelDocument = {
  source_key: string;
  mode: CountryIntelMode;
  entity_type: "country_profile";
  entity_id: string;
  title: string;
  summary: string;
  source_url: string | null;
  source_name: string;
  trust_label: string;
  access_scope: "public";
  fetched_at: string;
  updated_at: string;
};

type CountryProfileRow = {
  country_code: string;
  country: string;
  data_confidence: string | null;
  economy_overview: string | null;
  startup_ecosystem: string | null;
  technology_ecosystem: string | null;
  universities: string[] | null;
  major_exports: string[] | null;
  major_imports: string[] | null;
  trade_agreements: string[] | null;
  industrial_zones: string[] | null;
  manufacturing_sectors: string[] | null;
  logistics: string | null;
  cultural_notes: string | null;
  historical_notes: string | null;
  historical_empires: string[] | null;
  ethnic_groups: string[] | null;
  business_etiquette: string[] | null;
  diaspora_notes: string | null;
  last_verified_at: string | null;
  updated_at: string | null;
};

const DEFAULT_PAGE_SIZE = 200;

function joinList(items: string[] | null | undefined, max = 6): string | null {
  if (!items || items.length === 0) return null;
  return items.slice(0, max).join(", ");
}

/**
 * Builds the real-data-only Research summary: whichever real narrative/list
 * fields the profile actually has, never an invented sentence. A profile
 * with none of these fields populated yields no Research document for that
 * country rather than a fabricated placeholder.
 */
function researchSummary(row: CountryProfileRow): string | null {
  const parts = [
    row.economy_overview,
    row.startup_ecosystem,
    row.technology_ecosystem,
    joinList(row.universities, 4) ? `Universities: ${joinList(row.universities, 4)}.` : null,
  ].filter((p): p is string => Boolean(p && p.trim()));
  if (parts.length === 0) return null;
  return parts.join(" ").slice(0, 500);
}

/** Same real-data-only contract as researchSummary(), for trade/export/import/logistics fields. */
function tradeSummary(row: CountryProfileRow): string | null {
  const parts = [
    joinList(row.major_exports) ? `Major exports: ${joinList(row.major_exports)}.` : null,
    joinList(row.major_imports) ? `Major imports: ${joinList(row.major_imports)}.` : null,
    joinList(row.trade_agreements) ? `Trade agreements: ${joinList(row.trade_agreements)}.` : null,
    joinList(row.industrial_zones) ? `Industrial zones: ${joinList(row.industrial_zones)}.` : null,
    joinList(row.manufacturing_sectors) ? `Manufacturing: ${joinList(row.manufacturing_sectors)}.` : null,
    row.logistics,
  ].filter((p): p is string => Boolean(p && p.trim()));
  if (parts.length === 0) return null;
  return parts.join(" ").slice(0, 500);
}

/**
 * Same real-data-only contract as researchSummary(), for cultural/
 * historical fields. This is Kebu's own country cultural reference data —
 * not RECT video/creator content, which this codebase has no integration
 * with. The summary text itself never claims to be RECT content.
 */
function cultureSummary(row: CountryProfileRow): string | null {
  const parts = [
    row.cultural_notes,
    row.historical_notes,
    joinList(row.historical_empires) ? `Historical empires: ${joinList(row.historical_empires)}.` : null,
    joinList(row.ethnic_groups) ? `Ethnic groups: ${joinList(row.ethnic_groups)}.` : null,
    joinList(row.business_etiquette) ? `Business etiquette: ${joinList(row.business_etiquette)}.` : null,
    row.diaspora_notes,
  ].filter((p): p is string => Boolean(p && p.trim()));
  if (parts.length === 0) return null;
  return parts.join(" ").slice(0, 500);
}

function countryDoc(
  mode: CountryIntelMode,
  row: CountryProfileRow,
  summary: string,
  now: string,
): CountryIntelDocument {
  return {
    source_key: `country-${mode}:${row.country_code}`,
    mode,
    entity_type: "country_profile",
    entity_id: row.country_code,
    title: row.country,
    summary,
    source_url: null,
    source_name: "Kebu Country Intelligence",
    // Passed through verbatim (low/moderate/high) -- never upgraded to
    // "verified": country_profiles tracks its own honest confidence tier
    // separately from the Opportunity OS Verified/Estimated label, and this
    // index must not blur the two.
    trust_label: row.data_confidence || "unverified",
    access_scope: "public",
    fetched_at: now,
    updated_at: row.last_verified_at || row.updated_at || now,
  };
}

/**
 * Indexes the one real, public-facing country-intelligence dataset in this
 * codebase -- country_profiles, scoped to publish_status='published' (its
 * own real RLS policy already allows anyone to read exactly this set) --
 * into three Search modes at once: research (market intelligence), trade
 * (exports/imports/routes context), and culture (cultural/historical
 * reference data -- not RECT video/creator content, which this codebase
 * has no integration with; see the mode-widening migration for why).
 * Same contract as every other Search indexer: keyset-paginated full scan,
 * abort-before-write on any page error, reconcile (delete) stale
 * search_documents rows only after the scan completes successfully, scoped
 * per mode so reconciling one never touches the other. The actual security
 * boundary is public.search_country_intel()'s live join to
 * country_profiles.publish_status, not this reconciliation step.
 */
export async function refreshCountryIntelSearchIndex(
  admin: SupabaseClient,
  opts: { pageSize?: number } = {},
) {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const now = new Date().toISOString();
  const researchDocs: CountryIntelDocument[] = [];
  const tradeDocs: CountryIntelDocument[] = [];
  const cultureDocs: CountryIntelDocument[] = [];
  let cursor: string | null = null;

  for (;;) {
    let page = admin
      .from("country_profiles")
      .select(
        "country_code, country, data_confidence, economy_overview, startup_ecosystem, technology_ecosystem, universities, major_exports, major_imports, trade_agreements, industrial_zones, manufacturing_sectors, logistics, cultural_notes, historical_notes, historical_empires, ethnic_groups, business_etiquette, diaspora_notes, last_verified_at, updated_at",
      )
      .eq("publish_status", "published")
      .order("country_code", { ascending: true });
    if (cursor) page = page.gt("country_code", cursor);

    const { data, error } = await page.limit(pageSize);
    if (error) throw error; // abort: nothing has been written yet

    const rows = (data ?? []) as CountryProfileRow[];
    if (rows.length === 0) break;
    for (const row of rows) {
      const research = researchSummary(row);
      if (research) researchDocs.push(countryDoc("research", row, research, now));
      const trade = tradeSummary(row);
      if (trade) tradeDocs.push(countryDoc("trade", row, trade, now));
      const culture = cultureSummary(row);
      if (culture) cultureDocs.push(countryDoc("culture", row, culture, now));
    }
    if (rows.length < pageSize) break;
    cursor = rows[rows.length - 1]!.country_code;
  }

  const allDocs = [...researchDocs, ...tradeDocs, ...cultureDocs];
  if (allDocs.length) {
    const { error: upsertError } = await admin.from("search_documents").upsert(allDocs, { onConflict: "source_key" });
    if (upsertError) throw upsertError;
  }

  let staleRemoved = 0;
  for (const [modeName, activeDocs] of [
    ["research", researchDocs],
    ["trade", tradeDocs],
    ["culture", cultureDocs],
  ] as const) {
    const activeIds = new Set(activeDocs.map((d) => d.entity_id));
    const { data: existingRows, error: existingError } = await admin
      .from("search_documents")
      .select("entity_id")
      .eq("mode", modeName);
    if (existingError) throw existingError;

    const staleIds = ((existingRows ?? []) as Array<{ entity_id: string }>)
      .map((r) => r.entity_id)
      .filter((id) => !activeIds.has(id));

    if (staleIds.length) {
      const { error: deleteError } = await admin
        .from("search_documents")
        .delete()
        .eq("mode", modeName)
        .in("entity_id", staleIds);
      if (deleteError) throw deleteError;
      staleRemoved += staleIds.length;
    }
  }

  return {
    research: researchDocs.length,
    trade: tradeDocs.length,
    culture: cultureDocs.length,
    stale_removed: staleRemoved,
  };
}
