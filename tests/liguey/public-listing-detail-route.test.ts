import { beforeEach, describe, expect, it, vi } from "vitest";
const service = vi.hoisted(() => vi.fn());
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: service }));
vi.mock("@/lib/api-guard", () => ({ publicSiteRateLimit: () => null }));
import { GET } from "@/app/api/public/liguey/listings/[publicId]/route";

const businessId = "11111111-1111-4111-8111-111111111111";
const listingRow = {
  id: "l1", business_id: businessId, public_id: "job_abc", title: "Translator", description: "Help people.",
  requirements: "Fluent Wolof.", employment_type: "contract", location_type: "remote", location: "", status: "published",
  updated_at: "2026-10-16T00:00:00.000Z",
};

const ctx = { params: Promise.resolve({ publicId: "job_abc" }) };
const request = () => new Request("https://kebu.test/api/public/liguey/listings/job_abc");

function setup(opts: { listing?: unknown } = {}) {
  const listingMaybeSingle = vi.fn().mockResolvedValue({ data: opts.listing === undefined ? listingRow : opts.listing, error: null });
  const businessMaybeSingle = vi.fn().mockResolvedValue({ data: { legal_name: "Legal Co", trading_name: "Trade Co" }, error: null });
  const from = vi.fn((table: string) => {
    if (table === "job_listings") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: listingMaybeSingle };
    if (table === "businesses") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: businessMaybeSingle };
    throw new Error("unexpected table " + table);
  });
  service.mockReturnValue({ from });
}

beforeEach(() => vi.clearAllMocks());

describe("Public Liguey listing detail route", () => {
  it("returns a published listing's full detail including ids needed to apply", async () => {
    setup();
    const response = await GET(request(), ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.listing).toMatchObject({ id: "l1", businessId, title: "Translator", employerName: "Trade Co" });
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
