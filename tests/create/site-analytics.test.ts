import { describe, expect, it } from "vitest";
import {
  deviceFromUserAgent,
  siteAnalyticsIngestSchema,
  summarizeSiteAnalytics,
  type SiteAnalyticsEventRow,
} from "@/lib/create/site-analytics";

describe("site analytics", () => {
  it("maps user agents to devices", () => {
    expect(deviceFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("mobile");
    expect(deviceFromUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tablet");
    expect(deviceFromUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X)")).toBe("desktop");
  });

  it("validates ingest payload", () => {
    const ok = siteAnalyticsIngestSchema.safeParse({
      subdomain: "maylecor",
      eventType: "pageview",
      path: "/",
      device: "mobile",
    });
    expect(ok.success).toBe(true);
    const bad = siteAnalyticsIngestSchema.safeParse({ subdomain: "X", eventType: "hack" });
    expect(bad.success).toBe(false);
  });

  it("summarizes views vitals and errors", () => {
    const rows: SiteAnalyticsEventRow[] = [
      {
        id: "1",
        project_id: "p",
        subdomain: "demo",
        event_type: "pageview",
        path: "/",
        device: "mobile",
        metric_name: null,
        metric_value: null,
        message: null,
        meta: {},
        created_at: "2026-09-02T10:00:00.000Z",
      },
      {
        id: "2",
        project_id: "p",
        subdomain: "demo",
        event_type: "pageview",
        path: "/about",
        device: "desktop",
        metric_name: null,
        metric_value: null,
        message: null,
        meta: {},
        created_at: "2026-09-02T11:00:00.000Z",
      },
      {
        id: "3",
        project_id: "p",
        subdomain: "demo",
        event_type: "vital",
        path: "/",
        device: "mobile",
        metric_name: "LCP",
        metric_value: 2200,
        message: null,
        meta: {},
        created_at: "2026-09-02T10:00:01.000Z",
      },
      {
        id: "4",
        project_id: "p",
        subdomain: "demo",
        event_type: "error",
        path: "/",
        device: "desktop",
        metric_name: null,
        metric_value: null,
        message: "Script error",
        meta: {},
        created_at: "2026-09-02T12:00:00.000Z",
      },
      {
        id: "5",
        project_id: "p",
        subdomain: "demo",
        event_type: "perf",
        path: "/",
        device: "desktop",
        metric_name: "load",
        metric_value: 800,
        message: null,
        meta: {},
        created_at: "2026-09-02T10:00:02.000Z",
      },
    ];
    const summary = summarizeSiteAnalytics(rows, { ok: true, http_status: 200, error_message: null, checked_at: "2026-09-02T09:00:00.000Z" }, 72);
    expect(summary.pageviews).toBe(2);
    expect(summary.uniquePaths).toBe(2);
    expect(summary.byDevice.mobile).toBe(1);
    expect(summary.byDevice.desktop).toBe(1);
    expect(summary.vitals[0]?.name).toBe("LCP");
    expect(summary.perf.avgLoadMs).toBe(800);
    expect(summary.errors[0]?.message).toBe("Script error");
    expect(summary.health.ok).toBe(true);
  });
});
