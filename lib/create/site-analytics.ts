import { z } from "zod";
import type { BuilderDevice } from "@/lib/create/builder-device";

export const siteAnalyticsEventTypeSchema = z.enum([
  "pageview",
  "vital",
  "error",
  "perf",
  "product_view",
  "add_to_cart",
  "checkout_start",
  "purchase",
]);

export const siteAnalyticsIngestSchema = z.object({
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(2)
    .max(48),
  eventType: siteAnalyticsEventTypeSchema,
  path: z.string().trim().max(500).default("/"),
  device: z.enum(["desktop", "tablet", "mobile"]).optional(),
  metricName: z.string().trim().max(40).optional(),
  metricValue: z.number().finite().optional(),
  message: z.string().trim().max(500).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type SiteAnalyticsIngest = z.infer<typeof siteAnalyticsIngestSchema>;

export type SiteAnalyticsEventRow = {
  id: string;
  project_id: string;
  subdomain: string;
  event_type: string;
  path: string;
  device: string | null;
  metric_name: string | null;
  metric_value: number | null;
  message: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type SiteAnalyticsSummary = {
  rangeHours: number;
  pageviews: number;
  uniquePaths: number;
  byDevice: Record<BuilderDevice, number>;
  byDay: Array<{ day: string; views: number }>;
  topPaths: Array<{ path: string; views: number }>;
  topReferrers: Array<{ referrer: string; views: number }>;
  topCountries: Array<{ country: string; views: number }>;
  vitals: Array<{ name: string; avg: number; samples: number }>;
  perf: {
    avgLoadMs: number | null;
    samples: number;
  };
  errors: Array<{
    id: string;
    message: string;
    path: string;
    createdAt: string;
  }>;
  health: {
    ok: boolean | null;
    httpStatus: number | null;
    errorMessage: string | null;
    checkedAt: string | null;
  };
};

export function deviceFromUserAgent(ua: string): BuilderDevice {
  const lower = ua.toLowerCase();
  if (/ipad|tablet|kindle|playbook|silk|(android(?!.*mobile))/.test(lower)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(lower)) return "mobile";
  return "desktop";
}

export function summarizeSiteAnalytics(
  rows: SiteAnalyticsEventRow[],
  health: {
    ok: boolean | null;
    http_status: number | null;
    error_message: string | null;
    checked_at: string | null;
  } | null,
  rangeHours: number,
): SiteAnalyticsSummary {
  const byDevice: Record<BuilderDevice, number> = { desktop: 0, tablet: 0, mobile: 0 };
  const pathSet = new Set<string>();
  const dayMap = new Map<string, number>();
  const pathMap = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const vitalMap = new Map<string, { sum: number; n: number }>();
  let pageviews = 0;
  let loadSum = 0;
  let loadN = 0;
  const errors: SiteAnalyticsSummary["errors"] = [];

  for (const row of rows) {
    if (row.event_type === "pageview") {
      pageviews += 1;
      const path = row.path || "/";
      pathSet.add(path);
      pathMap.set(path, (pathMap.get(path) ?? 0) + 1);
      const device = (row.device as BuilderDevice | null) ?? "desktop";
      if (device in byDevice) byDevice[device] += 1;
      const day = row.created_at.slice(0, 10);
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
      const meta = row.meta ?? {};
      const ref =
        typeof meta.referrer === "string"
          ? meta.referrer
          : typeof meta.referer === "string"
            ? meta.referer
            : "";
      if (ref) {
        try {
          const host = new URL(ref).hostname.replace(/^www\./, "") || ref.slice(0, 80);
          referrerMap.set(host, (referrerMap.get(host) ?? 0) + 1);
        } catch {
          referrerMap.set(ref.slice(0, 80), (referrerMap.get(ref.slice(0, 80)) ?? 0) + 1);
        }
      }
      const country =
        typeof meta.country === "string"
          ? meta.country
          : typeof meta.cfCountry === "string"
            ? meta.cfCountry
            : "";
      if (country) countryMap.set(country, (countryMap.get(country) ?? 0) + 1);
    }
    if (row.event_type === "vital" && row.metric_name && typeof row.metric_value === "number") {
      const cur = vitalMap.get(row.metric_name) ?? { sum: 0, n: 0 };
      cur.sum += row.metric_value;
      cur.n += 1;
      vitalMap.set(row.metric_name, cur);
    }
    if (row.event_type === "perf" && row.metric_name === "load" && typeof row.metric_value === "number") {
      loadSum += row.metric_value;
      loadN += 1;
    }
    if (row.event_type === "error" && row.message) {
      errors.push({
        id: row.id,
        message: row.message,
        path: row.path || "/",
        createdAt: row.created_at,
      });
    }
  }

  const byDay = [...dayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, views]) => ({ day, views }));

  const vitals = [...vitalMap.entries()].map(([name, { sum, n }]) => ({
    name,
    avg: Math.round((sum / Math.max(1, n)) * 100) / 100,
    samples: n,
  }));

  return {
    rangeHours,
    pageviews,
    uniquePaths: pathSet.size,
    byDevice,
    byDay,
    topPaths: [...pathMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([path, views]) => ({ path, views })),
    topReferrers: [...referrerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([referrer, views]) => ({ referrer, views })),
    topCountries: [...countryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([country, views]) => ({ country, views })),
    vitals,
    perf: {
      avgLoadMs: loadN ? Math.round(loadSum / loadN) : null,
      samples: loadN,
    },
    errors: errors.slice(0, 40),
    health: {
      ok: health?.ok ?? null,
      httpStatus: health?.http_status ?? null,
      errorMessage: health?.error_message ?? null,
      checkedAt: health?.checked_at ?? null,
    },
  };
}
