import { describe, expect, it } from "vitest";
import { readAisleFromUrl, writeAisleToUrl } from "@/lib/shop/storefront-aisle-location";
import { assembleStorefrontAisles, filterStorefrontProducts } from "@/lib/shop/storefront-aisles";

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
  it("matches multiple terms across names and descriptions without case or accent differences", () => {
    const products = [
      { name: "Café Touba", description: "Dark roast" },
      { name: "Café glacé" },
      { name: "Thiakry", description: "Millet dessert" },
    ];
    expect(filterStorefrontProducts(products, "DARK   cafe ")).toEqual([products[0]]);
    expect(filterStorefrontProducts(products, "millet")).toEqual([products[2]]);
    expect(filterStorefrontProducts(products, "missing")).toEqual([]);
    expect(filterStorefrontProducts(products, "   ")).toEqual(products);
  });
  it("updates only the aisle parameter and preserves the storefront path and fragment", () => {
    const url = new URL("https://shop.example/sites/grocery?ref=newsletter#products");
    const aisle = writeAisleToUrl(url, "fresh-fruit");
    expect(readAisleFromUrl(aisle)).toBe("fresh-fruit");
    expect(aisle.toString()).toBe("https://shop.example/sites/grocery?ref=newsletter&aisle=fresh-fruit#products");
    expect(writeAisleToUrl(aisle, "").toString()).toBe(url.toString());
  });
});
