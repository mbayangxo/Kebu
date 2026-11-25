export const SITE_VISIBILITY_MODES = ["public", "private", "coming_soon", "paused"] as const;
export type SiteVisibilityMode = (typeof SITE_VISIBILITY_MODES)[number];
export type SiteVisibilityFields = {
  site_visibility: SiteVisibilityMode | null;
  site_password_enabled: boolean;
  site_launch_at: string | null;
};
export function effectiveSiteVisibility(site: SiteVisibilityFields, now = Date.now()): SiteVisibilityMode {
  const mode = site.site_visibility ?? (site.site_password_enabled ? "private" : "public");
  if (mode === "coming_soon" && site.site_launch_at && Date.parse(site.site_launch_at) <= now) return "public";
  return mode;
}
