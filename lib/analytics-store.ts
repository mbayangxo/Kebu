/**
 * @deprecated Memory-only store analytics — removed from production paths.
 * Use:
 * - site beacons → `site_analytics_events` → `/api/projects/[id]/analytics`
 * - shop orders/carts → `buildCommerceAnalytics` → `/api/projects/[id]/shop-analytics`
 *
 * This file remains only so old imports fail loudly at typecheck if reintroduced.
 */

export type SiteAnalytics = never;

export const analyticsDb = {
  recordView(_slug: string): void {
    throw new Error("analyticsDb removed — use site analytics beacons + Shop → Analytics.");
  },
  recordOrder(_slug: string): void {
    throw new Error("analyticsDb removed — use shop_orders + Shop → Analytics.");
  },
  get(_slug: string): never {
    throw new Error("analyticsDb removed — use /api/projects/[id]/shop-analytics.");
  },
};
