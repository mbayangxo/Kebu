import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── mock dependencies ────────────────────────────────────────────────────────

const requireUser = vi.fn();

vi.mock("@/lib/create/auth", () => ({
  requireUser: (...args: unknown[]) => requireUser(...args),
}));

import { GET, POST, PATCH, DELETE } from "@/app/api/work/items/route";

// ── fixtures ─────────────────────────────────────────────────────────────────

const ITEM_ROW = {
  id: "00000002-0001-4001-a001-000000000001",
  owner_id: "00000002-0001-4001-a001-000000000002",
  business_id: null,
  kind: "task",
  title: "Finish pitch deck",
  body: "",
  status: "open",
  due_at: null,
  start_at: null,
  end_at: null,
  created_at: "2026-09-20T00:00:00Z",
  updated_at: "2026-09-20T00:00:00Z",
};

function makeListChain(rows: unknown[]) {
  // The route builds: .select(...).order(...).limit(200)
  // then SYNCHRONOUSLY chains: .eq("kind", ...) or .eq("businessId", ...) or .is("business_id", null)
  // and THEN awaits the whole thing.
  // So limit() must return a plain thenable object with .eq/.is on it.
  const result = { data: rows, error: null };

  // A thenable so the route can `await` it, plus .eq/.is for optional further filtering.
  function makeThenable(): Record<string, unknown> {
    const obj: Record<string, unknown> = {
      then: (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
      catch: (reject: (r: unknown) => unknown) => Promise.resolve(result).catch(reject),
    };
    obj.eq = vi.fn().mockImplementation(() => makeThenable());
    obj.is = vi.fn().mockImplementation(() => makeThenable());
    obj.limit = vi.fn().mockImplementation(() => makeThenable());
    return obj;
  }

  const limitFn = vi.fn().mockReturnValue(makeThenable());
  const orderFn = vi.fn().mockReturnValue({ limit: limitFn });
  const selectFn = vi.fn().mockReturnValue({ order: orderFn });
  return { select: selectFn };
}

function makeInsertChain(result: { data: unknown; error: null | { message: string } }) {
  const singleFn = vi.fn().mockResolvedValue(result);
  const selectFn = vi.fn().mockReturnValue({ single: singleFn });
  return { insert: vi.fn().mockReturnValue({ select: selectFn }) };
}

function makeUpdateChain(result: { data: unknown; error: null | { message: string } }) {
  const singleFn = vi.fn().mockResolvedValue(result);
  const selectFn = vi.fn().mockReturnValue({ single: singleFn });
  // route: .update(patch).eq("id", parsed.data.id).select("*").single()
  const eqFn = vi.fn().mockReturnValue({ select: selectFn });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  return { update: updateFn };
}

// ── unauthenticated ──────────────────────────────────────────────────────────

describe("work items API — unauthenticated", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET returns 401", async () => {
    requireUser.mockResolvedValue({ error: Response.json({ error: "Sign in required." }, { status: 401 }) });
    const res = await GET(new NextRequest("http://localhost/api/work/items"));
    expect(res.status).toBe(401);
  });

  it("POST returns 401", async () => {
    requireUser.mockResolvedValue({ error: Response.json({ error: "Sign in required." }, { status: 401 }) });
    const res = await POST(new Request("http://localhost/api/work/items", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 401", async () => {
    requireUser.mockResolvedValue({ error: Response.json({ error: "Sign in required." }, { status: 401 }) });
    const res = await PATCH(new Request("http://localhost/api/work/items", { method: "PATCH", body: "{}" }));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401", async () => {
    requireUser.mockResolvedValue({ error: Response.json({ error: "Sign in required." }, { status: 401 }) });
    const res = await DELETE(new Request("http://localhost/api/work/items?id=item-0001-0001-0001-000000000001"));
    expect(res.status).toBe(401);
  });
});

// ── GET happy path ────────────────────────────────────────────────────────────

