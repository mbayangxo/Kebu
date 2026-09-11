"use client";

import { useEffect, useState } from "react";

/* ─── icons ─────────────────────────────────────────────────────────────── */
function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  home:      "M3 9.5L12 3l9 6.5V21H15v-5h-6v5H3z",
  orders:    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  products:  "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  people:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zm8 4a2 2 0 104 0 2 2 0 00-4 0m2 8v-1a2 2 0 00-2-2h-1",
  money:     "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  settings:  "M12 15a3 3 0 100-6 3 3 0 000 6zm6.9-3a6.9 6.9 0 01-.1 1.1l2.3 1.8-2.2 3.8-2.7-1.1c-.6.4-1.2.8-1.9 1l-.4 2.8h-4.4l-.4-2.8c-.7-.3-1.3-.6-1.9-1L4.4 18l-2.2-3.8 2.3-1.8A7 7 0 014.5 12a7 7 0 01.1-1.1L2.2 9.1 4.4 5.3l2.7 1.1c.6-.4 1.2-.8 1.9-1L9.4 2.5h4.3l.4 2.8c.7.3 1.3.6 1.9 1l2.7-1.1 2.2 3.8-2.3 1.8c.1.4.1.7.1 1.1z",
  collapse:  "M15 18l-6-6 6-6",
  expand:    "M9 18l6-6-6-6",
  chevron:   "M9 18l6-6-6-6",
} as const;

/* ─── nav structure ──────────────────────────────────────────────────────── */
export type NavItem = { tab: string; sub?: string; label: string };
export type NavGroup = {
  id: string;
  icon: keyof typeof ICONS;
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    icon: "home",
    label: "Home",
    items: [{ tab: "overview", label: "Overview" }],
  },
  {
    id: "orders",
    icon: "orders",
    label: "Orders",
    items: [
      { tab: "orders",       sub: "all",    label: "All orders" },
      { tab: "orders",       sub: "drafts", label: "Drafts" },
      { tab: "abandoned",                   label: "Abandoned" },
      { tab: "subscriptions",               label: "Subscriptions" },
    ],
  },
  {
    id: "products",
    icon: "products",
    label: "Products",
    items: [
      { tab: "products",    sub: "all", label: "All products" },
      { tab: "collections",             label: "Collections" },
      { tab: "gift-cards",              label: "Gift cards" },
      { tab: "pages",                   label: "Pages" },
    ],
  },
  {
    id: "people",
    icon: "people",
    label: "People",
    items: [
      { tab: "customers", sub: "all",       label: "Customers" },
      { tab: "customers", sub: "segments",  label: "Segments" },
      { tab: "customers", sub: "companies", label: "Companies" },
      { tab: "messages",                    label: "Messages" },
      { tab: "reviews",   sub: "all",       label: "Reviews" },
      { tab: "reviews",   sub: "requests",  label: "Review requests" },
    ],
  },
  {
    id: "money",
    icon: "money",
    label: "Money",
    items: [
      { tab: "analytics", sub: "overview",       label: "Overview" },
      { tab: "payments",                          label: "Payments" },
      { tab: "analytics", sub: "payouts",         label: "Payouts" },
      { tab: "analytics", sub: "expenses",        label: "Expenses" },
      { tab: "products",  sub: "purchase-orders", label: "Purchase orders" },
    ],
  },
  {
    id: "settings",
    icon: "settings",
    label: "Settings",
    items: [
      { tab: "orders",    sub: "shipping", label: "Delivery" },
      { tab: "markets",                    label: "Markets" },
      { tab: "discounts",                  label: "Discounts" },
      { tab: "apps",                       label: "Apps" },
      { tab: "sell",                       label: "Channels" },
      { tab: "team",                       label: "Team" },
    ],
  },
];

