import { describe, expect, it, vi } from "vitest";
import { refreshBusinessSearchIndex } from "@/lib/search/business-index";

function makeBusiness(i: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `id-${String(i).padStart(4, "0")}`,
    public_kebu_id: `KEBU-SN-01-AAAA${i}`,
    legal_name: `Business ${i}`,
    trading_name: null,
    country_code: "SN",
    category: "fashion",
    description: `Description ${i}`,
    website: null,
    verification_level: 0,
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

/** Pages through `rows` honoring eq(lifecycle_status), order(id asc), gt(id, cursor), limit(pageSize). */
function mockAdmin(rows: Array<Record<string, unknown>>, opts: { failOnPage?: number } = {}) {
  let pageCount = 0;
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const del = vi.fn();
  const existingSelect = vi.fn();

  const from = vi.fn((table: string) => {
    if (table === "businesses") {
      let gtCursor: string | null = null;
      let limitN = Infinity;
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        gt: (_col: string, value: string) => {
          gtCursor = value;
          return chain;
        },
        limit: (n: number) => {
          limitN = n;
          return (async () => {
            pageCount++;
            if (opts.failOnPage === pageCount) {
              return { data: null, error: { message: "simulated page failure" } };
            }
            const sorted = [...rows].sort((a, b) => (a.id as string).localeCompare(b.id as string));
            const start = gtCursor ? sorted.findIndex((r) => r.id === gtCursor) + 1 : 0;
            return { data: sorted.slice(start, start + limitN), error: null };
          })();
        },
      };
      return chain;
    }
    if (table === "search_documents") {
      return {
        upsert,
        select: () => ({
          eq: () => existingSelect(),
        }),
        delete: () => ({
          eq: () => ({
            in: (_col: string, ids: string[]) => {
              del(ids);
              return Promise.resolve({ error: null });
            },
          }),
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { from, upsert, del, existingSelect, pageCountRef: () => pageCount } as unknown as {
    from: typeof from;
    upsert: typeof upsert;
    del: typeof del;
    existingSelect: typeof existingSelect;
    pageCountRef: () => number;
  };
}

describe("refreshBusinessSearchIndex — pagination", () => {
  it("indexes every active business across multiple pages, not just the first page", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => makeBusiness(i));
    const admin = mockAdmin(rows);
    admin.existingSelect.mockResolvedValue({ data: [], error: null });

    const result = await refreshBusinessSearchIndex(admin as never, { pageSize: 2 });

    expect(result.businesses).toBe(5); // all 5, not capped at the page size
    expect(admin.pageCountRef()).toBe(3); // 2 + 2 + 1
    const [docs] = admin.upsert.mock.calls[0] as [Array<Record<string, unknown>>];
    expect(docs).toHaveLength(5);
    expect(new Set(docs.map((d) => d.entity_id)).size).toBe(5); // no duplicates from the cursor logic
  });

  it("aborts without writing anything if any page fails — never a partial index", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => makeBusiness(i));
    const admin = mockAdmin(rows, { failOnPage: 2 });
    admin.existingSelect.mockResolvedValue({ data: [], error: null });

    await expect(refreshBusinessSearchIndex(admin as never, { pageSize: 2 })).rejects.toThrow(
      "simulated page failure",
    );
    expect(admin.upsert).not.toHaveBeenCalled();
    expect(admin.del).not.toHaveBeenCalled();
  });

  it("reconciles: removes a search_documents row whose business is no longer active, only after a full successful scan", async () => {
    const rows = [makeBusiness(0)]; // only id-0000 is still active
    const admin = mockAdmin(rows);
    admin.existingSelect.mockResolvedValue({
      data: [{ entity_id: "id-0000" }, { entity_id: "id-0001" }], // id-0001 was indexed before, now gone/inactive
      error: null,
    });

    const result = await refreshBusinessSearchIndex(admin as never, { pageSize: 500 });

    expect(result.businesses).toBe(1);
    expect(result.stale_removed).toBe(1);
    expect(admin.del).toHaveBeenCalledWith(["id-0001"]);
  });

  it("is honest when nothing is active yet: zero documents, no upsert, still reconciles any stale rows", async () => {
    const admin = mockAdmin([]);
    admin.existingSelect.mockResolvedValue({ data: [{ entity_id: "id-old" }], error: null });

    const result = await refreshBusinessSearchIndex(admin as never);
    expect(result.businesses).toBe(0);
    expect(admin.upsert).not.toHaveBeenCalled();
    expect(result.stale_removed).toBe(1);
    expect(admin.del).toHaveBeenCalledWith(["id-old"]);
  });
});

describe("refreshBusinessSearchIndex — document shape", () => {
  it("stores category/country as real columns, with correct trust labels", async () => {
    const admin = mockAdmin([
      makeBusiness(0, {
        id: "biz-1",
        trading_name: "Atelier Baobab",
        legal_name: "Atelier Baobab SARL",
        country_code: "SN",
        category: "fashion",
        website: "https://baobab.example",
        verification_level: 2,
      }),
      makeBusiness(1, {
        id: "biz-2",
        legal_name: "Accra Foods Ltd",
        country_code: "GH",
        category: "food",
        website: null,
        verification_level: 0,
      }),
      makeBusiness(2, { id: "biz-3", legal_name: "Lagos Textiles", country_code: "NG", category: null }),
    ]);
    admin.existingSelect.mockResolvedValue({ data: [], error: null });

    await refreshBusinessSearchIndex(admin as never);
    const [docs] = admin.upsert.mock.calls[0] as [Array<Record<string, unknown>>];

    const baobab = docs.find((d) => d.entity_id === "biz-1")!;
    expect(baobab.title).toBe("Atelier Baobab");
    expect(baobab.trust_label).toBe("verified");
    expect(baobab.category).toBe("fashion");
    expect(baobab.country_code).toBe("SN");
    expect(baobab.source_url).toBe("https://baobab.example");

    const accra = docs.find((d) => d.entity_id === "biz-2")!;
    expect(accra.title).toBe("Accra Foods Ltd");
    expect(accra.trust_label).toBe("unverified");
    expect(accra.source_url).toBeNull();

    const lagos = docs.find((d) => d.entity_id === "biz-3")!;
    expect(lagos.category).toBeNull(); // real null, never corrupting country_code
    expect(lagos.country_code).toBe("NG");
  });
});
