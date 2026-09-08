import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { shopOrderInputSchema, shopOrderWhatsAppMessage } from "@/lib/shop/create-order";

describe("shop orders", () => {
  it("rejects invalid customer payloads", () => {
    expect(shopOrderInputSchema.safeParse({}).success).toBe(false);
    expect(
      shopOrderInputSchema.safeParse({
        productId: "not-a-uuid",
        customerName: "Awa",
        customerPhone: "221770000000",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid order and never claims payment in the WhatsApp copy", () => {
    const parsed = shopOrderInputSchema.parse({
        productId: "11111111-2222-4333-a444-555555555555",
      customerName: "Awa",
      customerPhone: "+221 77 000 00 00",
      quantity: 2,
      customerNote: "Red size M",
    });
    const message = shopOrderWhatsAppMessage({
      orderId: parsed.productId,
      productName: "Tee",
      quantity: parsed.quantity,
      priceLabel: "8,000 XOF",
      customerName: parsed.customerName,
      customerNote: parsed.customerNote,
    });
    expect(message).toContain("2× Tee");
    expect(message.toLowerCase()).not.toContain("paid");
  });

  it("includes payment preference in WhatsApp copy without claiming paid", () => {
    const parsed = shopOrderInputSchema.parse({
      productId: "11111111-2222-4333-a444-555555555555",
      customerName: "Awa",
      customerPhone: "+221 77 000 00 00",
      quantity: 1,
      paymentPreference: "card",
    });
    const message = shopOrderWhatsAppMessage({
      orderId: parsed.productId,
      productName: "Tee",
      quantity: parsed.quantity,
      priceLabel: "8,000 XOF",
      customerName: parsed.customerName,
      customerNote: "",
      paymentPreference: parsed.paymentPreference,
    });
    expect(message).toContain("Pay preference: Debit / credit card");
    expect(message.toLowerCase()).not.toContain("paid");
  });

  it("ships migration 039 with RLS (no public insert)", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/039_shop_orders.sql"), "utf8");
    expect(sql).toContain("create table if not exists public.shop_orders");
    expect(sql).toContain("Owners read shop_orders");
    expect(sql).toContain("enable row level security");
    expect(sql.toLowerCase()).not.toContain("for insert");
  });
});
