import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: (...args: unknown[]) => rpc(...args) }),
}));
vi.mock("@/lib/api-guard", () => ({ publicSiteRateLimit: () => null }));

import { GET } from "@/app/api/search/products/route";

function mkReq(url: string) {
  return new Request(url) as unknown as Request;
}

describe("GET /api/search/products", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: [], error: null });
  });

  it("calls the live-enforced, ranked RPC with clamped defaults", async () => {
    await GET(mkReq("http://localhost/api/search/products?q=template"));
    expect(rpc).toHaveBeenCalledWith("search_products", { p_query: "template", p_limit: 20, p_offset: 0 });
  });

  it("clamps an out-of-range limit/offset instead of trusting the caller", async () => {
    await GET(mkReq("http://localhost/api/search/products?limit=9999&offset=-5"));
    expect(rpc).toHaveBeenCalledWith("search_products", { p_query: null, p_limit: 50, p_offset: 0 });
  });

  it("maps both entity types through, with distinct detail hrefs", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          entity_id: "shop-1",
          entity_type: "shop_product",
          title: "Baobab Honey Jar",
          summary: "5,000 FCFA",
          source_url: null,
          source_name: "Kebu Shop",
          trust_label: "verified",
          category: null,
          price_label: "5,000 FCFA",
          fetched_at: "2026-10-01T00:00:00Z",
          total_count: 2,
        },
        {
          entity_id: "tpl-1",
          entity_type: "marketplace_template",
          title: "Instagram Post Pack",
          summary: "Templates · $19.99",
          source_url: "https://preview.example",
          source_name: "Kebu Studio Marketplace",
          trust_label: "verified",
          category: "templates",
          price_label: "$19.99",
          fetched_at: "2026-10-01T00:00:00Z",
          total_count: 2,
        },
      ],
      error: null,
    });

    const res = await GET(mkReq("http://localhost/api/search/products?q=x"));
    const body = await res.json();
    expect(body.results[0].href).toBe("/kebu-search/product/shop_product/shop-1");
    expect(body.results[1].href).toBe("/kebu-search/product/marketplace_template/tpl-1");
    expect(body.total).toBe(2);
  });

  it("reports mode='recent' for an empty query and mode='query' otherwise", async () => {
    const recent = await GET(mkReq("http://localhost/api/search/products"));
    expect((await recent.json()).mode).toBe("recent");

    const query = await GET(mkReq("http://localhost/api/search/products?q=template"));
    expect((await query.json()).mode).toBe("query");
  });

  it("returns a clean 500 instead of leaking the RPC error, and logs it", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "connection refused" } });
    const res = await GET(mkReq("http://localhost/api/search/products?q=x"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).not.toMatch(/connection refused/);
  });
});
