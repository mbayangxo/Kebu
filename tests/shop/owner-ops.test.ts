import { describe, expect, it } from "vitest";
import { resolveOrderChannel } from "@/lib/shop/notify-owner";
import { buildCommerceAnalytics } from "@/lib/shop/commerce-insights";

describe("resolveOrderChannel", () => {
  it("prefers client share / qr / social hints", () => {
    expect(resolveOrderChannel({ clientChannel: "qr", paymentPreference: "whatsapp" })).toBe("qr");
    expect(resolveOrderChannel({ clientChannel: "share" })).toBe("share");
    expect(resolveOrderChannel({ clientChannel: "social" })).toBe("social");
  });

  it("maps payment preference when no client hint", () => {
    expect(resolveOrderChannel({ paymentPreference: "whatsapp" })).toBe("whatsapp");
    expect(resolveOrderChannel({ paymentPreference: "mobile_money" })).toBe("wave");
    expect(resolveOrderChannel({ paymentPreference: "joko" })).toBe("joko");
    expect(resolveOrderChannel({})).toBe("web");
  });
});

describe("commerce insights order + visitor sources", () => {
  it("aggregates channels and visitor buckets", () => {
    const summary = buildCommerceAnalytics({
      rangeDays: 30,
      projectId: "00000000-0000-0000-0000-000000000001",
      now: new Date("2026-09-07T12:00:00.000Z"),
      drafts: [],
      visitorBuckets: {
        countries: { SN: 8, FR: 2 },
        referrers: { "wa.me": 5, direct: 5 },
        devices: { mobile: 9, desktop: 1 },
      },
      orders: [
        {
          id: "1",
          product_name: "Boubou",
          quantity: 1,
          payment_status: "unpaid",
          payment_preference: "whatsapp",
          status: "pending",
          amount_xof: 25000,
          customer_phone: "+221770000001",
          customer_email: null,
          customer_user_id: null,
          discount_code: null,
          channel: "qr",
          created_at: "2026-09-05T10:00:00.000Z",
        },
        {
          id: "2",
          product_name: "Boubou",
          quantity: 1,
          payment_status: "paid",
          payment_preference: "joko",
          status: "contacted",
          amount_xof: 25000,
          customer_phone: "+221770000002",
          customer_email: null,
          customer_user_id: null,
          discount_code: null,
          channel: "web",
          created_at: "2026-09-06T10:00:00.000Z",
        },
      ],
    });

    expect(summary.orderSources.map((s) => s.source).sort()).toEqual(["qr", "web"]);
    expect(summary.visitorSources.countries[0]?.country).toBe("SN");
    expect(summary.visitorSources.referrers.some((r) => r.referrer === "wa.me")).toBe(true);
  });
});
