import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: deps.auth }));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: () => null }));
vi.mock("@/lib/admin/assert-admin-cookie", () => ({ assertSameOriginMutation: () => null }));

import { GET, PATCH } from "@/app/api/library/sheets/[id]/route";

const owner = "11111111-1111-4111-8111-111111111111";
const sheetId = "33333333-3333-4333-8333-333333333333";

function chain(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "delete", "upsert", "eq", "order", "limit", "maybeSingle", "single"];
  for (const m of methods) q[m] = vi.fn(() => q);
  (q.single as ReturnType<typeof vi.fn>).mockImplementation(async () => result);
  (q.maybeSingle as ReturnType<typeof vi.fn>).mockImplementation(async () => result);
  return q;
}

function setupAuth(fromImpl: (table: string) => unknown) {
  deps.auth.mockResolvedValue({ user: { id: owner }, supabase: { from: (table: string) => fromImpl(table) } });
}

function req(method: string, body?: unknown) {
  return new Request(`https://kebu.test/api/library/sheets/${sheetId}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(typeof body === "object" && body !== null ? { expectedUpdatedAt: null, ...body } : body), headers: { "Content-Type": "application/json" } } : {}),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => vi.clearAllMocks());

describe("GET /api/library/sheets/[id]", () => {
  it("rejects a non-UUID id before touching the database", async () => {
    setupAuth(() => { throw new Error("must not query the database for a malformed id"); });
    const res = await GET(req("GET"), params("not-a-uuid"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the node doesn't exist or RLS hides it — indistinguishable by design", async () => {
    setupAuth(() => chain({ data: null, error: null }));
    const res = await GET(req("GET"), params(sheetId));
    expect(res.status).toBe(404);
  });

  it("defaults to a blank 100x26 sheet when the node exists but has no body row yet", async () => {
    setupAuth((table: string) => {
      if (table === "library_nodes") return chain({ data: { id: sheetId, title: "New sheet", kind: "sheet" }, error: null });
      if (table === "sheet_bodies") return chain({ data: null, error: null });
      throw new Error(`Unexpected table ${table}`);
    });
    const res = await GET(req("GET"), params(sheetId));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toMatchObject({ id: sheetId, title: "New sheet", rowCount: 100, columnCount: 26, cells: {} });
  });

  it("computes real formulas from the stored raw cells", async () => {
    setupAuth((table: string) => {
      if (table === "library_nodes") return chain({ data: { id: sheetId, title: "Budget", kind: "sheet" }, error: null });
      if (table === "sheet_bodies") return chain({ data: { cells: { A1: { raw: "2" }, A2: { raw: "=A1*3" } }, row_count: 10, column_count: 5, updated_at: "2026-01-01T00:00:00Z" }, error: null });
      throw new Error(`Unexpected table ${table}`);
    });
    const res = await GET(req("GET"), params(sheetId));
    const data = await res.json();
    expect(data.cells.A2).toMatchObject({ raw: "=A1*3", display: "6", isFormula: true });
  });
});

describe("PATCH /api/library/sheets/[id]", () => {
  it("rejects invalid JSON", async () => {
    setupAuth(() => { throw new Error("must not query the database"); });
    const badReq = new Request(`https://kebu.test/api/library/sheets/${sheetId}`, { method: "PATCH", body: "{not json", headers: { "Content-Type": "application/json" } });
    const res = await PATCH(badReq, params(sheetId));
    expect(res.status).toBe(400);
  });

  it("rejects a malformed cell address before any database write", async () => {
    setupAuth(() => { throw new Error("must not query the database for an invalid payload"); });
    const res = await PATCH(req("PATCH", { cells: { "1A": { raw: "x" } } }), params(sheetId));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the sheet node doesn't exist or isn't visible to the caller", async () => {
    setupAuth((table: string) => {
      if (table === "library_nodes") return chain({ data: null, error: null });
      throw new Error(`Unexpected table ${table}`);
    });
    const res = await PATCH(req("PATCH", { cells: { A1: { raw: "1" } } }), params(sheetId));
    expect(res.status).toBe(404);
  });

  it("surfaces an RLS-denied write (e.g. a viewer-only share) as a failed save, not a silent success", async () => {
    setupAuth((table: string) => {
      if (table === "library_nodes") return chain({ data: { id: sheetId }, error: null });
      if (table === "sheet_bodies") return chain({ data: null, error: { message: "permission denied" } });
      throw new Error(`Unexpected table ${table}`);
    });
    const res = await PATCH(req("PATCH", { cells: { A1: { raw: "1" } } }), params(sheetId));
    expect(res.status).toBe(403);
  });

  it("on success, returns real recomputed cells for what was just saved", async () => {
    setupAuth((table: string) => {
      if (table === "library_nodes") return chain({ data: { id: sheetId }, error: null });
      if (table === "sheet_bodies") return chain({ data: { updated_at: "2026-02-02T00:00:00Z" }, error: null });
      throw new Error(`Unexpected table ${table}`);
    });
    const res = await PATCH(req("PATCH", { cells: { A1: { raw: "3" }, A2: { raw: "=A1+4" } } }), params(sheetId));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.cells.A2).toMatchObject({ display: "7", isFormula: true });
  });
});

describe("revision protection", () => {
  const payload = { cells: {} };
  it("rejects a duplicate first save without overwriting", async () => {
    const body = chain({ data: null, error: { code: "23505" } });
    setupAuth(table => table === "library_nodes" ? chain({ data: { id: sheetId }, error: null }) : body);
    const res = await PATCH(req("PATCH", payload), params(sheetId));
    expect(res.status).toBe(409);
    expect(body.insert).toHaveBeenCalled();
    expect(body.upsert).not.toHaveBeenCalled();
  });
  it("uses an atomic revision condition and rejects a stale save", async () => {
    const body = chain({ data: null, error: null });
    setupAuth(table => table === "library_nodes" ? chain({ data: { id: sheetId }, error: null }) : body);
    const expectedUpdatedAt = "2026-11-12T00:00:00.123456+00:00";
    const res = await PATCH(req("PATCH", { ...payload, expectedUpdatedAt }), params(sheetId));
    expect(res.status).toBe(409);
    expect(body.eq).toHaveBeenCalledWith("updated_at", expectedUpdatedAt);
    expect(body.upsert).not.toHaveBeenCalled();
  });
});
