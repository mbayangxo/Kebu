import { describe, expect, it, vi } from "vitest";
import { refreshBusinessSearchIndex } from "@/lib/search/business-index";

function mockAdmin(businesses: Array<Record<string, unknown>>) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    if (table === "businesses") {
      return {
        select: () => ({
          eq: () => ({
            limit: async () => ({ data: businesses, error: null }),
          }),
        }),
      };
    }
    if (table === "search_documents") {
      return { upsert };
    }
    throw new Error(`unexpected table ${table}`);
  });
  return { from, upsert } as unknown as { from: typeof from; upsert: typeof upsert };
}

describe("refreshBusinessSearchIndex", () => {
  it("indexes only active businesses, with real trust labels and no invented fields", async () => {
    const admin = mockAdmin([
      {
        id: "biz-1",
        public_kebu_id: "KEBU-SN-01-ABCDEF",
        legal_name: "Atelier Baobab SARL",
        trading_name: "Atelier Baobab",
        country_code: "SN",
        category: "fashion",
        description: "Handmade clothing workshop in Dakar.",
        website: "https://baobab.example",
        verification_level: 2,
        updated_at: "2026-10-01T00:00:00Z",
      },
      {
        id: "biz-2",
        public_kebu_id: "KEBU-GH-01-ZZZZZZ",
        legal_name: "Accra Foods Ltd",
        trading_name: null,
        country_code: "GH",
        category: "food",
        description: "Small food processor.",
        website: null,
        verification_level: 0,
        updated_at: "2026-10-02T00:00:00Z",
      },
    ]);

    const result = await refreshBusinessSearchIndex(admin as never);
    expect(result).toEqual({ businesses: 2 });

    expect(admin.upsert).toHaveBeenCalledTimes(1);
    const [docs, opts] = admin.upsert.mock.calls[0] as [Array<Record<string, unknown>>, { onConflict: string }];
    expect(opts.onConflict).toBe("source_key");
    expect(docs).toHaveLength(2);

    const baobab = docs.find((d) => d.entity_id === "biz-1")!;
    expect(baobab.title).toBe("Atelier Baobab"); // trading name preferred
    expect(baobab.mode).toBe("businesses");
    expect(baobab.access_scope).toBe("public");
    expect(baobab.trust_label).toBe("verified"); // real verification_level > 0
    expect(baobab.source_url).toBe("https://baobab.example");
    expect(baobab.source_key).toBe("business:biz-1");

    const accra = docs.find((d) => d.entity_id === "biz-2")!;
    expect(accra.title).toBe("Accra Foods Ltd"); // falls back to legal name
    expect(accra.trust_label).toBe("unverified"); // verification_level 0 — not fabricated as verified
    expect(accra.source_url).toBeNull(); // no website — never invent one
  });

  it("is honest when nothing is active yet: zero documents, no upsert call", async () => {
    const admin = mockAdmin([]);
    const result = await refreshBusinessSearchIndex(admin as never);
    expect(result).toEqual({ businesses: 0 });
    expect(admin.upsert).not.toHaveBeenCalled();
  });
});
