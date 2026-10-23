import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: (...args: unknown[]) => rpc(...args) }),
}));
vi.mock("@/lib/api-guard", () => ({ publicSiteRateLimit: () => null }));

import { GET } from "@/app/api/search/businesses/route";

function mkReq(url: string) {
  return new Request(url) as unknown as Request;
}

describe("GET /api/search/businesses", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: [], error: null });
  });

  it("calls the live-enforced, ranked RPC — not a raw table read", async () => {
    await GET(mkReq("http://localhost/api/search/businesses?q=baobab"));
    expect(rpc).toHaveBeenCalledWith("search_businesses", { p_query: "baobab", p_country: null });
  });

  it("passes a well-formed country code through exactly", async () => {
    await GET(mkReq("http://localhost/api/search/businesses?country=sn"));
    expect(rpc).toHaveBeenCalledWith("search_businesses", { p_query: null, p_country: "SN" });
  });

  it("drops a malformed country value instead of silently matching everything", async () => {
    // A 1-character or non-alphabetic value used to survive a naive .slice(0, 2)
    // and get matched with an unanchored ILIKE against the display summary.
    await GET(mkReq("http://localhost/api/search/businesses?country=a"));
    expect(rpc).toHaveBeenCalledWith("search_businesses", { p_query: null, p_country: null });

    rpc.mockClear();
    await GET(mkReq("http://localhost/api/search/businesses?country=12"));
    expect(rpc).toHaveBeenCalledWith("search_businesses", { p_query: null, p_country: null });
  });

  it("maps RPC rows straight through, with no delimiter-parsing of a display string", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          entity_id: "biz-1",
          title: "Atelier Baobab",
          summary: "Fashion · SN · Handmade clothing workshop",
          source_url: null,
          source_name: "Kebu Business Directory",
          trust_label: "verified",
          category: "fashion",
          country_code: "SN",
          fetched_at: "2026-10-01T00:00:00Z",
        },
      ],
      error: null,
    });
    const res = await GET(mkReq("http://localhost/api/search/businesses?q=baobab"));
    const body = await res.json();
    expect(body.results[0].category).toBe("fashion");
    expect(body.results[0].countryCode).toBe("SN");
    expect(body.results[0].href).toBe("/kebu-search/business/biz-1");
  });

  it("reports mode='recent' for an empty query and mode='query' otherwise", async () => {
    const recent = await GET(mkReq("http://localhost/api/search/businesses"));
    expect((await recent.json()).mode).toBe("recent");

    const query = await GET(mkReq("http://localhost/api/search/businesses?q=baobab"));
    expect((await query.json()).mode).toBe("query");
  });

  it("returns a clean 500 instead of leaking the RPC error, and logs it", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "connection refused" } });
    const res = await GET(mkReq("http://localhost/api/search/businesses?q=x"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).not.toMatch(/connection refused/);
  });
});
