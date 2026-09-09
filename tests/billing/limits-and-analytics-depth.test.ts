import { describe, expect, it } from "vitest";
import { bestTierAmong } from "@/lib/billing/enforce-limits";
import { summarizeSiteAnalytics, type SiteAnalyticsEventRow } from "@/lib/create/site-analytics";

describe("billing limit helpers", () => {
  it("picks highest owner tier", () => {
    expect(bestTierAmong(["free", "shop", "starter"])).toBe("shop");
    expect(bestTierAmong([])).toBe("free");
    expect(bestTierAmong(["business", "pro"])).toBe("pro");
  });
});

describe("analytics depth", () => {
  it("summarizes top paths, referrers, and countries", () => {
    const rows: SiteAnalyticsEventRow[] = [
      {
        id: "1",
        project_id: "p",
        subdomain: "demo",
        event_type: "pageview",
        path: "/shop",
        device: "mobile",
        metric_name: null,
        metric_value: null,
        message: null,
        meta: { referrer: "https://www.instagram.com/x", country: "SN" },
        created_at: "2026-09-08T10:00:00.000Z",
      },
      {
        id: "2",
        project_id: "p",
        subdomain: "demo",
        event_type: "pageview",
        path: "/shop",
        device: "desktop",
        metric_name: null,
        metric_value: null,
        message: null,
        meta: { referrer: "https://instagram.com/y", country: "SN" },
        created_at: "2026-09-08T11:00:00.000Z",
      },
      {
        id: "3",
        project_id: "p",
        subdomain: "demo",
        event_type: "pageview",
        path: "/",
        device: "mobile",
        metric_name: null,
        metric_value: null,
        message: null,
        meta: { country: "GH" },
        created_at: "2026-09-08T12:00:00.000Z",
      },
    ];
    const s = summarizeSiteAnalytics(rows, null, 72);
    expect(s.pageviews).toBe(3);
    expect(s.topPaths[0]).toEqual({ path: "/shop", views: 2 });
    expect(s.topReferrers[0]?.referrer).toContain("instagram");
    expect(s.topCountries.find((c) => c.country === "SN")?.views).toBe(2);
  });
});
