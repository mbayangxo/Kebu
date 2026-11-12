import type { SupabaseClient } from "@supabase/supabase-js";

type PeopleSearchDocument = {
  source_key: string;
  mode: "people";
  entity_type: "developer";
  entity_id: string;
  title: string;
  summary: string;
  source_url: string | null;
  source_name: string;
  trust_label: "verified";
  access_scope: "public";
  fetched_at: string;
  updated_at: string;
};

type DeveloperProfileRow = {
  id: string;
  display_name: string;
  bio: string | null;
  website_url: string | null;
  updated_at: string | null;
};

const DEFAULT_PAGE_SIZE = 500;

function developerDoc(row: DeveloperProfileRow, now: string): PeopleSearchDocument {
  return {
    source_key: "developer:" + row.id,
    mode: "people",
    entity_type: "developer",
    entity_id: row.id,
    title: row.display_name,
    summary: (row.bio || "Kebu Studio marketplace developer.").slice(0, 400),
    source_url: row.website_url || null,
    source_name: "Kebu Studio Marketplace",
    trust_label: "verified",
    access_scope: "public",
    fetched_at: now,
    updated_at: row.updated_at || now,
  };
}

/**
 * Indexes the one real, public-facing creator/developer dataset in this
 * codebase: developer_profiles, scoped to status='approved' (its own real
 * RLS policy already allows anyone to read exactly this set). Same
 * contract as the other Search indexers: keyset-paginated full scan,
 * abort-before-write on any page error, reconcile (delete) stale
 * search_documents rows only after the scan completes successfully. The
 * actual security boundary is public.search_people()'s live join to
 * developer_profiles.status, not this reconciliation step.
 */
export async function refreshPeopleSearchIndex(
  admin: SupabaseClient,
  opts: { pageSize?: number } = {},
) {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const now = new Date().toISOString();
  const docs: PeopleSearchDocument[] = [];
  let cursor: string | null = null;

  for (;;) {
    let page = admin
      .from("developer_profiles")
      .select("id, display_name, bio, website_url, updated_at")
      .eq("status", "approved")
      .order("id", { ascending: true });
    if (cursor) page = page.gt("id", cursor);

    const { data, error } = await page.limit(pageSize);
    if (error) throw error; // abort: nothing has been written yet

    const rows = (data ?? []) as DeveloperProfileRow[];
    if (rows.length === 0) break;
    for (const row of rows) docs.push(developerDoc(row, now));
    if (rows.length < pageSize) break;
    cursor = rows[rows.length - 1]!.id;
  }

  const activeIds = new Set(docs.map((d) => d.entity_id));

  if (docs.length) {
    const { error: upsertError } = await admin.from("search_documents").upsert(docs, { onConflict: "source_key" });
    if (upsertError) throw upsertError;
  }

  const { data: existingRows, error: existingError } = await admin
    .from("search_documents")
    .select("entity_id")
    .eq("mode", "people");
  if (existingError) throw existingError;

  const staleIds = ((existingRows ?? []) as Array<{ entity_id: string }>)
    .map((r) => r.entity_id)
    .filter((id) => !activeIds.has(id));

  if (staleIds.length) {
    const { error: deleteError } = await admin
      .from("search_documents")
      .delete()
      .eq("mode", "people")
      .in("entity_id", staleIds);
    if (deleteError) throw deleteError;
  }

  return { people: docs.length, stale_removed: staleIds.length };
}
