import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: deps.auth }));

import { GET } from "@/app/api/work/items/[id]/collab/route";

const docId = "11111111-1111-4111-8111-111111111111";

function chain(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) q[m] = vi.fn(() => q);
  q.maybeSingle = vi.fn(() => Promise.resolve(result));
  return q;
}

function setupAuth(result: { data: unknown; error: unknown }) {
  deps.auth.mockResolvedValue({ user: { id: "user-1", email: "alice@example.test" }, supabase: { from: () => chain(result) } });
}

function req() {
  return new Request(`https://kebu.test/api/work/items/${docId}/collab`);
}
const params = (id: string = docId) => ({ params: Promise.resolve({ id }) });

beforeEach(() => vi.clearAllMocks());

describe("GET /api/work/items/[id]/collab", () => {
  it("rejects a non-UUID id before touching the database", async () => {
    setupAuth({ data: null, error: null });
    const res = await GET(req(), params("not-a-uuid"));
    expect(res.status).toBe(400);
  });

  it("returns 401 when the caller isn't authenticated", async () => {
    deps.auth.mockResolvedValue({ error: new Response(JSON.stringify({ error: "Sign in required." }), { status: 401 }) });
    const res = await GET(req(), params());
    expect(res.status).toBe(401);
  });

  it("authorizes a caller with real RLS-visible access to the document and hands back their id/label", async () => {
    setupAuth({ data: { id: docId, kind: "doc" }, error: null });
    const res = await GET(req(), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, userId: "user-1", label: "alice" });
  });

  it("falls back to a generic label when the user has no email", async () => {
    deps.auth.mockResolvedValue({ user: { id: "user-1" }, supabase: { from: () => chain({ data: { id: docId, kind: "doc" }, error: null }) } });
    const res = await GET(req(), params());
    expect((await res.json()).label).toBe("Collaborator");
  });

  it("denies a caller RLS hides the row from (no row returned, not a thrown error)", async () => {
    setupAuth({ data: null, error: null });
    const res = await GET(req(), params());
    expect(res.status).toBe(404);
  });

  it("denies access to a non-document item of the same id (kind must be 'doc')", async () => {
    setupAuth({ data: { id: docId, kind: "sheet" }, error: null });
    const res = await GET(req(), params());
    expect(res.status).toBe(404);
  });

  it("returns 503 on a real database error rather than treating it as access-denied", async () => {
    setupAuth({ data: null, error: { message: "connection reset" } });
    const res = await GET(req(), params());
    expect(res.status).toBe(503);
  });
});
