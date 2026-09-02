import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("business registration migration bundle", () => {
  it("APPLY_MIGRATIONS_005_007 includes core tables, grants, and logo_url", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/APPLY_MIGRATIONS_005_007.sql"),
      "utf8",
    );
    expect(sql).toContain("create table if not exists public.businesses");
    expect(sql).toContain("create table if not exists public.registration_progress");
    expect(sql).toContain("grant select, insert, update, delete on all tables");
    expect(sql).toContain("logo_url");
    expect(sql).not.toContain("business_registration_progress");
  });
});
