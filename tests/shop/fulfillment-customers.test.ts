import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildTrackingUrl,
  carrierLabel,
  isShopCarrierId,
  SHOP_CARRIERS,
} from "@/lib/shop/carriers";
import { trackingMessage } from "@/lib/shop/fulfillment";
import { customerKeyFromContact } from "@/lib/shop/customer-profiles";
import { SHOP_ORDER_STATUSES } from "@/lib/shop/create-order";

describe("shop carriers + tracking", () => {
  it("lists Africa-relevant and global carriers", () => {
    expect(SHOP_CARRIERS.some((c) => c.id === "dhl")).toBe(true);
    expect(SHOP_CARRIERS.some((c) => c.id === "yango")).toBe(true);
    expect(SHOP_CARRIERS.some((c) => c.id === "pickup")).toBe(true);
    expect(isShopCarrierId("fedex")).toBe(true);
    expect(isShopCarrierId("fake")).toBe(false);
    expect(carrierLabel("dhl")).toBe("DHL");
  });

  it("builds public tracking URLs", () => {
    expect(buildTrackingUrl("dhl", "1234567890")).toContain("1234567890");
    expect(buildTrackingUrl("ups", "1Z999")).toContain("1Z999");
    expect(buildTrackingUrl("pickup", "x")).toBeNull();
    expect(buildTrackingUrl("other", "")).toBeNull();
  });

  it("composes customer track message", () => {
    const msg = trackingMessage({
      shopName: "May Shop",
      orderLabel: "ORD-1",
      carrier: "dhl",
      trackingNumber: "ABC",
      trackingUrl: "https://example.com/t/ABC",
    });
    expect(msg).toMatch(/May Shop/);
    expect(msg).toMatch(/ORD-1/);
    expect(msg).toMatch(/ABC/);
    expect(msg).toMatch(/Track here/);
  });
});

describe("shop customer profiles", () => {
  it("keys customers by email then phone", () => {
    expect(customerKeyFromContact("+221770000000", "awa@example.com")).toBe("e:awa@example.com");
    expect(customerKeyFromContact("+221 77 000 00 00", null)).toBe("p:221770000000");
    expect(customerKeyFromContact(null, null)).toBeNull();
  });

  it("allows archived order status", () => {
    expect(SHOP_ORDER_STATUSES).toContain("archived");
  });

  it("ships migration 054 for fulfillment + shop_customers", () => {
    const sql = readFileSync(
      join(process.cwd(), "docs/migrations-to-apply/054_shop_fulfillment_customers.sql"),
      "utf8",
    );
    expect(sql).toContain("tracking_number");
    expect(sql).toContain("carrier");
    expect(sql).toContain("shop_customers");
    expect(sql).toContain("lifetime_amount_xof");
    expect(sql).toContain("liked_products");
    expect(sql).toContain("'archived'");
  });
});
