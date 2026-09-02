/**
 * Platform law: every site rendered by Kebu SiteRenderer must be responsive.
 * Templates (May Lecor, K-Direction, future) inherit this — do not invent fixed desktop-only layouts.
 */
export const KEBU_SITE_ROOT_CLASS = "kebu-site";

export const KEBU_SITE_RESPONSIVE_BREAKPOINTS = {
  mobileMax: 640,
  tabletMax: 1024,
} as const;

/** CSS module path imported by SiteRenderer so future templates get the same base. */
export const KEBU_SITE_RESPONSIVE_CSS = "@/app/components/create/kebu-site-responsive.css";
