import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();

vi.mock("@/lib/create/auth", () => ({
  requireUser: (...args: unknown[]) => requireUser(...args),
  logCreate: vi.fn(),
}));

vi.mock("@/lib/create/project-access", () => ({
  assertProjectEditorAccess: vi.fn(),
  dbForProjectAccess: vi.fn(),
}));

vi.mock("@/lib/create/site-chrome", () => ({
  loadOrBootstrapSiteChrome: vi.fn(),
  parseSiteChrome: vi.fn(),
}));

vi.mock("@/lib/create/ensure-project-pages", () => ({
  ensureProjectPagesBeforePublish: vi.fn(),
}));

import { DELETE as deleteProject } from "@/app/api/projects/[id]/route";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function projectDeleteClient(ownerMatch: boolean) {
  const deleteEqOwner = vi.fn().mockResolvedValue({ error: null });
  const deleteEqId = vi.fn().mockReturnValue({ eq: deleteEqOwner });
  const deleteProjectRow = vi.fn().mockReturnValue({ eq: deleteEqId });

  return {
    deleteProjectRow,
    deleteEqOwner,
    client: {
      from(table: string) {
        if (table !== "projects") throw new Error(`Unexpected table ${table}`);
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: ownerMatch ? { id: PROJECT_ID } : null,
                  error: null,
                }),
              }),
            }),
          }),
          delete: deleteProjectRow,
        };
      },
    },
  };
}

describe("project deletion boundary", () => {
  beforeEach(() => requireUser.mockReset());

  it("does not let a non-owner reach project deletion", async () => {
    const db = projectDeleteClient(false);
    requireUser.mockResolvedValue({
      user: { id: OWNER_ID, email: "support@kebu.africa" },
      supabase: db.client,
    });

    const res = await deleteProject(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });

    expect(res.status).toBe(404);
    expect(db.deleteProjectRow).not.toHaveBeenCalled();
  });

  it("allows the owner and repeats owner_id on the destructive query", async () => {
    const db = projectDeleteClient(true);
    requireUser.mockResolvedValue({
      user: { id: OWNER_ID, email: "owner@example.com" },
      supabase: db.client,
    });

    const res = await deleteProject(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });

    expect(res.status).toBe(200);
    expect(db.deleteProjectRow).toHaveBeenCalledOnce();
    expect(db.deleteEqOwner).toHaveBeenCalledWith("owner_id", OWNER_ID);
  });
});
