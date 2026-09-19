import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertProjectEditorAccess,
  ProjectAccessQueryError,
} from "@/lib/create/project-access";

function makeOwnerLookup(result: { data: unknown; error: { message: string } | null }) {
  const query: Record<string, unknown> = {};
  query.select = vi.fn().mockReturnValue(query);
  query.eq = vi.fn().mockReturnValue(query);
  query.maybeSingle = vi.fn().mockResolvedValue(result);

  return {
    from: vi.fn().mockReturnValue(query),
  } as unknown as SupabaseClient;
}

describe("assertProjectEditorAccess", () => {
  it("returns owner access when the owned project query succeeds", async () => {
    const project = { id: "project-1", owner_id: "owner-1" };
    const client = makeOwnerLookup({ data: project, error: null });

    await expect(
      assertProjectEditorAccess(client, {
        userId: "owner-1",
        projectId: "project-1",
      }),
    ).resolves.toEqual({ project, via: "owner" });
  });

  it("does not disguise a database query failure as missing access", async () => {
    const client = makeOwnerLookup({
      data: null,
      error: { message: "column projects.site_password_enabled does not exist" },
    });

    await expect(
      assertProjectEditorAccess(client, {
        userId: "owner-1",
        projectId: "project-1",
      }),
    ).rejects.toEqual(
      expect.objectContaining<ProjectAccessQueryError>({
        name: "ProjectAccessQueryError",
        message:
          "Project access owner lookup failed: column projects.site_password_enabled does not exist",
      }),
    );
  });
});
