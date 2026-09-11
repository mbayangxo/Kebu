/**
 * Kebu Business — merchant OS navigation.
 * Mirrors Shopify admin depth: Orders, Products, Customers each have sub-items;
 * Growth, Discounts, Content, Markets, Finance, Analytics, Settings as shown in the admin.
 * Shop-conditional items are only included when shopOpened = true.
 */

export type KebuBusinessNavStatus = "live" | "partial" | "not_implemented";

export type KebuBusinessNavAction = "open-shop";

export type KebuBusinessNavItem = {
  id: string;
  label: string;
  status: KebuBusinessNavStatus;
  href?: string;
  anchor?: string;
  action?: KebuBusinessNavAction;
};

export type KebuBusinessNavSection = {
  id: string;
  label: string;
  /** Top-level row without children (Home, Growth, Discounts…) */
  solo?: boolean;
  status?: KebuBusinessNavStatus;
  href?: string;
  anchor?: string;
  action?: KebuBusinessNavAction;
  items?: KebuBusinessNavItem[];
  /** Visual group label above this block (e.g. "Sales channels") */
  groupLabel?: string;
};

export type KebuBusinessNavContext = {
  projectId: string;
  businessId: string | null;
  shopOpened?: boolean;
};

export function buildKebuBusinessNav(ctx: KebuBusinessNavContext): KebuBusinessNavSection[] {
  const { projectId, businessId, shopOpened = false } = ctx;
  const shop = `/shop/${projectId}`;
  const editor = `/create/${projectId}`;
  const home = `/my-sites/${projectId}`;
  const biz = businessId ? `/business/${businessId}` : "/business?tab=businesses";
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
        items: [
          { id: "orders-all", label: "All orders", status: "live", href: `${shop}?tab=orders` },
          { id: "orders-drafts", label: "Drafts", status: "partial", href: `${shop}?tab=orders&sub=drafts` },
          { id: "orders-shipping", label: "Shipping labels", status: "partial", href: `${shop}?tab=orders&sub=shipping` },
          { id: "orders-abandoned", label: "Abandoned checkouts", status: "partial", href: `${shop}?tab=orders&sub=abandoned` },
        ],
      },
      {
        id: "products",
        label: "Products",
        items: [
          { id: "prod-all", label: "All products", status: "live", href: `${shop}?tab=products` },
          { id: "prod-collections", label: "Collections", status: "live", href: `${shop}?tab=collections` },
          { id: "prod-inventory", label: "Inventory", status: "live", href: `${shop}?tab=products&sub=inventory` },
          { id: "prod-purchase-orders", label: "Purchase orders", status: "partial", href: `${shop}?tab=products&sub=purchase-orders` },
          { id: "prod-transfers", label: "Transfers", status: "not_implemented" },
          { id: "prod-gift-cards", label: "Gift cards", status: "partial", href: `${shop}?tab=gift-cards` },
        ],
      },
      {
        id: "customers",
        label: "Customers",
        items: [
          { id: "cust-all", label: "All customers", status: "live", href: `${shop}?tab=customers` },
          { id: "cust-segments", label: "Segments", status: "partial", href: `${shop}?tab=customers&sub=segments` },
          { id: "cust-companies", label: "Companies", status: "not_implemented" },
        ],
      },
      {
        id: "growth",
        label: "Growth",
        solo: true,
        status: "partial",
        href: biz,
      },
      {
        id: "discounts",
        label: "Discounts",
        solo: true,
        status: "live",
        href: `${shop}?tab=discounts`,
      },
    );
  } else {
    sections.push(
      {
        id: "growth",
        label: "Growth",
        solo: true,
        status: "partial",
        href: biz,
      },
    );
  }

  sections.push(
    {
      id: "content",
      label: "Content",
      items: [
        { id: "content-blog", label: "Blog posts", status: "live", href: editor },
        { id: "content-files", label: "Files & media", status: "live", href: editor },
        { id: "content-menus", label: "Navigation menus", status: "partial", href: editor },
        { id: "content-forms", label: "Forms", status: "live", href: editor },
      ],
    },
  );

  if (shopOpened) {
    sections.push(
      {
        id: "markets",
        label: "Markets",
        solo: true,
        status: "not_implemented",
      },
      {
        id: "finance",
        label: "Finance",
        items: [
          { id: "fin-overview", label: "Overview", status: "partial", href: `${shop}?tab=analytics` },
          { id: "fin-payouts", label: "Payouts", status: "partial", href: `${shop}?tab=analytics&sub=payouts` },
          { id: "fin-expenses", label: "Expenses", status: "not_implemented" },
        ],
      },
      {
        id: "analytics",
        label: "Analytics",
        items: [
          { id: "an-overview", label: "Overview", status: "partial", href: `${shop}?tab=analytics` },
          { id: "an-reports", label: "Reports", status: "partial", href: `${shop}?tab=analytics&sub=reports` },
          { id: "an-live", label: "Live view", status: "partial", href: home, anchor: "traffic" },
        ],
      },
    );
  } else {
    sections.push(
      {
        id: "analytics",
        label: "Analytics",
        items: [
          { id: "an-overview", label: "Overview", status: "partial", href: home, anchor: "traffic" },
          { id: "an-live", label: "Live view", status: "partial", href: home, anchor: "traffic" },
        ],
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
      ],
    },
  );

  if (shopOpened) {
    sections.push({
      id: "shop-channel",
      label: "Shop",
      items: [
        { id: "shop-overview", label: "Overview", status: "live", href: shop },
        { id: "shop-checkout", label: "Payments", status: "partial", href: `${shop}?tab=payments` },
        { id: "shop-discounts-ch", label: "Discounts", status: "live", href: `${shop}?tab=discounts` },
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
      id: "apps",
      label: "Apps",
      solo: true,
      status: "not_implemented",
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
