import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertProjectEditorAccess,
  ProjectAccessQueryError,
} from "@/lib/create/project-access";

const createServiceClient = vi.fn();
const resolveSupportAuthorization = vi.fn();

vi.mock("@/lib/opportunity/admin", () => ({
  createServiceClient: (...args: unknown[]) => createServiceClient(...args),
}));

vi.mock("@/lib/create/support-access", () => ({
  logSupportAccess: vi.fn(),
  resolveSupportAuthorization: (...args: unknown[]) => resolveSupportAuthorization(...args),
}));

vi.mock("@/lib/create/support-session", () => ({
  currentSupportSession: vi.fn(),
}));

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
  it("fails closed when a foreign project cannot be checked server-side", async () => {
    createServiceClient.mockReturnValueOnce(null);
    const client = makeOwnerLookup({ data: null, error: null });

    await expect(
      assertProjectEditorAccess(client, {
        userId: "foreign-user",
        projectId: "project-1",
      }),
    ).resolves.toBeNull();
  });

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

  it.each([
    ["no membership", null],
    ["an unauthorized role", { role: "viewer" }],
  ])("denies a foreign tenant with %s", async (_description, membership) => {
    const projectQuery: Record<string, unknown> = {};
    projectQuery.select = vi.fn().mockReturnValue(projectQuery);
    projectQuery.eq = vi.fn().mockReturnValue(projectQuery);
    projectQuery.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "project-1", owner_id: "owner-1", business_id: "business-1" },
      error: null,
    });

    const membershipQuery: Record<string, unknown> = {};
    membershipQuery.select = vi.fn().mockReturnValue(membershipQuery);
    membershipQuery.eq = vi.fn().mockReturnValue(membershipQuery);
    membershipQuery.maybeSingle = vi.fn().mockResolvedValue({ data: membership, error: null });

    const service = {
      from: vi.fn((table: string) =>
        table === "projects" ? projectQuery : membershipQuery,
      ),
    } as unknown as SupabaseClient;
    createServiceClient.mockReturnValueOnce(service);
    resolveSupportAuthorization.mockResolvedValueOnce(null);
    const client = makeOwnerLookup({ data: null, error: null });

    await expect(
      assertProjectEditorAccess(client, {
        userId: "foreign-user",
        projectId: "project-1",
      }),
    ).resolves.toBeNull();
    expect(resolveSupportAuthorization).toHaveBeenCalled();
  });
});
