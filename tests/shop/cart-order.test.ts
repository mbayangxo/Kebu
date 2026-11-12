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

  it("accepts a shippingOptionId as an id only — the schema has no field for a client-supplied price", () => {
    const base = {
      items: [{ productId: "11111111-2222-4333-a444-555555555555", quantity: 1 }],
      customerName: "Awa",
      customerPhone: "221770000000",
    };
    const withValidId = shopCartCheckoutSchema.safeParse({
      ...base,
      shippingOptionId: "99999999-8888-4777-a666-555555555555",
    });
    expect(withValidId.success).toBe(true);

    const withBadId = shopCartCheckoutSchema.safeParse({ ...base, shippingOptionId: "not-a-uuid" });
    expect(withBadId.success).toBe(false);

    // The only shipping-related input accepted is an id — there is no key
    // through which a client could submit its own shipping amount; the real
    // price always comes from a server-side lookup (resolveShippingOptionForOrder).
    const sneakAmount = shopCartCheckoutSchema.safeParse({
      ...base,
      shippingOptionId: "99999999-8888-4777-a666-555555555555",
      shippingAmountXof: 1,
    });
    expect(sneakAmount.success).toBe(true); // parses fine...
    if (sneakAmount.success) {
      expect("shippingAmountXof" in sneakAmount.data).toBe(false); // ...but the extra field is stripped, never read.
    }
  });

  it("points the shipping-option-columns-missing error at a migration file that actually exists with that name", () => {
    // Regression: the error string used to cite timestamp 20261103130000, which belonged to
    // shop_shipping_options.sql until the Nov 3 daily sweep renamed it to 20261103135000 to
    // resolve a collision with security_events_log.sql — this file's own error string was
    // never updated, so it pointed at the wrong migration (a different table entirely).
    const source = readFileSync(join(process.cwd(), "lib/shop/cart-order.ts"), "utf8");
    const match = source.match(/Shipping option columns missing\. Apply migration (\S+\.sql)\./);
    expect(match).not.toBeNull();
    const citedFilename = match![1];
    expect(citedFilename).not.toContain("20261103130000"); // the stale, now-wrong timestamp
    const migrationPath = join(process.cwd(), "supabase/migrations", citedFilename);
    expect(() => readFileSync(migrationPath, "utf8")).not.toThrow();
    expect(readFileSync(migrationPath, "utf8")).toContain("shop_shipping_options");
  });

  it("ships migration 046 with order items + cart drafts RLS", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations_archive/legacy/046_shop_cart_order_items.sql"),
      "utf8",
    );
    expect(sql).toContain("shop_order_items");
    expect(sql).toContain("shop_cart_drafts");
    expect(sql).toContain("enable row level security");
    expect(sql).not.toMatch(/for insert/i);
  });
});
