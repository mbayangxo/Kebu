import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  giftColumnsForInsert,
  giftPublicPath,
  giftWhatsAppSuffix,
  shopGiftFieldsSchema,
} from "@/lib/shop/gift-order";
import { shopOrderInputSchema } from "@/lib/shop/create-order";
import { shopCartCheckoutSchema } from "@/lib/shop/cart-order";

describe("shop gift / buy-for-someone", () => {
  it("requires recipient when isGift", () => {
    const bad = shopGiftFieldsSchema.safeParse({ isGift: true, recipientName: "" });
    expect(bad.success).toBe(false);

    const ok = shopGiftFieldsSchema.parse({
      isGift: true,
      recipientName: "Awa",
      recipientPhone: "+221771234567",
      giftMessage: "Happy birthday",
    });
    expect(ok.recipientName).toBe("Awa");
  });

  it("builds gift insert columns + path", () => {
    const cols = giftColumnsForInsert({
      isGift: true,
      recipientName: "Awa",
      recipientPhone: "+221771234567",
      giftMessage: "Hi",
    });
    expect(cols.is_gift).toBe(true);
    expect(cols.recipient_name).toBe("Awa");
    expect(String(cols.gift_public_id)).toMatch(/^gift_/);
    expect(giftPublicPath("gift_abc")).toBe("/g/gift_abc");
    expect(giftWhatsAppSuffix({ isGift: true, recipientName: "Awa", recipientPhone: "123" })).toMatch(
      /Gift for/,
    );
  });

  it("accepts gift on single + cart schemas", () => {
    const single = shopOrderInputSchema.parse({
      productId: "11111111-1111-4111-8111-111111111111",
      customerName: "Buyer",
      customerPhone: "+221770000000",
      isGift: true,
      recipientName: "Awa",
      recipientPhone: "+221771111111",
    });
    expect(single.isGift).toBe(true);

    const cart = shopCartCheckoutSchema.parse({
      items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 1 }],
      customerName: "Buyer",
      customerPhone: "+221770000000",
      isGift: false,
    });
    expect(cart.isGift).toBe(false);
  });

  it("ships migration 059", () => {
    const sql = readFileSync(
      join(process.cwd(), "docs/migrations-to-apply/059_shop_gift_orders.sql"),
      "utf8",
    );
    expect(sql).toContain("is_gift");
    expect(sql).toContain("gift_public_id");
    expect(sql).toContain("shop_orders_gift_requires_recipient");
  });
});
