import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { shopAccountPath, shopCustomerProfileSchema } from "@/lib/shop/customer-account";

describe("shopper customer accounts", () => {
  it("builds account path for a live subdomain", () => {
    expect(shopAccountPath("rect")).toBe("/sites/rect/account");
  });

  it("accepts profile fields", () => {
    expect(shopCustomerProfileSchema.parse({ displayName: "Awa", phone: "+221770000000" })).toEqual({
      displayName: "Awa",
      phone: "+221770000000",
    });
  });

  it("ships migration 048 with customer_user_id RLS", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/048_shop_customer_accounts.sql"),
      "utf8",
    );
    expect(sql).toContain("customer_user_id");
    expect(sql).toContain("shop_customer_profiles");
    expect(sql).toContain("Customers read own shop_orders");
    expect(sql).toContain("enable row level security");
  });
});
