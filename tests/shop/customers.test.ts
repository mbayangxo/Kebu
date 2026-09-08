import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { shopOrderInputSchema } from "@/lib/shop/create-order";

describe("shop customers email capture", () => {
  it("accepts optional customerEmail on place order", () => {
    const parsed = shopOrderInputSchema.parse({
      productId: "11111111-2222-4333-a444-555555555555",
      customerName: "Awa",
      customerPhone: "+221770000000",
      customerEmail: "awa@example.com",
      quantity: 1,
    });
    expect(parsed.customerEmail).toBe("awa@example.com");
  });

  it("treats empty email as omitted", () => {
    const parsed = shopOrderInputSchema.parse({
      productId: "11111111-2222-4333-a444-555555555555",
      customerName: "Awa",
      customerPhone: "+221770000000",
      customerEmail: "",
      quantity: 1,
    });
    expect(parsed.customerEmail).toBeUndefined();
  });

  it("ships migration 042 for order email + list source", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/042_shop_customers_email.sql"),
      "utf8",
    );
    expect(sql).toContain("customer_email");
    expect(sql).toContain("'order'");
  });
});
