/**
 * Kebu Business — merchant OS navigation.
 * Modeled on Shopify admin: flat primary items + accordion groups
 * (Sales channels / Online Store). Children only visible when the parent is open.
 *
 * Only items with `href` should be linked; others stay honest with status.
 */

export type KebuBusinessNavStatus = "live" | "partial" | "not_implemented";

export type KebuBusinessNavAction = "open-shop";

export type KebuBusinessNavItem = {
  id: string;
  label: string;
  status: KebuBusinessNavStatus;
  href?: string;
  /** Same-page anchor on /my-sites/[id] */
  anchor?: string;
  /** Client action instead of navigation (e.g. POST open shop). */
  action?: KebuBusinessNavAction;
};

export type KebuBusinessNavSection = {
  id: string;
  label: string;
  /** Top-level row without children (Home, Settings) */
  solo?: boolean;
  status?: KebuBusinessNavStatus;
  href?: string;
  anchor?: string;
  items?: KebuBusinessNavItem[];
  /** Visual group label above this block (e.g. Sales channels) */
  groupLabel?: string;
};

export type KebuBusinessNavContext = {
  projectId: string;
  businessId: string | null;
  /** Shop is opt-in — hide commerce solos when false. */
  shopOpened?: boolean;
};

export function buildKebuBusinessNav(ctx: KebuBusinessNavContext): KebuBusinessNavSection[] {
  const { projectId, businessId, shopOpened = false } = ctx;
  const shop = `/shop/${projectId}`;
  const editor = `/create/${projectId}`;
  const home = `/my-sites/${projectId}`;
  const biz = businessId ? `/business/${businessId}` : "/business?tab=businesses";
  const aesthetics = "/create/aesthetics";
  const themes = `/create/${projectId}/themes`;

  const sections: KebuBusinessNavSection[] = [
    {
      id: "home",
      label: "Home",
      solo: true,
      status: "live",
      href: home,
    },
  ];

  if (shopOpened) {
    sections.push(
      {
        id: "orders",
        label: "Orders",
        solo: true,
        status: "live",
        href: `${shop}?tab=orders`,
      },
      {
        id: "products",
        label: "Products",
        solo: true,
        status: "live",
        href: `${shop}?tab=products`,
      },
      {
        id: "customers",
        label: "Customers",
        solo: true,
        status: "live",
        href: `${shop}?tab=customers`,
      },
    );
  }

  sections.push(
    {
      id: "online-store",
      label: "Online Store",
      groupLabel: "Sales channels",
      items: [
        { id: "os-customize", label: "Customize", status: "live", href: editor },
        { id: "os-themes", label: "Themes", status: "live", href: themes },
        { id: "os-pages", label: "Pages", status: "live", href: editor },
        { id: "os-navigation", label: "Navigation", status: "partial", href: editor },
        { id: "os-preferences", label: "Preferences", status: "partial", anchor: "domain" },
        { id: "os-blog", label: "Blog posts", status: "live", href: editor },
        { id: "os-discover", label: "Discover themes", status: "live", href: aesthetics },
      ],
    },
  );

  if (shopOpened) {
    sections.push({
      id: "shop-channel",
      label: "Shop",
      items: [
        { id: "shop-overview", label: "Overview", status: "live", href: shop },
        { id: "shop-collections", label: "Collections", status: "live", href: `${shop}?tab=collections` },
        { id: "shop-inventory", label: "Inventory", status: "live", href: `${shop}?tab=products` },
        { id: "shop-discounts", label: "Discounts", status: "live", href: `${shop}?tab=discounts` },
        { id: "shop-gift-cards", label: "Gift cards", status: "live", href: `${shop}?tab=gift-cards` },
        { id: "shop-checkout", label: "Payments", status: "partial", href: `${shop}?tab=payments` },
      ],
    });
  } else {
    sections.push({
      id: "shop-channel",
      label: "Shop",
      items: [
        {
          id: "shop-open",
          label: "Open shop",
          status: "live",
          action: "open-shop",
        },
      ],
    });
  }

  sections.push(
    {
      id: "analytics",
      label: "Analytics",
      items: [
        {
          id: "an-reports",
          label: "Reports",
          status: "partial",
          href: shopOpened ? `${shop}?tab=analytics` : home,
          anchor: shopOpened ? undefined : "traffic",
        },
        { id: "an-live", label: "Live view", status: "partial", href: home, anchor: "traffic" },
      ],
    },
    {
      id: "marketing",
      label: "Marketing",
      items: [
        { id: "mkt-campaigns", label: "Campaigns", status: "partial", href: biz },
        { id: "mkt-email", label: "Email", status: "partial", href: biz },
        { id: "mkt-reach", label: "Kebu Reach", status: "live", href: "/reach" },
        { id: "mkt-discounts", label: "Discounts", status: shopOpened ? "live" : "partial", href: shopOpened ? `${shop}?tab=discounts` : home },
      ],
    },
    {
      id: "content",
      label: "Content",
      items: [
        { id: "content-media", label: "Files & photos", status: "live", href: editor },
        { id: "content-forms", label: "Forms", status: "live", href: editor },
        { id: "content-blog", label: "Blog", status: "live", href: editor },
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
      ],
    },
    {
      id: "settings",
      label: "Settings",
      solo: true,
      status: "partial",
      anchor: "domain",
      href: home,
    },
  );

  return sections;
}

export function resolveKebuBusinessNavHref(
  item: Pick<KebuBusinessNavItem, "href" | "anchor">,
  homePath: string,
): string | undefined {
  if (item.href && item.anchor) {
    if (item.href.includes("#")) return item.href;
    return `${item.href}#${item.anchor}`;
  }
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
