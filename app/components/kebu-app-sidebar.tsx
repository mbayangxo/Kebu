"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuSidebarAuthFooter } from "@/app/components/kebu-sidebar-auth-footer";
import { KebuAccountContextSwitcher } from "@/app/components/kebu-account-context-switcher";
import { useKebuWorkspace } from "@/app/hooks/use-kebu-workspace";
import { useKebuAccountContext } from "@/app/hooks/use-kebu-account-context";
import { KEBU } from "@/lib/kebu-brand";
import { PRODUCT_NAV, businessNavHref } from "@/lib/navigation/product-nav";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";
import { workspaceHome, workspaceLabel } from "@/lib/navigation/kebu-workspace";

export type PortfolioNavSite = {
  key: string;
  title: string;
  editorUrl: string | null;
  previewPath: string | null;
};

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ─── Badge ──────────────────────────────────────────────────────────────── */
function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      style={{
        background: KEBU.orange,
        color: "#fff",
        fontSize: "0.65rem",
        fontWeight: 700,
        lineHeight: 1,
        padding: "2px 6px",
        borderRadius: 999,
        minWidth: 18,
        textAlign: "center",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: "auto",
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* ─── Section label ──────────────────────────────────────────────────────── */
function SectionLabel({ title }: { title: string }) {
  return (
    <p
      style={{
        color: "rgba(255,255,255,0.28)",
        fontSize: "0.65rem",
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        padding: "16px 16px 6px",
        userSelect: "none",
      }}
    >
      {title}
    </p>
  );
}

/* ─── Plain nav link ─────────────────────────────────────────────────────── */
function NavLink({
  href,
  label,
  active,
  badge = 0,
  indent = false,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: indent ? "9px 16px 9px 28px" : "9px 16px",
        borderRadius: 8,
        fontSize: "0.8375rem",
        fontWeight: active ? 600 : 400,
        color: active ? "#fff" : "rgba(255,255,255,0.62)",
        background: active ? "rgba(255,255,255,0.1)" : "transparent",
        borderLeft: active ? `3px solid ${KEBU.orange}` : "3px solid transparent",
        transition: "background 0.12s, color 0.12s",
        textDecoration: "none",
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      <Badge count={badge} />
    </Link>
  );
}

/* ─── Accordion nav item ─────────────────────────────────────────────────── */
function NavAccordion({
  href,
  label,
  active,
  childItems,
  pathname,
}: {
  href: string;
  label: string;
  active: boolean;
  childItems: { label: string; href: string; exact?: boolean; badge?: number }[];
  pathname: string;
}) {
  const anyChildActive = childItems.some((c) => isActive(pathname, c.href, c.exact));
  const [open, setOpen] = useState(active || anyChildActive);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderRadius: 8,
          borderLeft: (active || anyChildActive) ? `3px solid ${KEBU.orange}` : "3px solid transparent",
          background: (active || anyChildActive) ? "rgba(255,255,255,0.08)" : "transparent",
        }}
      >
        <Link
          href={href}
          style={{
            flex: 1,
            padding: "9px 0 9px 13px",
            fontSize: "0.8375rem",
            fontWeight: (active || anyChildActive) ? 600 : 400,
            color: (active || anyChildActive) ? "#fff" : "rgba(255,255,255,0.62)",
            textDecoration: "none",
            transition: "color 0.12s",
          }}
        >
          {label}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            padding: "9px 14px",
            color: "rgba(255,255,255,0.3)",
            fontSize: "0.6rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? "▾" : "▸"}
        </button>
      </div>
      {open && childItems.length > 0 && (
        <div style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          {childItems.map((c) => (
            <NavLink
              key={c.href}
              href={c.href}
              label={c.label}
              active={isActive(pathname, c.href, c.exact)}
              badge={c.badge ?? 0}
              indent
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Contextual site nav ────────────────────────────────────────────────── */
function SiteContextNav({
  siteId,
  siteName,
  pathname,
  editorUrl,
}: {
  siteId: string;
  siteName: string;
  pathname: string;
  editorUrl: string | null;
}) {
  const base = `/my-sites/${siteId}`;
  const editHref = editorUrl ?? `/create/${siteId}`;

  return (
    <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px 16px" }}>
      <Link
        href="/my-sites"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          marginBottom: 8,
          fontSize: "0.775rem",
          color: "rgba(255,255,255,0.38)",
          textDecoration: "none",
          borderRadius: 8,
          transition: "color 0.12s",
        }}
      >
        ← All Sites
      </Link>

      <div
        style={{
          margin: "0 4px 12px",
          padding: "10px 14px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#fff", marginBottom: 2 }} className="truncate">
          {siteName}
        </p>
        <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.38)" }}>Website</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <NavLink href={base} label="Overview" active={pathname === base} />
        <NavLink href={editHref} label="Edit site" active={pathname.startsWith(`/create/${siteId}`)} />
        <NavLink href={`${base}?section=analytics`} label="Analytics" active={false} />
        <NavLink href={`${base}?section=themes`} label="Themes" active={false} />
        <NavLink href={`${base}?section=seo`} label="SEO & domains" active={false} />
        <NavLink href={`${base}?section=settings`} label="Settings" active={false} />
      </div>
    </nav>
  );
}

/* ─── Main sidebar ───────────────────────────────────────────────────────── */
export function KebuAppSidebar({
  portfolioSites = [],
  className = "",
}: {
  portfolioSites?: PortfolioNavSite[];
  className?: string;
}) {
  const pathname = usePathname();
  const { workspace, ready } = useKebuWorkspace();
  const { context: accountContext } = useKebuAccountContext();
  const ws = workspace ?? "kebu";
  const homeHref = workspaceHome(ws);
  const activeBusinessId = accountContext?.activeBusinessId ?? null;
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Fetch unread message count from Supabase
  useEffect(() => {
    let cancelled = false;
    fetch("/api/messages/unread-count", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && typeof data?.count === "number") setUnreadMessages(data.count); })
      .catch(() => {/* non-critical */});
    return () => { cancelled = true; };
  }, []);

  if (
    pathname === "/" ||
    isMarketingPath(pathname) ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup")
  ) {
    return null;
  }

  const siteDetailMatch = pathname.match(/^\/my-sites\/([^/?#]+)/);
  const currentSiteId = siteDetailMatch?.[1] ?? null;
  const currentSite = currentSiteId ? portfolioSites.find((s) => s.key === currentSiteId) : null;

  return (
    <aside
      className={`hidden md:flex shrink-0 flex-col sticky top-0 h-screen overflow-y-auto ${className}`}
      style={{
        width: "15.5rem",
        background: KEBU.black,
        color: KEBU.white,
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange}, ${KEBU.orangeLight})`,
          flexShrink: 0,
        }}
      />

      {/* Logo */}
      <div
        style={{
          padding: "16px 16px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <Link href={homeHref} className="group" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <KebuMark size={28} />
          <div style={{ minWidth: 0 }}>
            <span
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 900,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#fff",
              }}
            >
              Kebu
            </span>
            {ready && (
              <span
                style={{
                  display: "block",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.38)",
                }}
                className="truncate"
              >
                {workspaceLabel(ws)}
              </span>
            )}
          </div>
        </Link>
        <Link
          href="/start?pick=1"
          style={{
            marginTop: 10,
            display: "inline-block",
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.35)",
            textDecoration: "none",
          }}
        >
          Switch workspace →
        </Link>
      </div>

      <KebuAccountContextSwitcher />

      {/* Nav */}
      {currentSiteId ? (
        <SiteContextNav
          siteId={currentSiteId}
          siteName={currentSite?.title ?? "Site"}
          pathname={pathname}
          editorUrl={currentSite?.editorUrl ?? null}
        />
      ) : (
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px 16px" }}>

          {/* Opportunity — always visible */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 4 }}>
            {PRODUCT_NAV.opportunity.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={isActive(pathname, item.href) || (item.href === "/opportunity" && pathname === "/opportunity/intake")}
              />
            ))}
          </div>

          {ws === "kebu" && (
            <>
              <SectionLabel title="Explore" />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {PRODUCT_NAV.kebu.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={isActive(pathname, item.href, item.exact)}
                  />
                ))}
              </div>
            </>
          )}

          {ws === "business" && (
            <>
              <SectionLabel title="My Space" />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <NavAccordion
                  href={businessNavHref("/business", activeBusinessId)}
                  label="Businesses"
                  active={isActive(pathname, businessNavHref("/business", activeBusinessId), true)}
                  pathname={pathname}
                  childItems={[
                    { label: "Pulse", href: "/business?tab=pulse" },
                    { label: "KA Score", href: "/ka-score" },
                  ]}
                />
                <NavAccordion
                  href="/my-sites"
                  label="My Sites"
                  active={isActive(pathname, "/my-sites", true)}
                  pathname={pathname}
                  childItems={
                    portfolioSites.length > 0
                      ? portfolioSites
                          .filter((s) => s.editorUrl)
                          .map((s) => ({ label: s.title, href: `/my-sites/${s.key}`, exact: true }))
                      : []
                  }
                />
                <NavLink
                  href="/messages"
                  label="Messages"
                  active={isActive(pathname, "/messages")}
                  badge={unreadMessages}
                />
              </div>

              <SectionLabel title="Build" />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <NavLink
                  href="/create/aesthetics"
                  label="Aesthetic Gallery"
                  active={isActive(pathname, "/create/aesthetics", true)}
                />
                <NavLink
                  href="/create/new"
                  label="Build a site"
                  active={isActive(pathname, "/create/new", true)}
                />
              </div>

              <SectionLabel title="Commerce" />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <NavLink
                  href="/shop"
                  label="Shop"
                  active={isActive(pathname, "/shop", true)}
                />
              </div>

              <SectionLabel title="Studio" />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <NavAccordion
                  href="/studio"
                  label="Kebu Studio"
                  active={isActive(pathname, "/studio", true)}
                  pathname={pathname}
                  childItems={[
                    { label: "New design", href: "/studio/new" },
                    { label: "Brand DNA", href: "/studio/brand" },
                    { label: "Campaigns", href: "/studio/campaigns" },
                  ]}
                />
              </div>

              <SectionLabel title="Africa" />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <NavLink
                  href="/b2b"
                  label="Alkebulan"
                  active={isActive(pathname, "/b2b")}
                />
              </div>
            </>
          )}

          {ws === "studio" && (
            <>
              <SectionLabel title="Studio" />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <NavLink href="/studio" label="Kebu Studio" active={isActive(pathname, "/studio", true)} />
                <NavLink href="/studio/new" label="New design" active={isActive(pathname, "/studio/new")} />
                <NavLink href="/studio/brand" label="Brand DNA" active={isActive(pathname, "/studio/brand")} />
                <NavLink href="/studio/campaigns" label="Campaigns" active={isActive(pathname, "/studio/campaigns")} />
              </div>
            </>
          )}

        </nav>
      )}

      <KebuSidebarAuthFooter variant="dark" />
    </aside>
  );
}
