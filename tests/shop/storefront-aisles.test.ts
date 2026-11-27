import { describe, expect, it } from "vitest";
import { assembleStorefrontAisles } from "@/lib/shop/storefront-aisles";

describe("storefront aisles", () => {
  it("drops unavailable products and empty aisles while preserving placement order", () => {
    const item = (product_id: string, sort_order: number) => ({ product_id, sort_order });
    expect(assembleStorefrontAisles([
      { slug: "fruit", name: "Fruit", description: "Fresh", items: [item("apple", 2), item("inactive", 0), item("pear", 1)] },
      { slug: "empty", name: "Empty", description: "", items: [item("other-shop", 0)] },
    ], new Set(["apple", "pear"]))).toEqual([
      { slug: "fruit", name: "Fruit", description: "Fresh", productIds: ["pear", "apple"] },
    ]);
  });
});
