import { beforeEach, describe, expect, it, vi } from "vitest";
import { newExperienceDna } from "@/lib/create/experience-dna";
const state = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), project: { data: null as unknown, error: null as unknown }, record: { data: null as unknown, error: null as unknown }, eq: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: state.auth }));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: () => null }));
import { GET, PUT } from "@/app/api/projects/[id]/experience-dna/route";
const id = "11111111-1111-4111-8111-111111111111", context = { params: Promise.resolve({ id }) };
const dna = () => ({ ...newExperienceDna(), goal: "Sell books", audience: "Readers", visitorAction: "Browse books", pages: [{ slug: "home", title: "Home", purpose: "Introduce books" }] });
const request = (patch: Record<string, unknown> = {}, origin?: string) => new Request(`https://test/api/projects/${id}/experience-dna`, { method: "PUT", headers: { host: "test", ...(origin ? { origin } : {}) }, body: JSON.stringify({ expectedRevision: 0, dna: dna(), ...patch }) });
describe("Experience DNA owner API", () => {
  beforeEach(() => {
    vi.resetAllMocks(); state.project = { data: { id }, error: null }; state.record = { data: null, error: null };
    state.auth.mockResolvedValue({ user: { id }, supabase: { rpc: state.rpc, from: (table: string) => { const query = { select: () => query, eq: (...args: unknown[]) => { state.eq(...args); return query; }, maybeSingle: () => Promise.resolve(table === "projects" ? state.project : state.record) }; return query; } } });
  });
  it("blocks cross-site writes before authentication or storage", async () => { expect((await PUT(request({}, "https://evil.test"), context)).status).toBe(403); expect(state.auth).not.toHaveBeenCalled(); expect(state.rpc).not.toHaveBeenCalled(); });
  it("requires sign-in and owned projects for both methods", async () => {
    state.auth.mockResolvedValueOnce({ error: new Response("Sign in", { status: 401 }) }); expect((await GET(request(), context)).status).toBe(401);
    state.project.data = null; expect((await PUT(request(), context)).status).toBe(404); expect(state.eq).toHaveBeenCalledWith("owner_id", id); expect(state.rpc).not.toHaveBeenCalled();
  });
  it("invalid ids never query a direction row", async () => { expect((await GET(request(), { params: Promise.resolve({ id: "bad" }) })).status).toBe(400); expect(state.eq).not.toHaveBeenCalled(); });
  it("distinguishes no brief, failed reads and incompatible stored content", async () => {
    expect(await (await GET(request(), context)).json()).toMatchObject({ record: { projectId: id, revision: 0, dna: null }, direction: null });
    state.record.error = { message: "private detail" }; const failed = await GET(request(), context); expect(failed.status).toBe(503); expect(await failed.json()).not.toHaveProperty("record");
    state.record = { data: { project_id: id, revision: 1, dna: { version: 2 } }, error: null }; expect((await GET(request(), context)).status).toBe(422);
  });
  it("compiles saved owner observations without claiming retrieval", async () => {
    state.record.data = { project_id: id, revision: 2, dna: dna() }; const body = await (await GET(request(), context)).json(); expect(body.direction.source).toBe("owner-authored"); expect(body.record.revision).toBe(2);
  });
  it("rejects foreign fields, invalid JSON and oversized streams without RPC", async () => {
    expect((await PUT(request({ ownerId: id }), context)).status).toBe(400);
    expect((await PUT(new Request("https://test", { method: "PUT", body: "{bad" }), context)).status).toBe(400);
    expect((await PUT(new Request("https://test", { method: "PUT", body: "x".repeat(65537) }), context)).status).toBe(413); expect(state.rpc).not.toHaveBeenCalled();
  });
  it("accepts only the exact canonical saved direction and revision", async () => {
    state.rpc.mockResolvedValue({ data: { project_id: id, revision: 1, dna: dna() }, error: null }); expect((await PUT(request({}, "https://test"), context)).status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith("save_project_experience_dna", { p_project: id, p_expected: 0, p_dna: dna() });
    for (const patch of [{ revision: 2 }, { dna: { ...dna(), goal: "Unexpected" } }, { project_id: "22222222-2222-4222-8222-222222222222" }]) { state.rpc.mockResolvedValue({ data: { project_id: id, revision: 1, dna: dna(), ...patch }, error: null }); expect((await PUT(request(), context)).status).toBe(503); }
  });
  it("maps conflict, permission and database failures without leaking details", async () => {
    for (const [code, status] of [["40001", 409], ["42501", 404], ["P0002", 404], ["XX000", 503]] as const) { state.rpc.mockResolvedValue({ error: { code, message: "private" } }); const response = await PUT(request(), context); expect(response.status).toBe(status); expect(JSON.stringify(await response.json())).not.toContain("private"); }
  });
});
