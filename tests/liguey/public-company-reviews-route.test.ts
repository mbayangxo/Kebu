import { beforeEach, describe, expect, it, vi } from "vitest";
const service = vi.hoisted(() => vi.fn());
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: service }));
vi.mock("@/lib/api-guard", () => ({ publicSiteRateLimit: () => null }));
import { GET } from "@/app/api/public/liguey/businesses/[businessId]/reviews/route";

const businessId = "11111111-1111-4111-8111-111111111111";
const namedReviewer = "22222222-2222-4222-8222-222222222222";
const anonReviewer = "33333333-3333-4333-8333-333333333333";

const ctx = { params: Promise.resolve({ businessId }) };
const request = () => new Request(`https://kebu.test/api/public/liguey/businesses/${businessId}/reviews`);

function setup(opts: { reviewRows?: unknown[]; profiles?: unknown[] } = {}) {
  const rows = opts.reviewRows ?? [
    { reviewer_user_id: namedReviewer, rating: 5, body: "Paid on time, respectful.", is_anonymous: false, created_at: "2026-10-20T00:00:00Z" },
    { reviewer_user_id: anonReviewer, rating: 1, body: "Never paid me.", is_anonymous: true, created_at: "2026-10-19T00:00:00Z" },
  ];
  const reviewsLimit = vi.fn().mockResolvedValue({ data: rows, error: null });
  const profilesIn = vi.fn().mockResolvedValue({ data: opts.profiles ?? [{ user_id: namedReviewer, headline: "Community translator" }], error: null });
  const from = vi.fn((table: string) => {
    if (table === "liguey_company_reviews") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: reviewsLimit };
    if (table === "worker_profiles") return { select: vi.fn().mockReturnThis(), in: profilesIn };
    throw new Error("unexpected table " + table);
  });
  service.mockReturnValue({ from });
  return { profilesIn };
}

beforeEach(() => vi.clearAllMocks());

describe("Public Liguey company reviews route", () => {
  it("returns the real average and count across visible reviews", async () => {
    setup();
    const response = await GET(request(), ctx);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.average).toBe(3);
    expect(body.count).toBe(2);
  });

  it("shows a non-anonymous reviewer's worker-profile headline, never their raw identity", async () => {
    setup();
    const response = await GET(request(), ctx);
    const body = await response.json();
    expect(body.reviews.find((r: { rating: number }) => r.rating === 5).reviewerLabel).toBe("Community translator");
  });

  it("never reveals an anonymous reviewer's identity, even though a profile lookup ran", async () => {
    const { profilesIn } = setup();
    const response = await GET(request(), ctx);
    const body = await response.json();
    expect(body.reviews.find((r: { rating: number }) => r.rating === 1).reviewerLabel).toBe("Anonymous");
    // Anonymous reviewers are never included in the headline lookup at all.
    expect(profilesIn).toHaveBeenCalledWith("user_id", [namedReviewer]);
  });

  it("falls back to a generic label when a non-anonymous reviewer has no headline set", async () => {
    setup({ profiles: [] });
    const response = await GET(request(), ctx);
    const body = await response.json();
    expect(body.reviews.find((r: { rating: number }) => r.rating === 5).reviewerLabel).toBe("Verified Liguey worker");
  });

  it("returns an empty, zero-average result rather than erroring when there are no reviews", async () => {
    setup({ reviewRows: [] });
    const response = await GET(request(), ctx);
    const body = await response.json();
    expect(body.average).toBeNull();
    expect(body.count).toBe(0);
    expect(body.reviews).toEqual([]);
  });

  it("returns 503 when the service client is unavailable", async () => {
    service.mockReturnValue(null);
    const response = await GET(request(), ctx);
    expect(response.status).toBe(503);
  });
});
