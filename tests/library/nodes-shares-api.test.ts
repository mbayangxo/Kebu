import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: deps.auth }));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: () => null }));
vi.mock("@/lib/admin/assert-admin-cookie", () => ({ assertSameOriginMutation: () => null }));

import { GET as getNodes, POST as createNode, PATCH as patchNode, DELETE as deleteNode } from "@/app/api/library/nodes/route";
import { GET as getShares, POST as createShare, DELETE as deleteShare } from "@/app/api/library/shares/route";

const owner = "11111111-1111-4111-8111-111111111111";
const recipient = "22222222-2222-4222-8222-222222222222";
const nodeId = "33333333-3333-4333-8333-333333333333";

function chain(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "delete", "upsert", "eq", "or", "not", "is", "order", "limit", "maybeSingle", "single"];
  for (const m of methods) q[m] = vi.fn(() => q);
  (q.single as ReturnType<typeof vi.fn>).mockImplementation(async () => result);
  (q.maybeSingle as ReturnType<typeof vi.fn>).mockImplementation(async () => result);
  // A bare await on the chain (GET's list query has no terminal .single()/.maybeSingle()).
  (q as { then: (resolve: (v: unknown) => void) => void }).then = (resolve) => resolve(result);
  return q as unknown as { eq: ReturnType<typeof vi.fn>; order: ReturnType<typeof vi.fn> };
}

function setupAuth(fromImpl: (table: string) => unknown) {
  deps.auth.mockResolvedValue({ user: { id: owner }, supabase: { from: (table: string) => fromImpl(table) } });
}

beforeEach(() => vi.clearAllMocks());

describe("Library nodes API", () => {
  it("creates a node and returns 201 on a confirmed row", async () => {
    setupAuth(() => chain({ data: { id: nodeId, owner_id: owner, title: "Plan" }, error: null }));
    const res = await createNode(new Request("https://kebu.test/api/library/nodes", {
      method: "POST", body: JSON.stringify({ kind: "document", title: "Plan" }), headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(201);
    expect((await res.json()).node).toMatchObject({ id: nodeId });
  });

  it("rejects an invalid create payload before touching the database", async () => {
    setupAuth(() => chain({ data: null, error: null }));
    const res = await createNode(new Request("https://kebu.test/api/library/nodes", {
      method: "POST", body: JSON.stringify({ kind: "document", title: "" }), headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(400);
  });

  it("surfaces an RLS-denied update as a failed mutation, not a silent success", async () => {
    setupAuth(() => chain({ data: null, error: { message: "permission denied" } }));
    const res = await patchNode(new Request("https://kebu.test/api/library/nodes", {
      method: "PATCH", body: JSON.stringify({ id: nodeId, title: "Hijacked" }), headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(403);
  });

  it("surfaces a zero-row delete (no matching/visible row) as a failure", async () => {
    setupAuth(() => chain({ data: null, error: { message: "no rows" } }));
    const res = await deleteNode(new Request(`https://kebu.test/api/library/nodes?id=${nodeId}`, { method: "DELETE" }));
    expect(res.status).toBe(403);
  });

  it("the shared=1 filter excludes the caller's own nodes from the results", async () => {
    const rows = [{ id: "a", owner_id: owner }, { id: "b", owner_id: recipient }];
    setupAuth(() => chain({ data: rows, error: null }));
    const res = await getNodes(new Request("https://kebu.test/api/library/nodes?shared=1"));
    expect((await res.json()).nodes).toEqual([{ id: "b", owner_id: recipient }]);
  });
});

describe("Library shares API", () => {
  function setupShareFlow(opts: { hasConnection: boolean; upsertResult: { data: unknown; error: unknown } }) {
    setupAuth((table: string) => {
      if (table === "personal_connections") return chain({ data: opts.hasConnection ? { id: "conn-1" } : null, error: null });
      if (table === "library_shares") return chain(opts.upsertResult);
      throw new Error(`Unexpected table ${table}`);
    });
  }

  it("requires an accepted connection before a share can be created — the app layer's own check, ahead of RLS", async () => {
    setupShareFlow({ hasConnection: false, upsertResult: { data: null, error: null } });
    const res = await createShare(new Request("https://kebu.test/api/library/shares", {
      method: "POST", body: JSON.stringify({ nodeId, userId: recipient, permission: "viewer" }), headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(403);
  });

  it("creates a share when connected and RLS (mocked here) accepts it", async () => {
    setupShareFlow({ hasConnection: true, upsertResult: { data: { node_id: nodeId, shared_with_user_id: recipient, permission: "viewer" }, error: null } });
    const res = await createShare(new Request("https://kebu.test/api/library/shares", {
      method: "POST", body: JSON.stringify({ nodeId, userId: recipient, permission: "viewer" }), headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(200);
  });

  it("rejects sharing with yourself before any database call", async () => {
    setupAuth(() => { throw new Error("must not query the database for a self-share"); });
    const res = await createShare(new Request("https://kebu.test/api/library/shares", {
      method: "POST", body: JSON.stringify({ nodeId, userId: owner, permission: "editor" }), headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(400);
  });

  it("surfaces an RLS-denied share creation (e.g. caller doesn't own the node) as a failure, not a silent success", async () => {
    setupShareFlow({ hasConnection: true, upsertResult: { data: null, error: { message: "permission denied" } } });
    const res = await createShare(new Request("https://kebu.test/api/library/shares", {
      method: "POST", body: JSON.stringify({ nodeId, userId: recipient, permission: "viewer" }), headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(403);
  });

  it("GET lists shares for a node, scoped by whatever RLS (mocked here) returns", async () => {
    setupAuth(() => chain({ data: [{ node_id: nodeId, shared_with_user_id: recipient, permission: "viewer" }], error: null }));
    const res = await getShares(new Request(`https://kebu.test/api/library/shares?nodeId=${nodeId}`));
    expect((await res.json()).shares).toHaveLength(1);
  });

  it("does not claim success when revoking a share that isn't visible/owned (already covered for Rooms' call site; verified here at the shares route directly)", async () => {
    setupAuth(() => chain({ data: null, error: null }));
    const res = await deleteShare(new Request(`https://kebu.test/api/library/shares?nodeId=${nodeId}&userId=${recipient}`, { method: "DELETE" }));
    expect(res.status).toBe(403);
  });
});
