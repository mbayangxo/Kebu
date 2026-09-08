import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { shopMessageBodySchema } from "@/lib/shop/messaging";

describe("shop messaging", () => {
  it("rejects empty messages", () => {
    expect(shopMessageBodySchema.safeParse({ body: "" }).success).toBe(false);
  });
  it("accepts a customer message", () => {
    expect(shopMessageBodySchema.parse({ body: "Do you ship to Dakar?" }).body).toContain("Dakar");
  });
  it("ships migration 050", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/050_shop_messaging.sql"), "utf8");
    expect(sql).toContain("shop_message_threads");
    expect(sql).toContain("shop_messages");
    expect(sql).toContain("enable row level security");
  });
});
