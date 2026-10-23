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
