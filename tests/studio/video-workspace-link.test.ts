import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Studio design/video workspace link", () => {
  it("links video projects to workspace and source design without duplicating auth", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260920092000_studio_video_workspace_link.sql"),
      "utf8",
    );
    expect(sql).toContain("business_id uuid references public.businesses");
    expect(sql).toContain("source_design_id uuid references public.create_designs");
    expect(sql).toContain("studio_video_projects_business_idx");
  });
});
