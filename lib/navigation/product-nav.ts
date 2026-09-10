/** Signed-in navigation — grouped by workspace. One account, connected products. */

export const MY_SITES_HREF = "/my-sites" as const;

export function mySiteDetailHref(projectId: string): string {
  return `${MY_SITES_HREF}/${projectId}`;
}

/** Scope business nav to active Kebu ID when one is selected. */
export function businessNavHref(href: string, activeBusinessId: string | null): string {
  if (!activeBusinessId) return href;
  if (href === "/business" || href === "/business/") return `/business/${activeBusinessId}`;
  if (href.startsWith("/business/register")) return href;
  if (href.startsWith("/ka-score")) return `/ka-score?business=${activeBusinessId}`;
  return href;
}

export type NavItem = { label: string; href: string; exact?: boolean };

/**
 * Product IA (2026-09-08):
 * - My Account = avatar top-right only (not a sidebar row)
 * - My KEBU = your space / sites / shop (not “Builder” / “Create”)
 * - Aesthetic Gallery = site looks store
 * - Kebu Studio = graphics/video
 * - Alkebulan = B2B — separate, not under Business
 * - Register business stays on Opportunity / signup — not My KEBU chrome
 */
export const PRODUCT_NAV = {
  opportunity: [{ label: "Opportunity OS", href: "/opportunity" }] satisfies NavItem[],

  kebu: [
    { label: "Your Kebu", href: "/dashboard", exact: true },
    { label: "Personalize", href: "/welcome" },
  ] satisfies NavItem[],

  /** Your operating space — businesses first, then shared pulse */
  myKebu: [
    { label: "My Businesses", href: "/business", exact: true },
    { label: "Pulse", href: "/business?tab=pulse" },
    { label: "My Sites", href: MY_SITES_HREF },
    { label: "Messages", href: "/messages" },
    { label: "KA Score", href: "/ka-score" },
  ] satisfies NavItem[],

  /** Aesthetic store — $5 themes; Build a site is secondary */
  aesthetics: [
    { label: "Aesthetic Gallery", href: "/create/aesthetics", exact: true },
    { label: "Build a site", href: "/create/new" },
  ] satisfies NavItem[],

  shop: [{ label: "Kebu Shop", href: "/shop", exact: true }] satisfies NavItem[],

  studio: [
    { label: "Kebu Studio", href: "/studio", exact: true },
    { label: "New design", href: "/studio/new" },
    { label: "Brand DNA", href: "/studio/brand" },
    { label: "Campaigns", href: "/studio/campaigns" },
  ] satisfies NavItem[],

  /** Continent B2B — not under My KEBU */
  alkebulan: [{ label: "Alkebulan", href: "/b2b" }] satisfies NavItem[],

  /** @deprecated use myKebu — kept for any leftover imports */
  businessHome: [
    { label: "My Businesses", href: "/business", exact: true },
    { label: "My Sites", href: MY_SITES_HREF },
    { label: "KA Score", href: "/ka-score" },
  ] satisfies NavItem[],
  /** @deprecated use aesthetics */
  builder: [
    { label: "Aesthetic Gallery", href: "/create/aesthetics", exact: true },
    { label: "My Sites", href: MY_SITES_HREF },
    { label: "Build a site", href: "/create/new" },
  ] satisfies NavItem[],
  /** @deprecated use studio */
  create: [
    { label: "Kebu Studio", href: "/studio", exact: true },
    { label: "New design", href: "/studio/new" },
    { label: "Brand DNA", href: "/studio/brand" },
    { label: "Campaigns", href: "/studio/campaigns" },
  ] satisfies NavItem[],
  account: [{ label: "My Account", href: "/account" }] satisfies NavItem[],
} as const;
