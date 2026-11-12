import { beforeEach, describe, expect, it, vi } from "vitest";
const service = vi.hoisted(() => vi.fn());
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: service }));
vi.mock("@/lib/api-guard", () => ({ publicSiteRateLimit: () => null }));
import { GET } from "@/app/api/public/liguey/listings/route";

const businessId = "11111111-1111-4111-8111-111111111111";
const listingRow = { id: "l1", business_id: businessId, public_id: "job_abc", title: "Translator", employment_type: "contract", location_type: "remote", location: "", pay_label: "2,000 XOF/day", photo_url: "https://cdn.test/photo.jpg", updated_at: "2026-10-16T00:00:00.000Z" };

function setup(opts: { listResult?: { data: unknown; error: unknown } } = {}) {
  const result = opts.listResult ?? { data: [listingRow], error: null };
  // Mirrors postgrest-js: the builder stays chainable (.eq/.order/.limit all
  // return itself) and is also directly thenable/awaitable at any point,
  // since the real route conditionally chains more .eq() calls AFTER
  // .limit(100) and then awaits the whole thing.
  const query: Record<string, unknown> & { then: (resolve: (value: unknown) => void) => void } = {
    then: (resolve: (value: unknown) => void) => resolve(result),
  } as never;
  query.select = vi.fn().mockReturnValue(query);
  query.eq = vi.fn().mockReturnValue(query);
  query.order = vi.fn().mockReturnValue(query);
  query.limit = vi.fn().mockReturnValue(query);
  const businessesIn = vi.fn().mockResolvedValue({ data: [{ id: businessId, legal_name: "Legal Co", trading_name: "Trade Co" }], error: null });
  const from = vi.fn((table: string) => {
    if (table === "job_listings") return query;
    if (table === "businesses") return { select: vi.fn().mockReturnThis(), in: businessesIn };
    throw new Error("unexpected table " + table);
  });
  service.mockReturnValue({ from });
  return { query };
}

beforeEach(() => vi.clearAllMocks());

const request = (search = "") => new Request("https://kebu.test/api/public/liguey/listings" + search);

describe("Public Liguey listings route", () => {
  it("returns published listings with the employer's display name", async () => {
    setup();
    const response = await GET(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.listings[0]).toMatchObject({ publicId: "job_abc", title: "Translator", employerName: "Trade Co", payLabel: "2,000 XOF/day", photoUrl: "https://cdn.test/photo.jpg" });
  });

  it("filters by employment type when provided", async () => {
    const { query } = setup();
    await GET(request("?employmentType=contract"));
    expect(query.eq).toHaveBeenCalledWith("employment_type", "contract");
  });

  it("returns 503 when the service client is unavailable", async () => {
    service.mockReturnValue(null);
    const response = await GET(request());
    expect(response.status).toBe(503);
  });

  it("returns an empty list rather than erroring when there are no published listings", async () => {
    setup({ listResult: { data: [], error: null } });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect((await response.json()).listings).toEqual([]);
  });
});
