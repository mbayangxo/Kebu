import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("search_documents businesses mode migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20261023010000_search_index_businesses_mode.sql"),
    "utf8",
  );

  it("is additive: widens the mode check constraint and adds real columns", () => {
    expect(sql).toContain("check (mode in ('sites', 'opportunities', 'businesses'))");
    expect(sql).toContain("add column if not exists category text");
    expect(sql).toContain("add column if not exists country_code text");
    expect(sql).not.toContain("drop table");
    expect(sql).not.toContain("delete from");
  });

  it("does not guess the existing check constraint's name", () => {
    // A hardcoded "drop constraint if exists <guessed-name>" silently no-ops if the
    // guess is wrong, leaving the old (sites/opportunities-only) constraint in place
    // forever — the migration would appear to succeed while the feature stays broken.
    // It must look the constraint up by which column it actually applies to instead.
    expect(sql).not.toMatch(/drop constraint if exists search_documents_mode_check/);
    expect(sql).toContain("pg_constraint");
    expect(sql).toContain("attname = 'mode'");
  });
});

describe("search_businesses RPC migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20261023020000_search_businesses_rpc.sql"),
    "utf8",
  );

  it("joins live to businesses and re-checks lifecycle_status on every call", () => {
    expect(sql).toContain("join public.businesses b on b.id = c.business_id");
    expect(sql).toContain("b.lifecycle_status = 'active'");
  });

  it("ranks with ts_rank and a deterministic tie-break", () => {
    expect(sql).toContain("ts_rank(c.search_vector, websearch_to_tsquery('simple', p_query))");
    expect(sql).toMatch(/order by rank desc, c\.updated_at desc, c\.business_id/);
  });

  it("is locked down to service_role only, like search_documents itself", () => {
    expect(sql).toContain("revoke execute on function public.search_businesses(text, text) from public, anon, authenticated");
    expect(sql).toContain("grant execute on function public.search_businesses(text, text) to service_role");
  });
});
