import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { productVariantSchema, variantDisplayName } from "@/lib/shop/product-variants";
import { cartLineSchema } from "@/lib/shop/cart-order";

describe("C4 product variants", () => {
  it("validates variant input", () => {
    const parsed = productVariantSchema.parse({
      name: "Size M / Blue",
      option1: "M",
      option2: "Blue",
      priceLabel: "8,000 XOF",
      priceXof: 8000,
    });
    expect(parsed.option1).toBe("M");
  });

  it("cart lines accept optional variantId", () => {
    const line = cartLineSchema.parse({
      productId: "11111111-2222-4333-a444-555555555555",
      variantId: "22222222-3333-4444-a555-666666666666",
      quantity: 1,
    });
    expect(line.variantId).toBeTruthy();
  });

  it("formats variant display name from options", () => {
    expect(
      variantDisplayName({
        id: "x",
        product_id: "p",
        project_id: "j",
        name: "Variant",
        option1: "L",
        option2: "Red",
        option3: "",
        price_label: "",
        price_xof: null,
        sku: null,
        image_url: "",
        stock_qty: null,
        sort_order: 0,
        is_active: true,
        created_at: "",
        updated_at: "",
      }),
    ).toBe("L / Red");
  });

  it("ships migration 064 with variants table", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/064_creation_stack_slices.sql"), "utf8");
    expect(sql).toContain("project_product_variants");
    expect(sql).toContain("project_product_collections");
    expect(sql).toContain("business_brand_kits");
    expect(sql).toContain("project_form_submissions");
    expect(sql).toContain("'form'");
  });
});
