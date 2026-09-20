import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260920091000_caller_bound_tenant_authorization.sql",
  "utf8",
);

describe("caller-bound tenant authorization migration", () => {
  it("removes the arbitrary-user project role RPC", () => {
    expect(migration).toContain("drop function if exists public.project_access_role(uuid, uuid)");
    expect(migration).toContain("public.project_access_role(p_project_id uuid)");
    expect(migration).not.toContain("p_user_id");
  });

  it("binds recursive authorization helpers to auth.uid", () => {
    expect(migration).toContain("private.project_access_role(p_project_id uuid)");
    expect(migration).toContain("p.owner_id = auth.uid()");
    expect(migration).toContain("pm.user_id = auth.uid()");
    expect(migration).toContain("private.can_access_room(p_room_id uuid)");
    expect(migration).toContain("rm.user_id = auth.uid()");
  });

  it("keeps security-definer helpers outside the exposed public schema", () => {
    const publicFunctionBlocks = migration.match(
      /create or replace function public\.[\s\S]*?\$\$;/gi,
    ) ?? [];
    expect(publicFunctionBlocks).toHaveLength(3);
    for (const block of publicFunctionBlocks) {
      expect(block).not.toContain("security definer");
    }
    expect(migration).toContain("security invoker");
    expect(migration).toContain("revoke all on schema private from public, anon");
  });
});
