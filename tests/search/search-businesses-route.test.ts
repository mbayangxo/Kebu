import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: Array<{ method: string; args: unknown[] }> = [];

function chain(data: unknown[]) {
  const record: Record<string, unknown> = {};
  const self = () => record as unknown as PromiseLike<{ data: unknown[]; error: null }> & Record<string, unknown>;
  for (const method of ["select", "eq", "order", "limit", "textSearch"]) {
    record[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return self();
    };
  }
  record.then = (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data, error: null });
  return record;
}

let rows: unknown[] = [];
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => chain(rows) }),
}));
vi.mock("@/lib/api-guard", () => ({ publicSiteRateLimit: () => null }));

import { GET } from "@/app/api/search/businesses/route";

function mkReq(url: string) {
  return new Request(url) as unknown as Request;
}

describe("GET /api/search/businesses — country filter", () => {
  beforeEach(() => {
    calls.length = 0;
    rows = [];
  });

  it("applies an exact country filter for a well-formed code", async () => {
    await GET(mkReq("http://localhost/api/search/businesses?country=sn"));
    const eqCountry = calls.find((c) => c.method === "eq" && c.args[0] === "country_code");
    expect(eqCountry?.args).toEqual(["country_code", "SN"]);
  });

  it("ignores a malformed country value instead of silently matching everything", async () => {
    // A 1-character value used to survive as a naive .slice(0, 2) and get matched
    // with ILIKE '%· A%', which also matched any real 2-letter code starting with A.
    await GET(mkReq("http://localhost/api/search/businesses?country=a"));
    const eqCountry = calls.find((c) => c.method === "eq" && c.args[0] === "country_code");
    expect(eqCountry).toBeUndefined();
  });

  it("ignores a non-alphabetic country value", async () => {
    await GET(mkReq("http://localhost/api/search/businesses?country=12"));
    const eqCountry = calls.find((c) => c.method === "eq" && c.args[0] === "country_code");
    expect(eqCountry).toBeUndefined();
  });

  it("maps real columns straight through, with no delimiter-splitting", async () => {
    rows = [
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
    ];
    const res = await GET(mkReq("http://localhost/api/search/businesses?q=baobab"));
    const body = await res.json();
    expect(body.results[0].category).toBe("fashion");
    expect(body.results[0].countryCode).toBe("SN");
  });
});
