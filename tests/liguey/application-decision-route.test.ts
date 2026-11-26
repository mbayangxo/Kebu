import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
import { PATCH } from "@/app/api/liguey/employers/[businessId]/listings/[listingId]/applications/[applicationId]/route";

const userId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const listingId = "33333333-3333-4333-8333-333333333333";
const applicationId = "44444444-4444-4444-8444-444444444444";

const request = (body?: unknown) =>
  new Request(`https://kebu.test/api/liguey/employers/${businessId}/listings/${listingId}/applications/${applicationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
const ctx = { params: Promise.resolve({ businessId, listingId, applicationId }) };

function setup(opts: { managerRole?: string | null; updateResult?: { data: unknown; error: unknown } } = {}) {
  const memberMaybeSingle = vi.fn().mockResolvedValue({ data: opts.managerRole === undefined ? { role: "founder" } : opts.managerRole === null ? null : { role: opts.managerRole }, error: null });
  const updateMaybeSingle = vi.fn().mockResolvedValue(opts.updateResult ?? { data: { id: applicationId, status: "accepted", decided_at: "2026-10-16T00:00:00.000Z", decided_by: userId }, error: null });
  const from = vi.fn((table: string) => {
    if (table === "business_members") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: memberMaybeSingle };
    if (table === "job_applications") return { update: vi.fn(() => ({ eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: updateMaybeSingle })) };
    throw new Error("unexpected table " + table);
  });
  auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
}

beforeEach(() => vi.clearAllMocks());

describe("Liguey application decision route", () => {
  it("a manager can accept an application", async () => {
    setup();
    const response = await PATCH(request({ status: "accepted" }), ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.application).toMatchObject({ status: "accepted", decided_by: userId });
  });

  it("rejects a decision from a non-manager", async () => {
    setup({ managerRole: "employee" });
    const response = await PATCH(request({ status: "accepted" }), ctx);
    expect(response.status).toBe(403);
  });

  it("rejects an invalid status value", async () => {
    setup();
    const response = await PATCH(request({ status: "approved" }), ctx);
    expect(response.status).toBe(400);
  });

  it("404s a decision on an application outside this listing/business scope", async () => {
    setup({ updateResult: { data: null, error: null } });
    const response = await PATCH(request({ status: "accepted" }), ctx);
    expect(response.status).toBe(404);
  });

  it("rejects cross-origin mutation before auth", async () => {
    const response = await PATCH(new Request(`https://kebu.test/api/liguey/employers/${businessId}/listings/${listingId}/applications/${applicationId}`, { method: "PATCH", headers: { Origin: "https://other.test" } }), ctx);
    expect(response.status).toBe(403);
    expect(auth).not.toHaveBeenCalled();
  });
});
