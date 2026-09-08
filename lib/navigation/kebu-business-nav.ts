/**
 * Kebu Business — merchant operating system navigation (compatibility map).
 * Only items with `href` should be linked in UI; others stay visible with honest status.
 */

export type KebuBusinessNavStatus = "live" | "partial" | "not_implemented";

export type KebuBusinessNavItem = {
  id: string;
  label: string;
  status: KebuBusinessNavStatus;
  href?: string;
  /** Same-page anchor on /my-sites/[id] */
  anchor?: string;
};

export type KebuBusinessNavSection = {
  id: string;
  label: string;
  /** Top-level section without children (Domains, Email, Cloud) */
  solo?: boolean;
  status?: KebuBusinessNavStatus;
  href?: string;
  anchor?: string;
  items?: KebuBusinessNavItem[];
};

export type KebuBusinessNavContext = {
  projectId: string;
  businessId: string | null;
};

export function buildKebuBusinessNav(ctx: KebuBusinessNavContext): KebuBusinessNavSection[] {
  const { projectId, businessId } = ctx;
  const shop = `/shop/${projectId}`;
  const editor = `/create/${projectId}`;
  const home = `/my-sites/${projectId}`;
  const biz = businessId ? `/business/${businessId}` : "/business";
  const aiNew = `/create/new?mode=ai${businessId ? `&businessId=${businessId}` : ""}`;
  const photosNew = `/create/new?mode=photos${businessId ? `&businessId=${businessId}` : ""}`;

  return [
    {
      id: "home",
      label: "Home",
      solo: true,
      status: "live",
      href: home,
    },
    {
      id: "website",
      label: "Website",
      items: [
        { id: "website-overview", label: "Overview", status: "partial", href: home },
        { id: "website-pages", label: "Pages", status: "live", href: editor },
        { id: "website-navigation", label: "Navigation", status: "partial", href: editor },
        { id: "website-design-system", label: "Design System", status: "partial", anchor: "templates" },
        { id: "website-sections", label: "Sections", status: "live", href: editor },
        { id: "website-media", label: "Media", status: "partial", href: editor },
        { id: "website-seo", label: "SEO", status: "partial", anchor: "domain" },
        { id: "website-forms", label: "Forms", status: "live", href: editor },
        { id: "website-blog", label: "Blog", status: "live", href: editor },
        { id: "website-settings", label: "Settings", status: "partial", anchor: "templates" },
      ],
    },
    {
      id: "ai-builder",
      label: "AI Builder",
      items: [
        { id: "ai-idea", label: "Create from idea", status: "partial", href: aiNew },
        { id: "ai-photos", label: "Create from photos", status: "live", href: photosNew },
        { id: "ai-redesign", label: "Redesign", status: "partial", href: editor },
        { id: "ai-section", label: "Add section", status: "live", href: editor },
        { id: "ai-style", label: "Change style", status: "partial", anchor: "templates" },
        { id: "ai-copy", label: "Rewrite copy", status: "partial", href: editor },
        { id: "ai-optimize", label: "Optimize page", status: "not_implemented" },
      ],
    },
    {
      id: "shop",
      label: "Shop",
      items: [
        { id: "shop-overview", label: "Overview", status: "live", href: shop },
        { id: "shop-products", label: "Products", status: "live", href: `${shop}?tab=products` },
        { id: "shop-collections", label: "Collections", status: "live", href: `${shop}?tab=collections` },
        { id: "shop-inventory", label: "Inventory", status: "live", href: `${shop}?tab=products` },
        { id: "shop-orders", label: "Orders", status: "live", href: `${shop}?tab=orders` },
        { id: "shop-customers", label: "Customers", status: "live", href: `${shop}?tab=customers` },
        { id: "shop-discounts", label: "Discounts", status: "live", href: `${shop}?tab=discounts` },
        { id: "shop-gift-cards", label: "Gift cards", status: "live", href: `${shop}?tab=gift-cards` },
        { id: "shop-subscriptions", label: "Subscriptions", status: "live", href: `${shop}?tab=subscriptions` },
        { id: "shop-reviews", label: "Reviews", status: "live", href: `${shop}?tab=reviews` },
        { id: "shop-checkout", label: "Checkout", status: "partial", href: `${shop}?tab=payments` },
      ],
    },
    {
      id: "marketing",
      label: "Marketing",
      items: [
        { id: "mkt-campaigns", label: "Campaigns", status: "partial", href: biz },
        { id: "mkt-email", label: "Email", status: "partial", href: biz },
        { id: "mkt-social", label: "Social", status: "partial", href: "/studio" },
        { id: "mkt-reach", label: "Kebu Reach", status: "live", href: "/reach" },
        { id: "mkt-affiliates", label: "Affiliates", status: "not_implemented" },
        { id: "mkt-creator", label: "Creator campaigns", status: "partial", href: biz },
        { id: "mkt-promotions", label: "Promotions", status: "live", href: `${shop}?tab=discounts` },
      ],
    },
    {
      id: "analytics",
      label: "Analytics",
      items: [
        { id: "an-overview", label: "Overview", status: "partial", href: `${shop}?tab=analytics` },
        { id: "an-sales", label: "Sales", status: "partial", href: `${shop}?tab=analytics` },
        { id: "an-customers", label: "Customers", status: "partial", href: `${shop}?tab=customers` },
        { id: "an-products", label: "Products", status: "partial", href: `${shop}?tab=analytics` },
        { id: "an-traffic", label: "Traffic", status: "partial", href: home, anchor: "traffic" },
        { id: "an-conversion", label: "Conversion", status: "live", href: `${shop}?tab=analytics` },
        { id: "an-retention", label: "Retention", status: "not_implemented" },
        { id: "an-profit", label: "Profitability", status: "not_implemented" },
        { id: "an-ai", label: "AI Insights", status: "partial", href: `${shop}?tab=analytics` },
      ],
    },
    {
      id: "business",
      label: "Business",
      items: [
        { id: "biz-id", label: "Kebu ID", status: businessId ? "live" : "partial", href: biz },
        { id: "biz-score", label: "Kebu Score", status: "partial", href: "/ka-score" },
        { id: "biz-team", label: "Team", status: businessId ? "live" : "partial", href: biz },
        { id: "biz-docs", label: "Documents", status: "partial", href: "/business/register" },
        { id: "biz-profile", label: "Business profile", status: "partial", href: biz },
        { id: "biz-opps", label: "Opportunities", status: "partial", href: "/opportunity" },
      ],
    },
    {
      id: "growth",
      label: "Growth",
      items: [
        { id: "gr-markets", label: "Market opportunities", status: "partial", href: "/opportunity" },
        { id: "gr-africa", label: "New African markets", status: "partial", href: "/opportunity/countries" },
        { id: "gr-export", label: "Export opportunities", status: "not_implemented" },
        { id: "gr-competitors", label: "Competitors", status: "not_implemented" },
        { id: "gr-recs", label: "Recommendations", status: "partial", href: "/opportunity" },
      ],
    },
    {
      id: "domains",
      label: "Domains",
      solo: true,
      status: "partial",
      anchor: "domain",
      href: "/create/domains",
    },
    {
      id: "email",
      label: "Email",
      solo: true,
      status: "not_implemented",
    },
    {
      id: "cloud",
      label: "Cloud",
      solo: true,
      status: "not_implemented",
    },
  ];
}

export function resolveKebuBusinessNavHref(
  item: Pick<KebuBusinessNavItem, "href" | "anchor">,
  homePath: string,
): string | undefined {
  if (item.href) return item.href;
  if (item.anchor) return `${homePath}#${item.anchor}`;
  return undefined;
}

/** Count live + partial vs not_implemented for header stats */
export function kebuBusinessNavStats(sections: KebuBusinessNavSection[]) {
  let live = 0;
  let partial = 0;
  let notImplemented = 0;

  for (const section of sections) {
    if (section.solo) {
      const s = section.status ?? "not_implemented";
      if (s === "live") live += 1;
      else if (s === "partial") partial += 1;
      else notImplemented += 1;
      continue;
    }
    for (const item of section.items ?? []) {
      if (item.status === "live") live += 1;
      else if (item.status === "partial") partial += 1;
      else notImplemented += 1;
    }
  }

  return { live, partial, notImplemented, total: live + partial + notImplemented };
}