/* ─── helpers ────────────────────────────────────────────────────────────── */
function itemActive(item: NavItem, tab: string, sub: string): boolean {
  if (item.tab !== tab) return false;
  if (!item.sub) return !sub || sub === "all" || sub === "overview";
  return item.sub === sub;
}

function groupActive(group: NavGroup, tab: string, sub: string): boolean {
  return group.items.some((item) => itemActive(item, tab, sub));
}

function findActiveGroupId(tab: string, sub: string): string | null {
  return NAV_GROUPS.find((g) => groupActive(g, tab, sub))?.id ?? null;
}

/* ─── component ──────────────────────────────────────────────────────────── */
export function ShopSideNav({
  tab,
  sub,
  projectId: _projectId,
  title,
  onNavigate,
}: {
  tab: string;
  sub: string;
  projectId: string;
  title: string;
  onNavigate: (tab: string, sub?: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  // Only one group open at a time — starts with whichever is active
  const [openGroup, setOpenGroup] = useState<string | null>(() => findActiveGroupId(tab, sub));

  // When URL navigation changes (e.g. breadcrumb click), open the right group
  useEffect(() => {
    const id = findActiveGroupId(tab, sub);
    if (id) setOpenGroup(id);
  }, [tab, sub]);

  function handleGroupClick(group: NavGroup) {
    if (collapsed) {
      setCollapsed(false);
      setOpenGroup(group.id);
      return;
    }
    // Single-item groups navigate directly
    if (group.items.length === 1) {
      const item = group.items[0]!;
      onNavigate(item.tab, item.sub);
      setOpenGroup(group.id);
      return;
    }
    // Toggle: open if closed, close if already open
    setOpenGroup((prev) => (prev === group.id ? null : group.id));
  }

  function handleItemClick(item: NavItem) {
    onNavigate(item.tab, item.sub);
  }

  return (
    <aside
      className="shop-sidenav"
      data-collapsed={collapsed ? "" : undefined}
      aria-label="Shop navigation"
    >
      {/* store name */}
      {!collapsed && (
        <div className="shop-sidenav-header">
          <span className="shop-sidenav-store-name" title={title}>
            {title}
          </span>
        </div>
      )}

      {/* nav groups */}
      <nav className="shop-sidenav-nav">
        {NAV_GROUPS.map((group) => {
          const active = groupActive(group, tab, sub);
          const open = !collapsed && openGroup === group.id;

          return (
            <div key={group.id} className="shop-sidenav-group">
              <button
                type="button"
                className="shop-sidenav-group-btn"
                data-active={active ? "" : undefined}
                onClick={() => handleGroupClick(group)}
                title={collapsed ? group.label : undefined}
              >
                <span className="shop-sidenav-group-icon">
                  <Icon d={ICONS[group.icon]} size={17} />
                </span>
                {!collapsed && (
                  <>
                    <span className="shop-sidenav-group-label">{group.label}</span>
                    {group.items.length > 1 && (
                      <span
                        className="shop-sidenav-chevron"
                        data-open={open ? "" : undefined}
                        style={{ transition: "transform 0.18s ease" }}
                      >
                        <Icon d={ICONS.chevron} size={13} />
                      </span>
                    )}
                  </>
                )}
              </button>

              {open && group.items.length > 1 && (
                <ul className="shop-sidenav-children">
                  {group.items.map((item) => {
                    const itemOn = itemActive(item, tab, sub);
                    return (
                      <li key={`${item.tab}-${item.sub ?? ""}`}>
                        <button
                          type="button"
                          className="shop-sidenav-child-btn"
                          data-active={itemOn ? "" : undefined}
                          onClick={() => handleItemClick(item)}
                        >
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* collapse toggle */}
      <button
        type="button"
        className="shop-sidenav-collapse-btn"
        onClick={() => { setCollapsed((c) => !c); }}
        title={collapsed ? "Expand menu" : "Collapse menu"}
      >
        <Icon d={collapsed ? ICONS.expand : ICONS.collapse} size={15} />
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
