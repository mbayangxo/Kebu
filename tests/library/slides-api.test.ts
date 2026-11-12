import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: deps.auth }));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: () => null }));
vi.mock("@/lib/admin/assert-admin-cookie", () => ({ assertSameOriginMutation: () => null }));

import { GET, PATCH } from "@/app/api/library/slides/[id]/route";

const owner = "11111111-1111-4111-8111-111111111111";
const deckId = "33333333-3333-4333-8333-333333333333";

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
  return new Request(`https://kebu.test/api/library/slides/${deckId}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(typeof body === "object" && body !== null ? { expectedUpdatedAt: null, ...body } : body), headers: { "Content-Type": "application/json" } } : {}),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const blankSlide = (id: string) => ({ id, name: "Slide", backgroundColor: "#FFFFFF", layers: [], transitionKind: "fade", transitionDurationMs: 400 });

beforeEach(() => vi.clearAllMocks());

describe("GET /api/library/slides/[id]", () => {
  it("rejects a non-UUID id before touching the database", async () => {
    setupAuth(() => { throw new Error("must not query the database for a malformed id"); });
    const res = await GET(req("GET"), params("not-a-uuid"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the node doesn't exist or RLS hides it — indistinguishable by design", async () => {
    setupAuth(() => chain({ data: null, error: null }));
    const res = await GET(req("GET"), params(deckId));
    expect(res.status).toBe(404);
  });

  it("defaults to a single blank slide when the node exists but has no body row yet", async () => {
    setupAuth((table: string) => {
      if (table === "library_nodes") return chain({ data: { id: deckId, title: "New deck", kind: "slide" }, error: null });
      if (table === "slide_bodies") return chain({ data: null, error: null });
      throw new Error(`Unexpected table ${table}`);
    });
    const res = await GET(req("GET"), params(deckId));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toMatchObject({ id: deckId, title: "New deck", width: 1920, height: 1080 });
    expect(data.slides).toHaveLength(1);
  });

  it("returns the real stored slides, not a reconstructed default, when a body row exists", async () => {
    const stored = [blankSlide("s1"), blankSlide("s2")];
    setupAuth((table: string) => {
      if (table === "library_nodes") return chain({ data: { id: deckId, title: "Pitch", kind: "slide" }, error: null });
      if (table === "slide_bodies") return chain({ data: { slides: stored, width: 1280, height: 720, updated_at: "2026-01-01T00:00:00Z" }, error: null });
      throw new Error(`Unexpected table ${table}`);
    });
    const res = await GET(req("GET"), params(deckId));
    const data = await res.json();
    expect(data.slides).toHaveLength(2);
    expect(data.width).toBe(1280);
    expect(data.height).toBe(720);
  });
});

describe("PATCH /api/library/slides/[id]", () => {
  it("rejects invalid JSON", async () => {
    setupAuth(() => { throw new Error("must not query the database"); });
    const badReq = new Request(`https://kebu.test/api/library/slides/${deckId}`, { method: "PATCH", body: "{not json", headers: { "Content-Type": "application/json" } });
    const res = await PATCH(badReq, params(deckId));
    expect(res.status).toBe(400);
  });

  it("rejects an empty deck (zero slides) before any database write", async () => {
    setupAuth(() => { throw new Error("must not query the database for an invalid payload"); });
    const res = await PATCH(req("PATCH", { slides: [] }), params(deckId));
    expect(res.status).toBe(400);
  });

  it("rejects a malformed layer (e.g. opacity out of range) before any database write", async () => {
    setupAuth(() => { throw new Error("must not query the database for an invalid payload"); });
    const bad = { ...blankSlide("s1"), layers: [{ id: "l1", type: "rect", x: 0, y: 0, width: 10, height: 10, rotation: 0, opacity: 5 }] };
    const res = await PATCH(req("PATCH", { slides: [bad] }), params(deckId));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the deck node doesn't exist or isn't visible to the caller", async () => {
    setupAuth((table: string) => {
      if (table === "library_nodes") return chain({ data: null, error: null });
      throw new Error(`Unexpected table ${table}`);
    });
    const res = await PATCH(req("PATCH", { slides: [blankSlide("s1")] }), params(deckId));
    expect(res.status).toBe(404);
  });

  it("surfaces an RLS-denied write (e.g. a viewer-only share) as a failed save, not a silent success", async () => {
    setupAuth((table: string) => {
      if (table === "library_nodes") return chain({ data: { id: deckId }, error: null });
      if (table === "slide_bodies") return chain({ data: null, error: { message: "permission denied" } });
      throw new Error(`Unexpected table ${table}`);
    });
    const res = await PATCH(req("PATCH", { slides: [blankSlide("s1")] }), params(deckId));
    expect(res.status).toBe(403);
  });

  it("on success, saves and returns the new updatedAt", async () => {
    setupAuth((table: string) => {
      if (table === "library_nodes") return chain({ data: { id: deckId }, error: null });
      if (table === "slide_bodies") return chain({ data: { updated_at: "2026-02-02T00:00:00Z" }, error: null });
      throw new Error(`Unexpected table ${table}`);
    });
    const res = await PATCH(req("PATCH", { slides: [blankSlide("s1")], width: 1920, height: 1080 }), params(deckId));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true, updatedAt: "2026-02-02T00:00:00Z" });
  });
});

describe("revision protection", () => {
  const payload = { slides: [{ id: "slide-1", background: "#ffffff", layers: [], transition: "none" }] };
  it("rejects a duplicate first save without overwriting", async () => {
    const body = chain({ data: null, error: { code: "23505" } });
    setupAuth(table => table === "library_nodes" ? chain({ data: { id: deckId }, error: null }) : body);
    const res = await PATCH(req("PATCH", payload), params(deckId));
    expect(res.status).toBe(409);
    expect(body.insert).toHaveBeenCalled();
    expect(body.upsert).not.toHaveBeenCalled();
  });
  it("uses an atomic revision condition and rejects a stale save", async () => {
    const body = chain({ data: null, error: null });
    setupAuth(table => table === "library_nodes" ? chain({ data: { id: deckId }, error: null }) : body);
    const expectedUpdatedAt = "2026-11-12T00:00:00.123456+00:00";
    const res = await PATCH(req("PATCH", { ...payload, expectedUpdatedAt }), params(deckId));
    expect(res.status).toBe(409);
    expect(body.eq).toHaveBeenCalledWith("updated_at", expectedUpdatedAt);
    expect(body.upsert).not.toHaveBeenCalled();
  });
});
