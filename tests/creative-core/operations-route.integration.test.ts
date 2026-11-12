import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { PAGE_A, emptyDocument, node, uuidFor } from "./helpers";
import type { NodeId } from "@/lib/creative-core";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), access: vi.fn(), dbFor: vi.fn(), rate: vi.fn(), load: vi.fn(), changes: vi.fn(),
  journal: vi.fn(), rpc: vi.fn(), protocol: vi.fn(),
}));
vi.mock("@/lib/create/auth", () => ({ requireUser: mocks.auth }));
vi.mock("@/lib/create/project-access", () => ({ assertProjectEditorAccess: mocks.access, dbForProjectAccess: mocks.dbFor }));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: mocks.rate }));
vi.mock("@/lib/create/kcd-project-document", () => ({ loadKcdDocument: mocks.load, loadKcdChanges: mocks.changes }));
import { GET, POST } from "@/app/api/projects/[id]/operations/route";

const projectId = uuidFor(1, 0x61);
const id = uuidFor(2, 0x61) as NodeId;
const txId = uuidFor(3, 0x61);
const params = { params: Promise.resolve({ id: projectId }) };
const tx = () => ({ txId, origin: "user", label: "Heading", expect: { [id]: 1 }, ops: [{ op: "setProp", id, path: "heading", value: "Edited" }] });
const request = (body: unknown = tx(), origin = "https://kebu.test") => new Request(`https://kebu.test/api/projects/${projectId}/operations`, { method: "POST", headers: { "Content-Type": "application/json", host: "kebu.test", origin }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("KEBU_KCD_RENDER", "all");
  vi.stubEnv("KEBU_KCD_OPERATIONS", "all");
  vi.stubEnv("VERCEL_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://skqnxyaeimvbyrmdfzvk.supabase.co");
  vi.stubEnv("SUPABASE_URL", "");
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: mocks.journal };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  const db = { from: vi.fn().mockReturnValue(query), rpc: (name: string, args?: unknown) => name === "kcd_operation_protocol" ? mocks.protocol() : mocks.rpc(name, args) };
  mocks.auth.mockResolvedValue({ user: { id: "owner", email: "owner@test.invalid" }, supabase: db });
  mocks.access.mockResolvedValue({ project: { id: projectId, title: "Project", document_schema_version: "kcd-1" }, via: "owner" });
  mocks.dbFor.mockReturnValue(db);
  mocks.rate.mockReturnValue(null);
  mocks.protocol.mockResolvedValue({ data: 3, error: null });
  mocks.journal.mockResolvedValue({ data: null, error: null });
  const doc = emptyDocument([PAGE_A]);
  doc.id = projectId;
  doc.nodes[id] = node({ id, type: "legacy-section:hero", pageId: PAGE_A, orderKey: "V", props: { heading: "Original", align: "center", obsolete: "strip" } });
  mocks.load.mockResolvedValue(doc);
  mocks.rpc.mockResolvedValue({ data: { status: "committed", replayed: false, versions: { [id]: 2 }, removed: [], orderKeys: {} }, error: null });
  mocks.changes.mockResolvedValue({ nodes: [{ ...doc.nodes[id], props: { heading: "Edited" }, version: 2 }], pages: [] });
});
afterEach(() => vi.unstubAllEnvs());

