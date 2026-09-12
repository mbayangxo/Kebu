"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { KebuMark } from "@/app/components/kebu-mark";
import { YandeMark } from "@/app/components/yande-mark";
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

/** Plain nav link — Shopify-style: subtle active bg, no colored dot. */
function NavItem({
  href,
  label,
  active,
  indent = false,
}: {
  href: string;
  label: string;
  active: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center rounded-md py-1.5 text-[13px] transition-colors"
      style={{
        paddingLeft: indent ? "1.75rem" : "0.75rem",
        paddingRight: "0.75rem",
        background: active ? "rgba(255,255,255,0.13)" : "transparent",
        color: active ? "#fff" : "rgba(255,255,255,0.68)",
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </Link>
  );
}

/** Parent item that expands/collapses to reveal children — like Shopify's Products → Collections. */
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
  childItems: { label: string; href: string; exact?: boolean }[];
  pathname: string;
}) {
  const anyChildActive = childItems.some((c) => isActive(pathname, c.href, c.exact));
  const [open, setOpen] = useState(active || anyChildActive);

  return (
    <div>
      <div
        className="flex items-center rounded-md transition-colors"
        style={{
          background: (active && !open) ? "rgba(255,255,255,0.13)" : "transparent",
        }}
      >
        <Link
          href={href}
          className="flex-1 py-1.5 pl-3 text-[13px] transition-colors"
          style={{
            color: active || anyChildActive ? "#fff" : "rgba(255,255,255,0.68)",
            fontWeight: active || anyChildActive ? 600 : 400,
          }}
        >
          {label}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="px-2 py-1.5 text-[10px] shrink-0"
          style={{ color: "rgba(255,255,255,0.35)" }}
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? "▾" : "▸"}
        </button>
      </div>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {childItems.map((c) => (
            <NavItem
              key={c.href}
              href={c.href}
              label={c.label}
              active={isActive(pathname, c.href, c.exact)}
              indent
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Section group label — small, muted, uppercase. Like Shopify's "Sales channels". */
function NavGroup({ title }: { title: string }) {
  return (
    <p
      className="px-3 pb-1 pt-4 text-[9px] font-bold uppercase tracking-[0.22em] select-none first:pt-2"
      style={{ color: "rgba(255,255,255,0.32)" }}
    >
      {title}
    </p>
  );
}

/** Contextual nav that replaces the global nav when you're inside a specific site. */
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
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      <Link
        href="/my-sites"
        className="mb-3 flex items-center gap-1 rounded-md px-3 py-1.5 text-[12px] transition-colors hover:text-white"
        style={{ color: "rgba(255,255,255,0.42)" }}
      >
        ← My Sites
      </Link>

      <div
        className="mx-2 mb-3 rounded-lg px-3 py-2.5"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <p className="truncate text-[13px] font-bold text-white">{siteName}</p>
        <p className="mt-0.5 text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
          Website
        </p>
      </div>

      <div className="space-y-0.5">
        <NavItem href={base} label="Overview" active={pathname === base} />
        <NavItem href={editHref} label="Edit site" active={pathname.startsWith(`/create/${siteId}`)} />
        <NavItem
          href={`${base}?section=analytics`}
          label="Analytics"
          active={false}
        />
        <NavItem
          href={`${base}?section=themes`}
          label="Themes"
          active={false}
        />
        <NavItem
          href={`${base}?section=seo`}
          label="SEO & domains"
          active={false}
        />
        <NavItem
          href={`${base}?section=settings`}
          label="Settings"
          active={false}
        />
      </div>
    </nav>
  );
}

/** Left sidebar — Shopify-style organization with accordion children + contextual site nav. */
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

  if (
    pathname === "/" ||
    isMarketingPath(pathname) ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup")
  ) {
    return null;
  }

  // Detect contextual site context: /my-sites/[id]
  const siteDetailMatch = pathname.match(/^\/my-sites\/([^/?#]+)/);
  const currentSiteId = siteDetailMatch?.[1] ?? null;
  const currentSite = currentSiteId
    ? portfolioSites.find((s) => s.key === currentSiteId)
    : null;

  return (
    <aside
      className={`hidden md:flex w-[11.5rem] lg:w-[12.5rem] shrink-0 flex-col sticky top-0 h-screen overflow-y-auto ${className}`}
      style={{ background: KEBU.black, color: KEBU.white }}
    >
      {/* Brand accent bar */}
      <div
        className="h-[3px] w-full shrink-0"
        style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange}, ${KEBU.orangeLight})` }}
      />

      {/* Logo + workspace switcher */}
      <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Link href={homeHref} className="group flex items-center gap-2.5">
          <KebuMark size={26} />
          <div className="min-w-0">
            <span className="block text-xs font-black uppercase tracking-[0.2em] text-white group-hover:text-[#FF5500] transition-colors">
              Kebu
            </span>
            {ready ? (
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-white/40 truncate">
                {workspaceLabel(ws)}
              </span>
            ) : null}
          </div>
        </Link>
        <Link
          href="/start?pick=1"
          className="mt-2.5 inline-block text-[10px] text-white/40 hover:text-[#FF5500] transition-colors"
        >
          Switch workspace →
        </Link>
      </div>

      <KebuAccountContextSwitcher />

      {/* Yande AI quick-access button */}
      <Link
        href="/yande"
        className="mx-2 mt-2 mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors"
        style={{
          background: isActive(pathname, "/yande") ? "rgba(201,169,110,0.15)" : "rgba(255,255,255,0.05)",
          border: "1px solid rgba(201,169,110,0.2)",
        }}
      >
        <YandeMark size={22} />
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-white leading-tight">Yande AI</p>
          <p className="text-[9px] leading-tight" style={{ color: "rgba(255,255,255,0.38)" }}>Ask anything</p>
        </div>
      </Link>

      {/* Contextual site nav OR global nav */}
      {currentSiteId ? (
        <SiteContextNav
          siteId={currentSiteId}
          siteName={currentSite?.title ?? "Site"}
          pathname={pathname}
          editorUrl={currentSite?.editorUrl ?? null}
        />
      ) : (
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {/* Opportunity */}
          <div className="space-y-0.5">
            {PRODUCT_NAV.opportunity.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                active={
                  isActive(pathname, item.href) ||
                  (item.href === "/opportunity" && pathname === "/opportunity/intake")
                }
              />
            ))}
          </div>

          {ws === "kebu" ? (
            <>
              <NavGroup title="Explore" />
              <div className="space-y-0.5">
                {PRODUCT_NAV.kebu.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={isActive(pathname, item.href, item.exact)}
                  />
                ))}
              </div>
            </>
          ) : null}

          {ws === "business" ? (
            <>
              <NavGroup title="My KEBU" />
              <div className="space-y-0.5">
                <NavAccordion
                  href={businessNavHref("/business", activeBusinessId)}
                  label="My Businesses"
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
                          .map((s) => ({
                            label: s.title,
                            href: `/my-sites/${s.key}`,
                            exact: true,
                          }))
                      : []
                  }
                />
                <NavItem
                  href="/messages"
                  label="Messages"
                  active={isActive(pathname, "/messages")}
                />
              </div>

              <NavGroup title="Aesthetic store" />
              <div className="space-y-0.5">
                <NavItem
                  href="/create/aesthetics"
                  label="Aesthetic Gallery"
                  active={isActive(pathname, "/create/aesthetics", true)}
                />
                <NavItem
                  href="/create/new"
                  label="Build a site"
                  active={isActive(pathname, "/create/new", true)}
                />
              </div>

              <NavGroup title="Shop" />
              <div className="space-y-0.5">
                <NavItem
                  href="/shop"
                  label="Kebu Shop"
                  active={isActive(pathname, "/shop", true)}
                />
              </div>

              <NavGroup title="Studio" />
              <div className="space-y-0.5">
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

              <NavGroup title="Alkebulan" />
              <div className="space-y-0.5">
                <NavItem
                  href="/b2b"
                  label="Alkebulan"
                  active={isActive(pathname, "/b2b")}
                />
              </div>
            </>
          ) : null}

          {ws === "studio" ? (
            <>
              <NavGroup title="Studio" />
              <div className="space-y-0.5">
                <NavItem href="/studio" label="Kebu Studio" active={isActive(pathname, "/studio", true)} />
                <NavItem href="/studio/new" label="New design" active={isActive(pathname, "/studio/new")} />
                <NavItem href="/studio/brand" label="Brand DNA" active={isActive(pathname, "/studio/brand")} />
                <NavItem href="/studio/campaigns" label="Campaigns" active={isActive(pathname, "/studio/campaigns")} />
              </div>
            </>
          ) : null}
        </nav>
      )}

      <KebuSidebarAuthFooter variant="dark" />
    </aside>
  );
}
