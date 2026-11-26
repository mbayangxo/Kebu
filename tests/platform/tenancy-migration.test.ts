import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Track B tenancy migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260920033000_project_tenancy_authorization.sql"),
    "utf8",
  );

  it("creates explicit project membership with RLS", () => {
    expect(sql).toContain("create table if not exists public.project_members");
    expect(sql).toContain("alter table public.project_members enable row level security");
    expect(sql).toContain("project_access_role");
    expect(sql).toContain("can_access_project");
  });

  it("separates read, edit, administration, and ownership", () => {
    expect(sql).toContain("public.can_access_project(id, 'viewer')");
    expect(sql).toContain("public.can_access_project(id, 'editor')");
    expect(sql).toContain("public.can_access_project(project_id, 'admin')");
    expect(sql).toContain("user_id <> auth.uid()");
  });

  it("extends the same boundary through Builder pages and sections", () => {
    expect(sql).toContain("Members select accessible project pages");
    expect(sql).toContain("Members update accessible project sections");
  });
});
