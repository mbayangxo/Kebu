"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KebuMark } from "@/app/components/kebu-mark";
import { KEBU } from "@/lib/kebu-brand";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";

/* ─── Icon ───────────────────────────────────────────────────────────────── */
function Icon({ d, size = 19 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  home:      "M3 9l9-7 9 7v11a1 1 0 01-1 1h-5v-5H9v5H4a1 1 0 01-1-1z",
  lightning: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  layers:    "M12 2l8 4.5v5L12 16l-8-4.5v-5L12 2zM4 6.5l8 4.5 8-4.5",
  brush:     "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  bag:       "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zm4 10a2 2 0 104 0 2 2 0 00-4 0",
  globe:     "M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2c-3.5 4-3.5 16 0 20M12 2c3.5 4 3.5 16 0 20",
  more:      "M5 12h.01M12 12h.01M19 12h.01",
  collapse:  "M15 18l-6-6 6-6",
  expand:    "M9 18l6-6-6-6",
  messages:  "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  settings:  "M12 15a3 3 0 100-6 3 3 0 000 6zm7-3a7 7 0 01-.1 1.1l2.3 1.8-2.2 3.8-2.7-1.1c-.6.4-1.2.8-1.9 1L14 21h-4l-.4-2.8c-.7-.3-1.3-.6-1.9-1L5 18.4l-2.2-3.8 2.3-1.8A7 7 0 015 12a7 7 0 01.1-1.1L2.8 9.1 5 5.3l2.7 1.1c.6-.4 1.2-.8 1.9-1L10 3h4l.4 2.8c.7.3 1.3.6 1.9 1L19 5.6l2.2 3.8-2.3 1.8c.1.4.1.7.1 1z",
} as const;

/* ─── Product definitions ────────────────────────────────────────────────── */
type NavItem = {
  label: string;
  href: string;
  exact?: boolean;
  badgeKey?: "messages";
  children?: { label: string; href: string; exact?: boolean }[];
};

type Product = {
  id: string;
  icon: keyof typeof ICONS;
  label: string;
  href: string;
  prefixes: string[];
  items: NavItem[];
};

const PRODUCTS: Product[] = [
  {
    id: "kebu",
    icon: "home",
    label: "Kebu",
    href: "/dashboard",
    prefixes: ["/dashboard", "/welcome"],
    items: [
      { label: "Your Kebu", href: "/dashboard", exact: true },
      { label: "Personalize", href: "/welcome" },
    ],
  },
  {
    id: "opportunity",
    icon: "lightning",
    label: "Opportunity",
    href: "/opportunity",
    prefixes: ["/opportunity", "/ka-score"],
    items: [
      { label: "Browse", href: "/opportunity", exact: true },
      { label: "Listings", href: "/opportunity/listings" },
      { label: "KA Score", href: "/ka-score" },
    ],
  },
  {
    id: "yande",
    icon: "layers",
    label: "Yande",
    href: "/my-sites",
    prefixes: ["/create", "/my-sites"],
    items: [
      { label: "My Sites", href: "/my-sites" },
      { label: "Build a site", href: "/create/new" },
      { label: "Aesthetic Gallery", href: "/create/aesthetics" },
    ],
  },
  {
    id: "studio",
    icon: "brush",
    label: "Studio",
    href: "/studio",
    prefixes: ["/studio"],
    items: [
      { label: "My designs", href: "/studio", exact: true },
      { label: "New design", href: "/studio/new" },
      { label: "Brand DNA", href: "/studio/brand" },
      { label: "Campaigns", href: "/studio/campaigns" },
    ],
  },
  {
    id: "shop",
    icon: "bag",
    label: "Shop",
    href: "/shop",
    prefixes: ["/shop"],
    items: [
      { label: "My Shops", href: "/shop", exact: true },
    ],
  },
  {
    id: "alkebulan",
    icon: "globe",
    label: "Alkebulan",
    href: "/b2b",
    prefixes: ["/b2b", "/business", "/messages"],
    items: [
      { label: "Marketplace", href: "/b2b", exact: true },
      { label: "My Businesses", href: "/business", exact: true },
      { label: "Messages", href: "/messages", badgeKey: "messages" },
    ],
  },
];

/* Mobile bottom tab order (5 max) */
const MOBILE_TABS = ["kebu", "opportunity", "yande", "shop", "alkebulan"];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function active(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function detectProduct(pathname: string): Product {
  for (const p of PRODUCTS) {
    if (p.prefixes.some((px) => pathname === px || pathname.startsWith(px + "/"))) return p;
  }
  return PRODUCTS[0]!;
}

/* ─── Badge pill ─────────────────────────────────────────────────────────── */
function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span style={{
      background: KEBU.orange, color: "#fff",
      fontSize: "0.6rem", fontWeight: 700, lineHeight: 1,
      padding: "2px 5px", borderRadius: 999, minWidth: 16,
      textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* ─── Nav link ───────────────────────────────────────────────────────────── */
function NavLink({
  item, pathname, badges, indent = false, onClose,
}: {
  item: NavItem;
  pathname: string;
  badges: Record<string, number>;
  indent?: boolean;
  onClose?: () => void;
}) {
  const on = active(pathname, item.href, item.exact);
  const badge = item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0;

  if (item.children && item.children.length > 0) {
    const anyChildOn = item.children.some((c) => active(pathname, c.href, c.exact));
    const [open, setOpen] = useState(on || anyChildOn);
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer",
            borderLeft: (on || anyChildOn) ? `2px solid ${KEBU.orange}` : "2px solid transparent",
            fontSize: "0.8125rem", fontWeight: (on || anyChildOn) ? 600 : 400,
            color: (on || anyChildOn) ? "#fff" : "rgba(255,255,255,0.52)",
            background: (on || anyChildOn) ? "rgba(255,255,255,0.07)" : "transparent",
            transition: "color 0.12s",
          }}
        >
          <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
          <span style={{ opacity: 0.4, fontSize: "0.55rem", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
        </button>
        {open && (
          <div style={{ marginTop: 1 }}>
            {item.children.map((c) => (
              <Link key={c.href} href={c.href} onClick={onClose} style={{
                display: "block",
                padding: "6px 14px 6px 24px", borderRadius: 6,
                fontSize: "0.775rem",
                fontWeight: active(pathname, c.href, c.exact) ? 600 : 400,
                color: active(pathname, c.href, c.exact) ? "#fff" : "rgba(255,255,255,0.42)",
                background: active(pathname, c.href, c.exact) ? "rgba(255,255,255,0.06)" : "transparent",
                borderLeft: active(pathname, c.href, c.exact) ? `2px solid ${KEBU.orange}` : "2px solid transparent",
                textDecoration: "none", transition: "color 0.12s",
              }}>
                {c.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href} onClick={onClose} style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: indent ? "7px 14px 7px 24px" : "7px 14px",
      borderRadius: 6, textDecoration: "none",
      borderLeft: on ? `2px solid ${KEBU.orange}` : "2px solid transparent",
      fontSize: "0.8125rem", fontWeight: on ? 600 : 400,
      color: on ? "#fff" : "rgba(255,255,255,0.52)",
      background: on ? "rgba(255,255,255,0.07)" : "transparent",
      transition: "color 0.12s, background 0.12s",
    }}>
      <span style={{ flex: 1 }}>{item.label}</span>
      <Badge count={badge} />
    </Link>
  );
}

/* ─── Product panel (desktop) ────────────────────────────────────────────── */
function ProductPanel({
  product, pathname, badges, collapsed, onToggle,
}: {
  product: Product;
  pathname: string;
  badges: Record<string, number>;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{
      width: collapsed ? 0 : 188,
      minWidth: collapsed ? 0 : 188,
      overflow: "hidden",
      transition: "width 0.2s ease, min-width 0.2s ease",
      background: "rgba(255,255,255,0.03)",
      borderRight: "1px solid rgba(255,255,255,0.05)",
      display: "flex", flexDirection: "column",
    }}>
      {!collapsed && (
        <>
          <div style={{
            padding: "14px 14px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <p style={{
              fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
            }}>
              {product.label}
            </p>
          </div>

          <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px 12px", display: "flex", flexDirection: "column", gap: 1 }}>
            {product.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} badges={badges} />
            ))}
          </nav>

          <button
            type="button"
            onClick={onToggle}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 14px",
              border: "none", background: "none", cursor: "pointer",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              fontSize: "0.7rem", color: "rgba(255,255,255,0.25)",
            }}
          >
            <Icon d={ICONS.collapse} size={13} />
            <span>Collapse</span>
          </button>
        </>
      )}
    </div>
  );
}

/* ─── Icon strip (desktop) ───────────────────────────────────────────────── */
function IconStrip({
  currentProductId, pathname, onExpand, isCollapsed,
}: {
  currentProductId: string;
  pathname: string;
  onExpand: () => void;
  isCollapsed: boolean;
}) {
  return (
    <div style={{
      width: 52,
      minWidth: 52,
      background: KEBU.black,
      borderRight: "1px solid rgba(255,255,255,0.07)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "12px 0",
      gap: 0,
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, marginBottom: 8 }}>
        <KebuMark size={24} />
      </Link>

      <div style={{ width: 28, height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 8 }} />

      {/* Product icons */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        {PRODUCTS.map((p) => {
          const isOn = p.id === currentProductId;
          return (
            <Link
              key={p.id}
              href={p.href}
              onClick={isCollapsed ? onExpand : undefined}
              title={p.label}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 40, height: 40, borderRadius: 10,
                color: isOn ? "#fff" : "rgba(255,255,255,0.38)",
                background: isOn ? "rgba(255,85,0,0.18)" : "transparent",
                border: isOn ? `1px solid rgba(255,85,0,0.3)` : "1px solid transparent",
                transition: "background 0.12s, color 0.12s",
                position: "relative",
              }}
            >
              <Icon d={ICONS[p.icon]} size={18} />
            </Link>
          );
        })}
      </div>

      {/* Expand button when panel is collapsed */}
      {isCollapsed && (
        <button
          type="button"
          onClick={onExpand}
          title="Expand panel"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 40, height: 40, borderRadius: 10,
            border: "none", background: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.25)", marginBottom: 4,
          }}
        >
          <Icon d={ICONS.expand} size={14} />
        </button>
      )}

      {/* Settings */}
      <div style={{ width: 28, height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 8, marginTop: 4 }} />
      <Link
        href="/account"
        title="Settings"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 40, height: 40, borderRadius: 10,
          color: active(pathname, "/account") ? "#fff" : "rgba(255,255,255,0.3)",
          background: active(pathname, "/account") ? "rgba(255,255,255,0.08)" : "transparent",
          transition: "color 0.12s",
        }}
      >
        <Icon d={ICONS.settings} size={17} />
      </Link>
    </div>
  );
}

