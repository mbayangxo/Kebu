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

describe("search_businesses pagination migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20261024010000_search_businesses_pagination.sql"),
    "utf8",
  );

  it("replaces the 2-arg function with a 4-arg one that reports a real total count", () => {
    expect(sql).toContain("drop function if exists public.search_businesses(text, text)");
    expect(sql).toContain("p_limit integer default 20");
    expect(sql).toContain("p_offset integer default 0");
    expect(sql).toContain("count(*) over () as total_count");
  });

  it("clamps limit and offset server-side instead of trusting the caller", () => {
    expect(sql).toMatch(/limit greatest\(1, least\(coalesce\(p_limit, 20\), 50\)\)/);
    expect(sql).toMatch(/offset greatest\(0, least\(coalesce\(p_offset, 0\), 2000\)\)/);
  });

  it("keeps the live active-status join and deterministic ranking from the previous migration", () => {
    expect(sql).toContain("join public.businesses b on b.id = c.business_id");
    expect(sql).toContain("b.lifecycle_status = 'active'");
    expect(sql).toMatch(/order by rank desc, updated_at desc, business_id/);
  });

  it("is locked down to service_role only on the new 4-arg signature", () => {
    expect(sql).toContain(
      "revoke execute on function public.search_businesses(text, text, integer, integer) from public, anon, authenticated",
    );
    expect(sql).toContain("grant execute on function public.search_businesses(text, text, integer, integer) to service_role");
  });
});

describe("search_documents products mode migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20261024020000_search_index_products_mode.sql"),
    "utf8",
  );

  it("is additive: widens the mode check constraint and adds price_label", () => {
    expect(sql).toContain("check (mode in ('sites', 'opportunities', 'businesses', 'products'))");
    expect(sql).toContain("add column if not exists price_label text");
    expect(sql).not.toContain("drop table");
    expect(sql).not.toContain("delete from");
  });

  it("does not guess the existing check constraint's name", () => {
    expect(sql).not.toMatch(/drop constraint if exists search_documents_mode_check/);
    expect(sql).toContain("pg_constraint");
    expect(sql).toContain("attname = 'mode'");
  });
});

describe("search_products RPC migration", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261024030000_search_products_rpc.sql"), "utf8");

  it("live-joins each entity type to its own real source table's publish status", () => {
    expect(sql).toContain("entity_type = 'shop_product'");
    expect(sql).toContain("join public.projects p on p.id = pp.project_id");
    expect(sql).toContain("pp.is_active and p.status = 'published'");
    expect(sql).toContain("entity_type = 'marketplace_template'");
    expect(sql).toContain("mt.status = 'published'");
  });

  it("ranks with ts_rank and a deterministic tie-break, and clamps limit/offset", () => {
    expect(sql).toContain("ts_rank(c.search_vector, websearch_to_tsquery('simple', p_query))");
    expect(sql).toMatch(/order by rank desc, updated_at desc, pid/);
    expect(sql).toMatch(/limit greatest\(1, least\(coalesce\(p_limit, 20\), 50\)\)/);
    expect(sql).toMatch(/offset greatest\(0, least\(coalesce\(p_offset, 0\), 2000\)\)/);
  });

  it("is locked down to service_role only", () => {
    expect(sql).toContain(
      "revoke execute on function public.search_products(text, integer, integer) from public, anon, authenticated",
    );
    expect(sql).toContain("grant execute on function public.search_products(text, integer, integer) to service_role");
  });
});
