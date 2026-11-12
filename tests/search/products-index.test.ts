import { describe, expect, it, vi } from "vitest";
import { refreshProductsSearchIndex } from "@/lib/search/products-index";

function makeShopProduct(i: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `shop-${String(i).padStart(4, "0")}`,
    name: `Product ${i}`,
    description: `Description ${i}`,
    price_label: "5,000 FCFA",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

function makeTemplate(i: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `tpl-${String(i).padStart(4, "0")}`,
    name: `Template ${i}`,
    description: `Template description ${i}`,
    category: "fashion",
    price_cents: 1200,
    preview_url: null,
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

/** Pages through `rows` honoring order(id asc), gt(id, cursor), limit(pageSize); eq()/select() are no-ops (real filtering is exercised in the real-SQL suite). */
function pagedTable(rows: Array<Record<string, unknown>>, opts: { failOnPage?: number; pageCounter: { n: number } }) {
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
        opts.pageCounter.n++;
        if (opts.failOnPage === opts.pageCounter.n) {
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

function mockAdmin(
  shopRows: Array<Record<string, unknown>>,
  templateRows: Array<Record<string, unknown>>,
  opts: { failOnShopPage?: number; failOnTemplatePage?: number } = {},
) {
  const shopPageCounter = { n: 0 };
  const templatePageCounter = { n: 0 };
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const del = vi.fn();
  const existingSelect = vi.fn();

  const from = vi.fn((table: string) => {
    if (table === "project_products") return pagedTable(shopRows, { failOnPage: opts.failOnShopPage, pageCounter: shopPageCounter });
    if (table === "marketplace_templates") return pagedTable(templateRows, { failOnPage: opts.failOnTemplatePage, pageCounter: templatePageCounter });
    if (table === "search_documents") {
      return {
        upsert,
        select: () => ({ eq: () => existingSelect() }),
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

  return { from, upsert, del, existingSelect };
}

describe("refreshProductsSearchIndex", () => {
  it("indexes both real sources — shop products and marketplace templates — under one mode", async () => {
    const admin = mockAdmin([makeShopProduct(0), makeShopProduct(1)], [makeTemplate(0)]);
    admin.existingSelect.mockResolvedValue({ data: [], error: null });

    const result = await refreshProductsSearchIndex(admin as never);

    expect(result.shop_products).toBe(2);
    expect(result.marketplace_templates).toBe(1);
    const [docs] = admin.upsert.mock.calls[0] as [Array<Record<string, unknown>>];
    expect(docs).toHaveLength(3);
    expect(docs.every((d) => d.mode === "products")).toBe(true);
    expect(new Set(docs.map((d) => d.entity_id)).size).toBe(3); // no cross-source collisions
  });

  it("paginates each source independently, not capped at the first page", async () => {
    const shopRows = Array.from({ length: 5 }, (_, i) => makeShopProduct(i));
    const templateRows = Array.from({ length: 3 }, (_, i) => makeTemplate(i));
    const admin = mockAdmin(shopRows, templateRows);
    admin.existingSelect.mockResolvedValue({ data: [], error: null });

    const result = await refreshProductsSearchIndex(admin as never, { pageSize: 2 });

    expect(result.shop_products).toBe(5);
    expect(result.marketplace_templates).toBe(3);
  });

  it("aborts without writing anything if the shop_product scan fails", async () => {
    const admin = mockAdmin(
      Array.from({ length: 5 }, (_, i) => makeShopProduct(i)),
      [makeTemplate(0)],
      { failOnShopPage: 2 },
    );
    admin.existingSelect.mockResolvedValue({ data: [], error: null });

    await expect(refreshProductsSearchIndex(admin as never, { pageSize: 2 })).rejects.toThrow("simulated page failure");
    expect(admin.upsert).not.toHaveBeenCalled();
    expect(admin.del).not.toHaveBeenCalled();
  });

  it("aborts without writing anything if the marketplace_template scan fails", async () => {
    const admin = mockAdmin([makeShopProduct(0)], Array.from({ length: 5 }, (_, i) => makeTemplate(i)), {
      failOnTemplatePage: 2,
    });
    admin.existingSelect.mockResolvedValue({ data: [], error: null });

    await expect(refreshProductsSearchIndex(admin as never, { pageSize: 2 })).rejects.toThrow("simulated page failure");
    expect(admin.upsert).not.toHaveBeenCalled();
    expect(admin.del).not.toHaveBeenCalled();
  });

  it("reconciles: removes stale search_documents rows across both entity types, only after a full successful scan", async () => {
    const admin = mockAdmin([makeShopProduct(0, { id: "shop-0000" })], []);
    admin.existingSelect.mockResolvedValue({
      data: [{ entity_id: "shop-0000" }, { entity_id: "shop-gone" }, { entity_id: "tpl-gone" }],
      error: null,
    });

    const result = await refreshProductsSearchIndex(admin as never);
    expect(result.stale_removed).toBe(2);
    expect(admin.del).toHaveBeenCalledWith(expect.arrayContaining(["shop-gone", "tpl-gone"]));
  });

  it("formats marketplace_templates.price_cents into a human-readable label; shop products use their own price_label verbatim", async () => {
    const admin = mockAdmin(
      [makeShopProduct(0, { id: "shop-0000", price_label: "5,000 FCFA" })],
      [makeTemplate(0, { id: "tpl-0000", price_cents: 1999 })],
    );
    admin.existingSelect.mockResolvedValue({ data: [], error: null });

    await refreshProductsSearchIndex(admin as never);
    const [docs] = admin.upsert.mock.calls[0] as [Array<Record<string, unknown>>];

    expect(docs.find((d) => d.entity_id === "shop-0000")!.price_label).toBe("5,000 FCFA");
    expect(docs.find((d) => d.entity_id === "tpl-0000")!.price_label).toBe("$19.99");
  });

  it("attributes each entity type to its real source, not a generic label", async () => {
    const admin = mockAdmin([makeShopProduct(0, { id: "shop-0000" })], [makeTemplate(0, { id: "tpl-0000" })]);
    admin.existingSelect.mockResolvedValue({ data: [], error: null });

    await refreshProductsSearchIndex(admin as never);
    const [docs] = admin.upsert.mock.calls[0] as [Array<Record<string, unknown>>];

    expect(docs.find((d) => d.entity_id === "shop-0000")!.source_name).toBe("Kebu Shop");
    expect(docs.find((d) => d.entity_id === "tpl-0000")!.source_name).toBe("Kebu Studio Marketplace");
  });
});