/* ─── Mobile bottom tabs ─────────────────────────────────────────────────── */
function MobileBottomTabs({
  currentProductId,
  badges,
}: {
  currentProductId: string;
  badges: Record<string, number>;
}) {
  const tabProducts = PRODUCTS.filter((p) => MOBILE_TABS.includes(p.id));

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      background: KEBU.black,
      borderTop: "1px solid rgba(255,255,255,0.07)",
      display: "flex", alignItems: "stretch",
      height: 58,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {tabProducts.map((p) => {
        const isOn = p.id === currentProductId;
        const msgBadge = p.id === "alkebulan" ? (badges.messages ?? 0) : 0;
        return (
          <Link
            key={p.id}
            href={p.href}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 3,
              textDecoration: "none",
              color: isOn ? KEBU.orange : "rgba(255,255,255,0.35)",
              position: "relative",
              transition: "color 0.12s",
            }}
          >
            {msgBadge > 0 && (
              <span style={{
                position: "absolute", top: 6, right: "calc(50% - 14px)",
                width: 7, height: 7, borderRadius: "50%", background: KEBU.orange,
              }} />
            )}
            <Icon d={ICONS[p.icon]} size={20} />
            <span style={{ fontSize: "0.6rem", fontWeight: isOn ? 700 : 500, letterSpacing: "0.02em" }}>
              {p.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ─── Main export ────────────────────────────────────────────────────────── */
export function KebuNavShell({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const currentProduct = detectProduct(pathname);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({ messages: 0 });

  // Shop detail pages have their own ShopSideNav — hide the product panel to avoid double-sidebar
  const isShopDetail = /^\/shop\/[^/]+/.test(pathname);
  const showPanel = !isShopDetail && !panelCollapsed;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/messages/unread-count", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && typeof d?.count === "number") setBadges({ messages: d.count }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex shrink-0 sticky top-0 h-screen"
        style={{ zIndex: 40 }}
      >
        <IconStrip
          currentProductId={currentProduct.id}
          pathname={pathname}
          isCollapsed={!showPanel}
          onExpand={() => setPanelCollapsed(false)}
        />
        {!isShopDetail && (
          <ProductPanel
            product={currentProduct}
            pathname={pathname}
            badges={badges}
            collapsed={panelCollapsed}
            onToggle={() => setPanelCollapsed(true)}
          />
        )}
      </aside>

      {/* Mobile bottom tabs */}
      <div className="md:hidden">
        <MobileBottomTabs currentProductId={currentProduct.id} badges={badges} />
      </div>
    </>
  );
}

/* ─── Standalone sidebar for layouts that need it ────────────────────────── */
export function KebuNavSidebar() {
  return <KebuNavShell />;
}