describe("GET /api/work/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns items for the authenticated user", async () => {
    const supabase = { from: vi.fn().mockReturnValue(makeListChain([ITEM_ROW])) };
    requireUser.mockResolvedValue({ user: { id: ITEM_ROW.owner_id }, supabase });

    const res = await GET(new NextRequest("http://localhost/api/work/items"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe("Finish pitch deck");
  });

  it("filters by kind when provided", async () => {
    const supabase = { from: vi.fn().mockReturnValue(makeListChain([ITEM_ROW])) };
    requireUser.mockResolvedValue({ user: { id: ITEM_ROW.owner_id }, supabase });

    const res = await GET(new NextRequest("http://localhost/api/work/items?kind=task"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
  });

  it("returns empty array when no items exist", async () => {
    const supabase = { from: vi.fn().mockReturnValue(makeListChain([])) };
    requireUser.mockResolvedValue({ user: { id: "user-1" }, supabase });

    const res = await GET(new NextRequest("http://localhost/api/work/items"));
    expect(res.status).toBe(200);
    expect((await res.json()).items).toHaveLength(0);
  });
});

// ── POST happy path ───────────────────────────────────────────────────────────

describe("POST /api/work/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an item and returns 201", async () => {
    const supabase = { from: vi.fn().mockReturnValue(makeInsertChain({ data: ITEM_ROW, error: null })) };
    requireUser.mockResolvedValue({ user: { id: ITEM_ROW.owner_id }, supabase });

    const body = JSON.stringify({ kind: "task", title: "Finish pitch deck" });
    const res = await POST(new Request("http://localhost/api/work/items", { method: "POST", body }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.item.title).toBe("Finish pitch deck");
  });

  it("returns 400 when title is blank", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    const body = JSON.stringify({ kind: "task", title: "" });
    const res = await POST(new Request("http://localhost/api/work/items", { method: "POST", body }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when kind is invalid", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    const body = JSON.stringify({ kind: "unknown-kind", title: "Test" });
    const res = await POST(new Request("http://localhost/api/work/items", { method: "POST", body }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    const res = await POST(new Request("http://localhost/api/work/items", { method: "POST", body: "not-json" }));
    expect(res.status).toBe(400);
  });
});

// ── PATCH happy path ──────────────────────────────────────────────────────────

describe("PATCH /api/work/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates an item and returns 200", async () => {
    const updated = { ...ITEM_ROW, status: "done" };
    const supabase = { from: vi.fn().mockReturnValue(makeUpdateChain({ data: updated, error: null })) };
    requireUser.mockResolvedValue({ user: { id: ITEM_ROW.owner_id }, supabase });

    const body = JSON.stringify({ id: ITEM_ROW.id, status: "done" });
    const res = await PATCH(new Request("http://localhost/api/work/items", { method: "PATCH", body }));
    expect(res.status).toBe(200);
    expect((await res.json()).item.status).toBe("done");
  });

  it("returns 400 when id is missing", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    const body = JSON.stringify({ status: "done" });
    const res = await PATCH(new Request("http://localhost/api/work/items", { method: "PATCH", body }));
    expect(res.status).toBe(400);
  });
});

// ── DELETE happy path ─────────────────────────────────────────────────────────

describe("DELETE /api/work/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes an item and returns ok", async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn().mockReturnValue({ delete: vi.fn().mockReturnValue({ eq: eqFn }) }) };
    requireUser.mockResolvedValue({ user: { id: ITEM_ROW.owner_id }, supabase });

    // ITEM_ROW.id is a proper hex UUID so it passes the route's /^[0-9a-f-]{36}$/i guard
    const res = await DELETE(new Request(`http://localhost/api/work/items?id=${ITEM_ROW.id}`));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("returns 400 when id is missing", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    const res = await DELETE(new Request("http://localhost/api/work/items"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when id is not a valid UUID", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    const res = await DELETE(new Request("http://localhost/api/work/items?id=not-a-uuid"));
    expect(res.status).toBe(400);
  });
});
