import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Track B platform infrastructure migration", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260920040000_platform_durability.sql"), "utf8");
  it("ships durable jobs with atomic SKIP LOCKED claiming", () => {
    expect(sql).toContain("public.platform_jobs");
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain("claim_platform_jobs");
  });
  it("ships events, notifications, flags and usage with RLS", () => {
    for (const table of ["platform_events","user_notifications","platform_feature_flags","platform_feature_flag_overrides","platform_usage_daily"]) {
      expect(sql).toContain(table);
    }
    expect(sql).toContain("Users read own notifications");
    expect(sql).toContain("increment_platform_usage");
  });
});
