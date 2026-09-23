import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Kebu Search phase-one index", () => {
  it("stores source metadata and a real full-text index", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260920087000_search_index_phase_one.sql"), "utf8");
    expect(sql).toContain("search_vector tsvector generated always");
    expect(sql).toContain("source_url text");
    expect(sql).toContain("trust_label text");
    expect(sql).toContain("using gin(search_vector)");
  });

  it("keeps the index service-write-only", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260920087000_search_index_phase_one.sql"), "utf8");
    expect(sql).toContain("revoke all on public.search_documents from public, anon, authenticated");
    expect(sql).toContain("grant all on public.search_documents to service_role");
  });
});
