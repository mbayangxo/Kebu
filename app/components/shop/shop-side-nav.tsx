"use client";

import { useEffect, useState } from "react";
import type { NavCounts } from "@/app/api/projects/[id]/nav-counts/route";

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
  alert:     "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
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
    label: "Today",
    items: [{ tab: "overview", label: "Overview" }],
  },
  {
    id: "orders",
    icon: "orders",
    label: "Orders",
    items: [
      { tab: "orders",       sub: "all",    label: "All orders" },
      { tab: "orders",       sub: "drafts", label: "Drafts" },
      { tab: "abandoned",                   label: "Abandoned carts" },
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
    ],
  },
  {
    id: "money",
    icon: "money",
    label: "Money",
    items: [
      { tab: "analytics", sub: "overview",        label: "Analytics" },
      { tab: "payments",                           label: "Payments" },
      { tab: "analytics", sub: "payouts",          label: "Payouts" },
      { tab: "analytics", sub: "expenses",         label: "Expenses" },
      { tab: "products",  sub: "purchase-orders",  label: "Purchase orders" },
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

/* ─── badge counts per group/item ────────────────────────────────────────── */
function groupBadge(groupId: string, counts: NavCounts): number {
  switch (groupId) {
    case "orders":   return counts.pendingOrders;
    case "products": return counts.lowStockItems;
    case "people":   return counts.unreadMessages;
    case "money":    return counts.paymentIssues;
    default:         return 0;
  }
}

function itemBadge(item: NavItem, counts: NavCounts): number {
  if (item.tab === "orders" && !item.sub)          return counts.pendingOrders;
  if (item.tab === "orders" && item.sub === "all") return counts.pendingOrders;
  if (item.tab === "orders" && item.sub === "drafts") return counts.draftOrders;
  if (item.tab === "abandoned")                    return counts.abandonedCarts;
  if (item.tab === "messages")                     return counts.unreadMessages;
  if (item.tab === "payments")                     return counts.paymentIssues;
  return 0;
}

function isWarning(groupId: string, counts: NavCounts): boolean {
  if (groupId === "products" && counts.lowStockItems > 0) return true;
  if (groupId === "money" && counts.paymentIssues > 0) return true;
  return false;
}

/* ─── small badge pill ───────────────────────────────────────────────────── */
function Badge({ count, warn }: { count: number; warn?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className="shop-sidenav-badge"
      style={{
        background: warn ? "#FF5500" : "#FF5500",
        color: "#fff",
        fontSize: "0.65rem",
        fontWeight: 700,
        lineHeight: 1,
        padding: "2px 5px",
        borderRadius: 999,
        minWidth: 18,
        textAlign: "center",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* ─── today stats strip ──────────────────────────────────────────────────── */
function TodayStrip({ counts }: { counts: NavCounts }) {
  if (counts.todayOrders === 0 && counts.todayRevenue === 0) return null;
  const fmt = new Intl.NumberFormat("fr-SN", { maximumFractionDigits: 0 });
  return (
    <div className="shop-sidenav-today">
      <div className="shop-sidenav-today-row">
        <span className="shop-sidenav-today-label">Today&apos;s orders</span>
        <span className="shop-sidenav-today-value">{counts.todayOrders}</span>
      </div>
      <div className="shop-sidenav-today-row">
        <span className="shop-sidenav-today-label">Revenue</span>
        <span className="shop-sidenav-today-value">
          {fmt.format(counts.todayRevenue)} {counts.currency}
        </span>
      </div>
    </div>
  );
}

/* ─── alert bar ──────────────────────────────────────────────────────────── */
function AlertBar({ counts }: { counts: NavCounts }) {
  const alerts: string[] = [];
  if (counts.pendingOrders > 0)
    alerts.push(`${counts.pendingOrders} order${counts.pendingOrders > 1 ? "s" : ""} to fulfil`);
  if (counts.lowStockItems > 0)
    alerts.push(`${counts.lowStockItems} low stock`);
  if (counts.paymentIssues > 0)
    alerts.push(`${counts.paymentIssues} payment issue${counts.paymentIssues > 1 ? "s" : ""}`);
  if (alerts.length === 0) return null;
  return (
    <div className="shop-sidenav-alerts">
      {alerts.map((a) => (
        <div key={a} className="shop-sidenav-alert-item">
          <Icon d={ICONS.alert} size={11} />
          <span>{a}</span>
        </div>
      ))}
    </div>
  );
}

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

const EMPTY_COUNTS: NavCounts = {
  pendingOrders: 0, draftOrders: 0, abandonedCarts: 0,
  unreadMessages: 0, lowStockItems: 0, paymentIssues: 0,
  todayRevenue: 0, todayOrders: 0, currency: "XOF",
};

/* ─── component ──────────────────────────────────────────────────────────── */
export function ShopSideNav({
  tab,
  sub,
  projectId,
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
  const [openGroup, setOpenGroup] = useState<string | null>(() => findActiveGroupId(tab, sub));
  const [counts, setCounts] = useState<NavCounts>(EMPTY_COUNTS);

  // Auto-open correct group on external navigation
  useEffect(() => {
    const id = findActiveGroupId(tab, sub);
    if (id) setOpenGroup(id);
  }, [tab, sub]);

  // Fetch badge counts
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/nav-counts`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && data) setCounts(data as NavCounts); })
      .catch(() => {/* non-critical — badges just stay empty */});
    return () => { cancelled = true; };
  }, [projectId]);

  function handleGroupClick(group: NavGroup) {
    if (collapsed) {
      setCollapsed(false);
      setOpenGroup(group.id);
      return;
    }
    if (group.items.length === 1) {
      const item = group.items[0]!;
      onNavigate(item.tab, item.sub);
      setOpenGroup(group.id);
      return;
    }
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

      {/* today stats */}
      {!collapsed && <TodayStrip counts={counts} />}

      {/* alert bar */}
      {!collapsed && <AlertBar counts={counts} />}

      {/* nav groups */}
      <nav className="shop-sidenav-nav">
        {NAV_GROUPS.map((group) => {
          const active = groupActive(group, tab, sub);
          const open = !collapsed && openGroup === group.id;
          const badge = groupBadge(group.id, counts);
          const warn = isWarning(group.id, counts);

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
                    <span className="shop-sidenav-group-right">
                      <Badge count={badge} warn={warn} />
                      {group.items.length > 1 && (
                        <span
                          className="shop-sidenav-chevron"
                          data-open={open ? "" : undefined}
                          style={{ transition: "transform 0.18s ease" }}
                        >
                          <Icon d={ICONS.chevron} size={13} />
                        </span>
                      )}
                    </span>
                  </>
                )}
                {/* collapsed badge dot */}
                {collapsed && badge > 0 && (
                  <span
                    style={{
                      position: "absolute", top: 6, right: 6,
                      width: 7, height: 7, borderRadius: "50%",
                      background: "#FF5500",
                    }}
                    aria-hidden
                  />
                )}
              </button>

              {open && group.items.length > 1 && (
                <ul className="shop-sidenav-children">
                  {group.items.map((item) => {
                    const itemOn = itemActive(item, tab, sub);
                    const itemCount = itemBadge(item, counts);
                    return (
                      <li key={`${item.tab}-${item.sub ?? ""}`}>
                        <button
                          type="button"
                          className="shop-sidenav-child-btn"
                          data-active={itemOn ? "" : undefined}
                          onClick={() => handleItemClick(item)}
                        >
                          <span style={{ flex: 1 }}>{item.label}</span>
                          <Badge count={itemCount} />
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
