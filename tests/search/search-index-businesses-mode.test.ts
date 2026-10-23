import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("search_documents businesses mode migration", () => {
  it("is additive: widens the mode check constraint without touching other columns", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20261023010000_search_index_businesses_mode.sql"),
      "utf8",
    );
    expect(sql).toContain("drop constraint if exists search_documents_mode_check");
    expect(sql).toContain("check (mode in ('sites', 'opportunities', 'businesses'))");
    expect(sql).not.toContain("drop table");
    expect(sql).not.toContain("delete from");
  });
});
