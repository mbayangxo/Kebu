import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
import { GET, PATCH } from "@/app/api/liguey/employers/[businessId]/listings/[listingId]/route";

const userId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const listingId = "33333333-3333-4333-8333-333333333333";
const listingRow = { id: listingId, business_id: businessId, public_id: "job_abc", title: "Translator", status: "draft" };

const request = (method: string, body?: unknown) =>
  new Request(`https://kebu.test/api/liguey/employers/${businessId}/listings/${listingId}`, { method, headers: { "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
const ctx = { params: Promise.resolve({ businessId, listingId }) };

function setup(opts: { managerRole?: string | null; listing?: unknown; applications?: unknown[]; updateResult?: { data: unknown; error: unknown }; profiles?: unknown[]; evidence?: unknown[]; evidenceNodes?: unknown[]; insights?: unknown[] } = {}) {
  const memberMaybeSingle = vi.fn().mockResolvedValue({ data: opts.managerRole === undefined ? { role: "founder" } : opts.managerRole === null ? null : { role: opts.managerRole }, error: null });
  const listingMaybeSingle = vi.fn().mockResolvedValue({ data: opts.listing === undefined ? listingRow : opts.listing, error: null });
  const applicationsOrder = vi.fn().mockResolvedValue({ data: opts.applications ?? [], error: null });
  const updateMaybeSingle = vi.fn().mockResolvedValue(opts.updateResult ?? { data: listingRow, error: null });
  const profilesIn = vi.fn().mockResolvedValue({ data: opts.profiles ?? [], error: null });
  const evidenceIn = vi.fn().mockResolvedValue({ data: opts.evidence ?? [], error: null });
  const evidenceNodesIn = vi.fn().mockResolvedValue({ data: opts.evidenceNodes ?? [], error: null });
  const insightsIn = vi.fn().mockResolvedValue({ data: opts.insights ?? [], error: null });
  const from = vi.fn((table: string) => {
    if (table === "business_members") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: memberMaybeSingle };
    if (table === "job_listings") {
      return {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: listingMaybeSingle,
        update: vi.fn(() => ({ eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: updateMaybeSingle })),
      };
    }
    if (table === "job_applications") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: applicationsOrder };
    if (table === "worker_profiles") return { select: vi.fn().mockReturnThis(), in: profilesIn };
    if (table === "worker_profile_evidence") return { select: vi.fn().mockReturnThis(), in: evidenceIn };
    if (table === "library_nodes") return { select: vi.fn().mockReturnThis(), in: evidenceNodesIn };
    if (table === "liguey_applicant_insights") return { select: vi.fn().mockReturnThis(), in: insightsIn };
    throw new Error("unexpected table " + table);
  });
  auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
  return { from };
}

beforeEach(() => vi.clearAllMocks());

describe("Liguey single-listing route", () => {
  it("returns the listing with its applications", async () => {
    setup({ applications: [{ id: "app1", applicant_user_id: userId, status: "submitted" }] });
    const response = await GET(request("GET"), ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.listing).toMatchObject(listingRow);
    expect(body.applications).toHaveLength(1);
  });

  it("includes any previously generated Yande insight alongside each application", async () => {
    setup({
      applications: [{ id: "app1", applicant_user_id: userId, status: "submitted" }],
      insights: [{ application_id: "app1", model: "test-model", summary: "A real summary.", strengths: [], questions_to_ask: [], caution: "" }],
    });
    const response = await GET(request("GET"), ctx);
    const body = await response.json();
    expect(body.applicantInsights).toHaveLength(1);
    expect(body.applicantInsights[0]).toMatchObject({ application_id: "app1", summary: "A real summary." });
  });

  it("includes the applicant's worker profile and portfolio evidence alongside each application (K066 case 6)", async () => {
    setup({
      applications: [{ id: "app1", applicant_user_id: userId, status: "submitted" }],
      profiles: [{ user_id: userId, headline: "Translator", skills: ["Wolof"], languages: ["Wolof", "French"] }],
      evidence: [{ user_id: userId, library_node_id: "node1", label: "Sample" }],
      evidenceNodes: [{ id: "node1", title: "Sample doc", kind: "document" }],
    });
    const response = await GET(request("GET"), ctx);
    const body = await response.json();
    expect(body.applicantProfiles[0]).toMatchObject({ user_id: userId, headline: "Translator" });
    expect(body.applicantEvidence[0]).toMatchObject({ library_node_id: "node1" });
    expect(body.evidenceNodes[0]).toMatchObject({ title: "Sample doc" });
  });

  it("does not query profile/evidence tables when there are no applications (nothing to look up)", async () => {
    const { from } = setup({ applications: [] });
    await GET(request("GET"), ctx);
    expect(from).not.toHaveBeenCalledWith("worker_profiles");
  });

  it("404s a listing that does not belong to this business", async () => {
    setup({ listing: null });
    const response = await GET(request("GET"), ctx);
    expect(response.status).toBe(404);
  });

  it("a manager can publish a listing", async () => {
    setup({ updateResult: { data: { ...listingRow, status: "published" }, error: null } });
    const response = await PATCH(request("PATCH", { status: "published" }), ctx);
    expect(response.status).toBe(200);
    expect((await response.json()).listing.status).toBe("published");
  });

  it("rejects an update from a non-manager", async () => {
    setup({ managerRole: "employee" });
    const response = await PATCH(request("PATCH", { status: "published" }), ctx);
    expect(response.status).toBe(403);
  });

  it("rejects an update with no recognized fields", async () => {
    setup();
    const response = await PATCH(request("PATCH", {}), ctx);
    expect(response.status).toBe(400);
  });

  it("404s an update to a listing RLS/scope does not resolve", async () => {
    setup({ updateResult: { data: null, error: null } });
    const response = await PATCH(request("PATCH", { status: "closed" }), ctx);
    expect(response.status).toBe(404);
  });
});
