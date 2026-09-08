import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  cartWhatsAppMessage,
  shopCartCheckoutSchema,
  type ResolvedCartLine,
} from "@/lib/shop/cart-order";

describe("shop cart checkout", () => {
  it("rejects empty carts and invalid product ids", () => {
    expect(shopCartCheckoutSchema.safeParse({ items: [], customerName: "Awa", customerPhone: "221770000000" }).success).toBe(
      false,
    );
    expect(
      shopCartCheckoutSchema.safeParse({
        items: [{ productId: "bad", quantity: 1 }],
        customerName: "Awa",
        customerPhone: "221770000000",
      }).success,
    ).toBe(false);
  });

  it("accepts multi-item checkout without claiming paid", () => {
    const parsed = shopCartCheckoutSchema.parse({
      items: [
        { productId: "11111111-2222-4333-a444-555555555555", quantity: 2 },
        { productId: "11111111-2222-4333-a444-555555555556", quantity: 1 },
      ],
      customerName: "Awa",
      customerPhone: "+221 77 000 00 00",
      paymentPreference: "whatsapp",
    });
    expect(parsed.items).toHaveLength(2);

    const lines: ResolvedCartLine[] = [
      {
        productId: parsed.items[0]!.productId,
        variantId: null,
        variantName: null,
        productName: "Tee",
        priceLabel: "8,000 XOF",
        priceXof: 8000,
        upc: "RECT-TEE-01",
        sku: null,
        quantity: 2,
        lineAmountXof: 16000,
      },
      {
        productId: parsed.items[1]!.productId,
        variantId: null,
        variantName: null,
        productName: "Cap",
        priceLabel: "5,000 XOF",
        priceXof: 5000,
        upc: null,
        sku: "CAP-1",
        quantity: 1,
        lineAmountXof: 5000,
      },
    ];
    const message = cartWhatsAppMessage({
      orderNumber: "ORD-ABCD-00012",
      lines,
      customerName: parsed.customerName,
      customerNote: "",
      paymentPreference: "whatsapp",
    });
    expect(message).toContain("ORD-ABCD-00012");
    expect(message).toContain("2× Tee");
    expect(message).toContain("1× Cap");
    expect(message.toLowerCase()).not.toContain("paid");
  });

  it("ships migration 046 with order items + cart drafts RLS", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/046_shop_cart_order_items.sql"),
      "utf8",
    );
    expect(sql).toContain("shop_order_items");
    expect(sql).toContain("shop_cart_drafts");
    expect(sql).toContain("enable row level security");
    expect(sql).not.toMatch(/for insert/i);
  });
});
