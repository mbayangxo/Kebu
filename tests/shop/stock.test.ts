import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isInStock } from "@/lib/shop/stock";

describe("product stock", () => {
  it("treats non-tracking products as always in stock", () => {
    expect(isInStock({ trackStock: false, stockQty: 0 }, 5)).toBe(true);
  });

  it("enforces qty when tracking", () => {
    expect(isInStock({ trackStock: true, stockQty: 2 }, 2)).toBe(true);
    expect(isInStock({ trackStock: true, stockQty: 1 }, 2)).toBe(false);
    expect(isInStock({ trackStock: true, stockQty: null }, 1)).toBe(false);
  });

  it("ships migration 047", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/047_shop_product_stock.sql"),
      "utf8",
    );
    expect(sql).toContain("track_stock");
    expect(sql).toContain("stock_qty");
  });
});
