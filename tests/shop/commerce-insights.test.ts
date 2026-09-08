import { describe, expect, it } from "vitest";
import { buildCommerceAnalytics, formatXof } from "@/lib/shop/commerce-insights";

describe("commerce insights pattern engine", () => {
  const base = {
    rangeDays: 30,
    projectId: "00000000-0000-0000-0000-000000000001",
    now: new Date("2026-09-03T12:00:00.000Z"),
  };

  it("returns honest empty-state insight with no orders", () => {
    const summary = buildCommerceAnalytics({
      ...base,
      orders: [],
      drafts: [],
      pageviews: 0,
    });
    expect(summary.orders.total).toBe(0);
    expect(summary.insights.some((i) => i.id === "no_orders")).toBe(true);
    expect(summary.insights.every((i) => i.what && i.why && i.next)).toBe(true);
  });

  it("flags unpaid revenue risk from real payment_status", () => {
    const summary = buildCommerceAnalytics({
      ...base,
      drafts: [],
      orders: [
        {
          id: "1",
          product_name: "Soap",
          quantity: 2,
          payment_status: "awaiting_payment",
          payment_preference: "paypal",
          status: "pending",
          amount_xof: 4000,
          customer_phone: "+221770000001",
          customer_email: null,
          customer_user_id: null,
          discount_code: null,
          created_at: "2026-09-01T10:00:00.000Z",
        },
        {
          id: "2",
          product_name: "Soap",
          quantity: 1,
          payment_status: "paid",
          payment_preference: "joko",
          status: "contacted",
          amount_xof: 2000,
          customer_phone: "+221770000002",
          customer_email: null,
          customer_user_id: null,
          discount_code: "WELCOME",
          created_at: "2026-09-02T10:00:00.000Z",
        },
      ],
    });
    expect(summary.orders.paid).toBe(1);
    expect(summary.orders.awaitingPayment).toBe(1);
    expect(summary.orders.revenuePaidXof).toBe(2000);
    expect(summary.orders.revenueAtRiskXof).toBe(4000);
    expect(summary.topProducts[0]?.name).toBe("Soap");
    expect(summary.insights.some((i) => i.id === "unpaid_risk")).toBe(true);
    expect(formatXof(4000)).toContain("4");
  });

  it("detects abandonment and repeat customers", () => {
    const summary = buildCommerceAnalytics({
      ...base,
      pageviews: 100,
      drafts: [
        {
          id: "d1",
          status: "open",
          last_seen_at: "2026-09-01T00:00:00.000Z",
          customer_email: "a@b.co",
          customer_phone: null,
        },
        {
          id: "d2",
          status: "open",
          last_seen_at: "2026-09-02T00:00:00.000Z",
          customer_email: null,
          customer_phone: "770000003",
        },
      ],
      orders: [
        {
          id: "1",
          product_name: "Oil",
          quantity: 1,
          payment_status: "unpaid",
          payment_preference: "whatsapp",
          status: "pending",
          amount_xof: 1000,
          customer_phone: "221770000099",
          customer_email: null,
          customer_user_id: null,
          discount_code: null,
          created_at: "2026-08-20T10:00:00.000Z",
        },
        {
          id: "2",
          product_name: "Oil",
          quantity: 1,
          payment_status: "unpaid",
          payment_preference: "whatsapp",
          status: "pending",
          amount_xof: 1000,
          customer_phone: "221770000099",
          customer_email: null,
          customer_user_id: null,
          discount_code: null,
          created_at: "2026-08-25T10:00:00.000Z",
        },
        {
          id: "3",
          product_name: "Oil",
          quantity: 1,
          payment_status: "unpaid",
          payment_preference: "whatsapp",
          status: "pending",
          amount_xof: 1000,
          customer_phone: "221770000088",
          customer_email: null,
          customer_user_id: null,
          discount_code: null,
          created_at: "2026-08-28T10:00:00.000Z",
        },
        {
          id: "4",
          product_name: "Oil",
          quantity: 1,
          payment_status: "unpaid",
          payment_preference: "whatsapp",
          status: "pending",
          amount_xof: 1000,
          customer_phone: "221770000077",
          customer_email: null,
          customer_user_id: null,
          discount_code: null,
          created_at: "2026-09-01T10:00:00.000Z",
        },
        {
          id: "5",
          product_name: "Oil",
          quantity: 1,
          payment_status: "unpaid",
          payment_preference: "whatsapp",
          status: "pending",
          amount_xof: 1000,
          customer_phone: "221770000066",
          customer_email: null,
          customer_user_id: null,
          discount_code: null,
          created_at: "2026-09-02T10:00:00.000Z",
        },
      ],
    });
    expect(summary.carts.openAbandoned).toBe(2);
    expect(summary.customers.repeatKeys).toBe(1);
    expect(summary.traffic.orderPerView).toBe(0.05);
    expect(summary.insights.some((i) => i.id === "abandonment")).toBe(true);
    expect(summary.insights.some((i) => i.id === "repeat_buyers")).toBe(true);
    expect(summary.insights.some((i) => i.id === "whatsapp_heavy")).toBe(true);
  });
});
