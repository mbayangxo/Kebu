/** Signed-in navigation — grouped by workspace. One account, connected products. */

export type NavItem = { label: string; href: string; exact?: boolean };

export const PRODUCT_NAV = {
  /** Visible in every workspace */
  account: [{ label: "My Account", href: "/account" }] satisfies NavItem[],
  opportunity: [{ label: "Opportunity OS", href: "/opportunity" }] satisfies NavItem[],

  /** Kebu — explore, learn, personalize */
  kebu: [
    { label: "Your Kebu", href: "/dashboard", exact: true },
    { label: "Personalize", href: "/welcome" },
  ] satisfies NavItem[],

  /** Kebu Business — identity, builder, create, trade */
  businessHome: [
    { label: "Business home", href: "/business", exact: true },
    { label: "Register business", href: "/business/register" },
    { label: "KA Score", href: "/ka-score" },
  ] satisfies NavItem[],
  builder: [
    { label: "Builder home", href: "/create", exact: true },
    { label: "Templates", href: "/create/templates" },
    { label: "My sites", href: "/create/sites" },
    { label: "Kebu Domains", href: "/create/domains" },
    { label: "New site", href: "/create/new" },
  ] satisfies NavItem[],
  /** Shop — separate from website builder (Shopify-style) */
  shop: [
    { label: "Kebu Shop", href: "/shop", exact: true },
  ] satisfies NavItem[],
  create: [
    { label: "Kebu Create", href: "/studio", exact: true },
    { label: "New design", href: "/studio/new" },
  ] satisfies NavItem[],
  alkebulan: [{ label: "Alkebulan", href: "/b2b" }] satisfies NavItem[],

  /** Kebu Studio — focused design workspace */
  studio: [
    { label: "Studio home", href: "/studio", exact: true },
    { label: "New design", href: "/studio/new" },
  ] satisfies NavItem[],
} as const;
