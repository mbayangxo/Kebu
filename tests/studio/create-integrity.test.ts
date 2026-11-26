import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Studio create integrity", () => {
  it("keeps database design types aligned with Studio presets", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260920114000_studio_design_type_alignment.sql"), "utf8");
    for (const type of ["poster","social_square","flyer","instagram_post","instagram_story","facebook_post","whatsapp_status","banner","business_card"]) {
      expect(sql).toContain("'" + type + "'::text");
    }
  });

  it("uses a full-page creation surface instead of a centered SaaS modal layout", () => {
    const page = readFileSync(join(process.cwd(), "app/studio/new/page.tsx"), "utf8");
    expect(page).toContain('grid min-h-[calc(100vh-64px)]');
    expect(page).toContain("Start with the");
    expect(page).toContain("Open canvas");
    expect(page).not.toContain("max-w-2xl space-y-6");
  });
});
