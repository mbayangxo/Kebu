import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
import { GET, POST, DELETE } from "@/app/api/liguey/businesses/[businessId]/reviews/route";

const userId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const applicationId = "33333333-3333-4333-8333-333333333333";

const request = (method: string, body?: unknown) =>
  new Request(`https://kebu.test/api/liguey/businesses/${businessId}/reviews`, { method, headers: { "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
const ctx = { params: Promise.resolve({ businessId }) };

function setup(opts: {
  reviewRows?: unknown[]; reviewError?: unknown; acceptedApplication?: { id: string } | null;
  upsertResult?: { data: unknown; error: unknown }; deleteResult?: { data: unknown; error: unknown };
} = {}) {
  const reviewsOrder = vi.fn().mockResolvedValue(opts.reviewError ? { data: null, error: opts.reviewError } : { data: opts.reviewRows ?? [], error: null });
  const acceptedMaybeSingle = vi.fn().mockResolvedValue({ data: opts.acceptedApplication === undefined ? { id: applicationId } : opts.acceptedApplication, error: null });
  const upsertSingle = vi.fn().mockResolvedValue(opts.upsertResult ?? { data: { id: "r1", rating: 5, body: "Great place.", is_anonymous: false, status: "visible" }, error: null });
  const deleteMaybeSingle = vi.fn().mockResolvedValue(opts.deleteResult ?? { data: { id: "r1" }, error: null });

  const from = vi.fn((table: string) => {
    if (table === "liguey_company_reviews") {
      return {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: reviewsOrder,
        upsert: vi.fn(() => ({ select: vi.fn().mockReturnThis(), single: upsertSingle })),
        update: vi.fn(() => ({ eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: deleteMaybeSingle })),
      };
    }
    if (table === "job_applications") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: acceptedMaybeSingle };
    throw new Error("unexpected table " + table);
  });
  auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
  return { from, upsertSingle };
}

beforeEach(() => vi.clearAllMocks());

describe("Liguey company reviews route", () => {
  it("GET returns the average, visible reviews, my review, and eligibility", async () => {
    setup({
      reviewRows: [
        { id: "r1", reviewer_user_id: userId, rating: 4, body: "Fair pay.", is_anonymous: false, status: "visible", created_at: "2026-10-20T00:00:00Z", updated_at: "2026-10-20T00:00:00Z" },
        { id: "r2", reviewer_user_id: "other-user", rating: 2, body: "Slow to pay.", is_anonymous: true, status: "visible", created_at: "2026-10-19T00:00:00Z", updated_at: "2026-10-19T00:00:00Z" },
      ],
    });
    const response = await GET(request("GET"), ctx);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.average).toBe(3);
    expect(body.count).toBe(2);
    expect(body.reviews).toHaveLength(2);
    expect(body.myReview).toMatchObject({ rating: 4, isAnonymous: false });
    expect(body.eligibleApplicationId).toBe(applicationId);
  });

  it("GET excludes a removed review from the average but still returns it as myReview", async () => {
    setup({
      reviewRows: [
        { id: "r1", reviewer_user_id: userId, rating: 1, body: "Withdrawn.", is_anonymous: false, status: "removed", created_at: "2026-10-20T00:00:00Z", updated_at: "2026-10-20T00:00:00Z" },
      ],
    });
    const response = await GET(request("GET"), ctx);
    const body = await response.json();
    expect(body.average).toBeNull();
    expect(body.count).toBe(0);
    expect(body.reviews).toHaveLength(0);
    expect(body.myReview).toMatchObject({ status: "removed" });
  });

  it("GET reports no eligible application when the worker was never accepted here", async () => {
    setup({ acceptedApplication: null });
    const response = await GET(request("GET"), ctx);
    expect((await response.json()).eligibleApplicationId).toBeNull();
  });

  it("POST saves a real review tied to the accepted application", async () => {
    const { from } = setup();
    const response = await POST(request("POST", { applicationId, rating: 5, body: "Great place.", isAnonymous: false }), ctx);
    expect(response.status).toBe(200);
    expect((await response.json()).review).toMatchObject({ rating: 5, body: "Great place." });
    expect(from).toHaveBeenCalledWith("liguey_company_reviews");
  });

  it("POST rejects an invalid payload", async () => {
    setup();
    const response = await POST(request("POST", { applicationId, rating: 7 }), ctx);
    expect(response.status).toBe(400);
  });

  it("POST surfaces RLS's rejection as a clear 403 when the reviewer was never actually hired there", async () => {
    setup({ upsertResult: { data: null, error: { code: "42501", message: "new row violates row-level security policy" } } });
    const response = await POST(request("POST", { applicationId, rating: 5, body: "Fake.", isAnonymous: false }), ctx);
    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain("actually hired");
  });

  it("DELETE soft-removes the reviewer's own review", async () => {
    setup();
    const response = await DELETE(request("DELETE"), ctx);
    expect(response.status).toBe(200);
  });

  it("DELETE 404s when the reviewer has no review to remove", async () => {
    setup({ deleteResult: { data: null, error: null } });
    const response = await DELETE(request("DELETE"), ctx);
    expect(response.status).toBe(404);
  });
});
