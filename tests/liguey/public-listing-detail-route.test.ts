import { beforeEach, describe, expect, it, vi } from "vitest";
const service = vi.hoisted(() => vi.fn());
const reviews = vi.hoisted(() => vi.fn());
vi.mock("@/lib/liguey/employer-safety", () => ({
  reviewedEmployerIds: reviews,
}));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: service }));
vi.mock("@/lib/api-guard", () => ({ publicSiteRateLimit: () => null }));
import { GET } from "@/app/api/public/liguey/listings/[publicId]/route";

const businessId = "11111111-1111-4111-8111-111111111111";
const listingRow = {
  id: "l1",
  business_id: businessId,
  public_id: "job_abc",
  title: "Translator",
  description: "Help people.",
  requirements: "Fluent Wolof.",
  employment_type: "contract",
  location_type: "remote",
  location: "",
  pay_label: "2,000 XOF/day",
  photo_url: "https://cdn.test/photo.jpg",
  status: "published",
  updated_at: "2026-10-16T00:00:00.000Z",
};

const ctx = { params: Promise.resolve({ publicId: "job_abc" }) };
const request = () =>
  new Request("https://kebu.test/api/public/liguey/listings/job_abc");

function setup(opts: { listing?: unknown } = {}) {
  const listingMaybeSingle = vi
    .fn()
    .mockResolvedValue({
      data: opts.listing === undefined ? listingRow : opts.listing,
      error: null,
    });
  const businessMaybeSingle = vi
    .fn()
    .mockResolvedValue({
      data: {
        legal_name: "Legal Co",
        trading_name: "Trade Co",
        description: "We translate for the community.",
        website: "https://trade.example",
      },
      error: null,
    });
  const from = vi.fn((table: string) => {
    if (table === "job_listings")
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: listingMaybeSingle,
      };
    if (table === "businesses")
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: businessMaybeSingle,
      };
    throw new Error("unexpected table " + table);
  });
  service.mockReturnValue({ from });
}

beforeEach(() => {
  vi.clearAllMocks();
  reviews.mockResolvedValue({ ids: new Set([businessId]), error: null });
});

describe("Public Liguey listing detail route", () => {
  it("returns a published listing's full detail including ids needed to apply", async () => {
    setup();
    const response = await GET(request(), ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.listing).toMatchObject({
      id: "l1",
      businessId,
      title: "Translator",
      employerName: "Trade Co",
      payLabel: "2,000 XOF/day",
      photoUrl: "https://cdn.test/photo.jpg",
      employerAbout: "We translate for the community.",
      employerWebsite: "https://trade.example",
    });
  });

  it("404s a listing that does not exist", async () => {
    setup({ listing: null });
    const response = await GET(request(), ctx);
    expect(response.status).toBe(404);
  });

  it("404s a draft listing — never leaks an unpublished listing's existence", async () => {
    setup({ listing: { ...listingRow, status: "draft" } });
    const response = await GET(request(), ctx);
    expect(response.status).toBe(404);
  });

  it("returns 503 when the service client is unavailable", async () => {
    service.mockReturnValue(null);
    const response = await GET(request(), ctx);
    expect(response.status).toBe(503);
  });
});

it("does not expose jobs from an unreviewed employer", async () => {
  setup();
  reviews.mockResolvedValue({ ids: new Set(), error: null });
  const r = await GET(request(), ctx);
  expect(r.status).toBe(404);
});
it("fails closed when employer review storage is unavailable", async () => {
  setup();
  reviews.mockResolvedValue({ ids: new Set(), error: { message: "missing" } });
  const r = await GET(request(), ctx);
  expect(r.status).toBe(503);
});
