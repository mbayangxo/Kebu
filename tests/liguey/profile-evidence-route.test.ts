import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
import { GET, POST, DELETE } from "@/app/api/liguey/profile/evidence/route";

const userId = "11111111-1111-4111-8111-111111111111";
const nodeId = "22222222-2222-4222-8222-222222222222";
const evidenceRow = { id: "33333333-3333-4333-8333-333333333333", library_node_id: nodeId, label: "Sample", created_at: "2026-10-16T00:00:00.000Z" };

const request = (method: string, body?: unknown, query = "") =>
  new Request("https://kebu.test/api/liguey/profile/evidence" + query, { method, headers: { "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

function setup(opts: { listResult?: { data: unknown; error: unknown }; insertResult?: { data: unknown; error: unknown }; deleteResult?: { data: unknown; error: unknown } } = {}) {
  const evidenceList = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue(opts.listResult ?? { data: [evidenceRow], error: null }) };
  const nodesList = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [{ id: nodeId, title: "Sample work", kind: "document" }], error: null }) };
  const insert = { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue(opts.insertResult ?? { data: evidenceRow, error: null }) };
  const del = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue(opts.deleteResult ?? { data: { id: evidenceRow.id }, error: null }) };
  const from = vi.fn((table: string) => {
    if (table === "worker_profile_evidence") {
      return { select: vi.fn(() => evidenceList), insert: vi.fn().mockReturnValue(insert), delete: vi.fn().mockReturnValue(del) };
    }
    if (table === "library_nodes") return nodesList;
    throw new Error("unexpected table " + table);
  });
  auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
  return { from };
}

beforeEach(() => vi.clearAllMocks());

describe("Liguey portfolio evidence route", () => {
  it("lists evidence links with the linked Library item's title", async () => {
    setup();
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.evidence).toHaveLength(1);
    expect(body.nodes[0]).toMatchObject({ id: nodeId, title: "Sample work" });
  });

  it("links a Library item the worker owns", async () => {
    setup();
    const response = await POST(request("POST", { libraryNodeId: nodeId, label: "Sample" }));
    expect(response.status).toBe(201);
  });

  it("rejects linking a Library item the worker does not own, rather than silently succeeding", async () => {
    setup({ insertResult: { data: null, error: { code: "42501", message: "row-level security" } } });
    const response = await POST(request("POST", { libraryNodeId: nodeId }));
    expect(response.status).toBe(403);
  });

  it("reports an already-linked item as a conflict, not a duplicate success", async () => {
    setup({ insertResult: { data: null, error: { code: "23505" } } });
    const response = await POST(request("POST", { libraryNodeId: nodeId }));
    expect(response.status).toBe(409);
  });

  it("rejects an invalid library node id", async () => {
    setup();
    const response = await POST(request("POST", { libraryNodeId: "not-a-uuid" }));
    expect(response.status).toBe(400);
  });

  it("removes an evidence link", async () => {
    setup();
    const response = await DELETE(request("DELETE", undefined, `?libraryNodeId=${nodeId}`));
    expect(response.status).toBe(200);
  });

  it("404s removing a link that does not exist", async () => {
    setup({ deleteResult: { data: null, error: null } });
    const response = await DELETE(request("DELETE", undefined, `?libraryNodeId=${nodeId}`));
    expect(response.status).toBe(404);
  });

  it("rejects cross-origin mutation before auth", async () => {
    const response = await POST(new Request("https://kebu.test/api/liguey/profile/evidence", { method: "POST", headers: { Origin: "https://other.test" } }));
    expect(response.status).toBe(403);
    expect(auth).not.toHaveBeenCalled();
  });
});