describe("operation persistence route", () => {
  it("keeps writes disabled unless the separate operation flag is explicitly enabled", async () => {
    vi.stubEnv("KEBU_KCD_OPERATIONS", "");
    expect((await POST(request(), params))?.status).toBe(503);
    expect(mocks.protocol).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("fails closed when the database lacks the required operation protocol", async () => {
    mocks.protocol.mockResolvedValue({ data: null, error: { message: "Not installed" } });
    expect((await POST(request(), params))?.status).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("refuses the previous protocol before loading or writing page-capable operations", async () => {
    mocks.protocol.mockResolvedValue({ data: 2, error: null });
    expect((await POST(request(), params))?.status).toBe(503);
    expect(mocks.load).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("blocks motion writes on protocol 3 before loading the draft", async () => {
    const body = { ...tx(), ops: [{ op: "setMotion", id, value: null }] };
    expect((await POST(request(body), params))?.status).toBe(503);
    expect(mocks.load).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("allows existing edits on protocol 4", async () => {
    mocks.protocol.mockResolvedValue({ data: 4, error: null });
    expect((await POST(request(), params))?.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("normalizes legacy props and submits exactly one atomic RPC", async () => {
    const response = await POST(request(), params);
    expect(response?.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    const [name, payload] = mocks.rpc.mock.calls[0];
    expect(name).toBe("apply_node_ops");
    expect(payload.p_project_id).toBe(projectId);
    expect(payload.p_tx.txId).toBe(txId);
    expect(payload.p_tx.ops[0].normalizedProps.heading).toBe("Edited");
    expect(payload.p_tx.ops[0].normalizedProps.obsolete).toBeUndefined();
    expect(mocks.access).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ userId: "owner", projectId }));
    expect((await response!.json()).nodes).toHaveLength(1);
  });
  it("committed replay bypasses stale prevalidation and returns the authority result", async () => {
    mocks.journal.mockResolvedValue({ data: { tx_id: txId }, error: null });
    mocks.rpc.mockResolvedValue({ data: { status: "committed", replayed: true, versions: { [id]: 2 }, removed: [] }, error: null });
    const response = await POST(request(), params);
    expect(response?.status).toBe(200);
    expect(mocks.load).not.toHaveBeenCalled();
    expect((await response!.json()).replayed).toBe(true);
  });
  it("maps database conflicts to 409 with explicit versions", async () => {
    mocks.rpc.mockResolvedValue({ data: { status: "conflicted", code: "KCD_CONFLICT", message: "Changed elsewhere", conflicts: [{ id, expected: 1, actual: 2 }] }, error: null });
    const response = await POST(request(), params);
    expect(response?.status).toBe(409);
    expect(await response!.json()).toMatchObject({ conflicts: [{ id, expected: 1, actual: 2 }] });
    expect(mocks.changes).not.toHaveBeenCalled();
  });
  it("rejects stale locally loaded versions before writing", async () => {
    const doc = await mocks.load(); doc.nodes[id].version = 2;
    const response = await POST(request(), params);
    expect(response?.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("a concurrent committed replay wins over local stale-version rejection", async () => {
    const doc = await mocks.load(); doc.nodes[id].version = 2;
    mocks.journal.mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { tx_id: txId }, error: null });
    expect((await POST(request(), params))?.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("rejects unsafe content before the RPC", async () => {
    const body = tx(); body.ops[0].value = "<script>alert(1)</script>";
    expect((await POST(request(body), params))?.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects forged normalization metadata", async () => {
    const body = tx(); Object.assign(body.ops[0], { normalizedProps: { heading: "Bypass" } });
    expect((await POST(request(body), params))?.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("checks cross-site requests before auth/database work", async () => {
    expect((await POST(request(tx(), "https://evil.test"), params))?.status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("requires sign-in and rejects an inaccessible project", async () => {
    mocks.auth.mockResolvedValueOnce({ error: NextResponse.json({ error: "Sign in" }, { status: 401 }) });
    expect((await POST(request(), params))?.status).toBe(401);
    mocks.access.mockResolvedValueOnce(null);
    expect((await POST(request(), params))?.status).toBe(404);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(["not-opted-in", "production"])("refuses operation writes when %s", async (mode) => {
    if (mode === "production") vi.stubEnv("VERCEL_ENV", "production");
    else mocks.access.mockResolvedValue({ project: { id: projectId, document_schema_version: null }, via: "owner" });
    expect((await POST(request(), params))?.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("an uncertain acknowledgement returns an error suitable for same-txId replay", async () => {
    mocks.changes.mockRejectedValue(new Error("Connection interrupted after commit"));
    const response = await POST(request(), params);
    expect(response?.status).toBe(500);
    expect(await response!.json()).toMatchObject({ error: expect.stringMatching(/same transaction/) });
  });
  it("GET returns the authorized document with no caching", async () => {
    const response = await GET(new Request(`https://kebu.test/api/projects/${projectId}/operations`), params);
    expect(response?.status).toBe(200);
    expect(response?.headers.get("Cache-Control")).toBe("no-store");
    expect((await response!.json()).document.id).toBe(projectId);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("routes a saved AI plan through source-checking authority", async () => {
    mocks.journal.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: { id: txId }, error: null });
    expect((await POST(request({ ...tx(), origin: "ai" }), params))?.status).toBe(200);
    expect(mocks.rpc.mock.calls[0][0]).toBe("apply_experience_plan");
  });
  it("maps stale saved direction to a private conflict without claiming a save", async () => {
    mocks.journal.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: { id: txId }, error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "40001", message: "Private internal diagnostic" } });
    const response = await POST(request({ ...tx(), origin: "ai" }), params);
    expect(response?.status).toBe(409); expect(await response!.json()).toEqual({ error: "Site or saved direction changed. Generate and review a fresh plan." });
    expect(mocks.changes).not.toHaveBeenCalled();
  });
  it("replays committed AI plans through the same saved-plan authority", async () => {
    mocks.journal.mockResolvedValueOnce({ data: { tx_id: txId }, error: null }).mockResolvedValueOnce({ data: { id: txId }, error: null });
    mocks.rpc.mockResolvedValue({ data: { status: "committed", replayed: true, versions: { [id]: 2 }, removed: [] }, error: null });
    expect((await POST(request({ ...tx(), origin: "ai" }), params))?.status).toBe(200);
    expect(mocks.load).not.toHaveBeenCalled(); expect(mocks.rpc.mock.calls[0][0]).toBe("apply_experience_plan");
  });
});
