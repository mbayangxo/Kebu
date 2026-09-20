import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("ecosystem workspace security migrations", () => {
  it("keeps personal and business work items on separate authorization branches", () => {
    const sql = readFileSync(
      join(root, "supabase/migrations/20260920083000_workspace_scope_hardening.sql"),
      "utf8",
    );
    expect(sql).toContain("business_id is null and owner_id = auth.uid()");
    expect(sql).toContain("business_id is not null and exists");
    expect(sql).toContain("m.status = 'active'");
  });

  it("does not let a former business channel creator bypass membership", () => {
    const sql = readFileSync(
      join(root, "supabase/migrations/20260920083000_workspace_scope_hardening.sql"),
      "utf8",
    );
    expect(sql).toContain("c.business_id is null and c.created_by = auth.uid()");
    expect(sql).toContain("c.business_id is not null and exists");
    expect(sql).toContain("author_id = auth.uid()");
  });

  it("enables RLS for chat and work tables", () => {
    const workSql = readFileSync(
      join(root, "supabase/migrations/20260920081000_workspace_items.sql"),
      "utf8",
    );
    const chatSql = readFileSync(
      join(root, "supabase/migrations/20260920082000_space_chat.sql"),
      "utf8",
    );
    expect(workSql).toContain("alter table public.workspace_items enable row level security");
    expect(chatSql).toContain("alter table public.space_channels enable row level security");
    expect(chatSql).toContain("alter table public.space_messages enable row level security");
  });
});
