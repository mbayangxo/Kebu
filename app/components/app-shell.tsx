"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackLink } from "@/app/components/back-link";
import { KebuMark } from "@/app/components/kebu-mark";
import { KEBU } from "@/lib/kebu-brand";
import { PRODUCT_NAV } from "@/lib/navigation/product-nav";

export type PortfolioNavSite = {
  key: string;
  title: string;
  editorUrl: string | null;
  previewPath: string | null;
};

function NavSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <p
        className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 px-3"
        style={{ color: KEBU.orange }}
      >
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      style={{
        background: active ? "rgba(255,85,0,0.1)" : "transparent",
        color: active ? KEBU.orange : KEBU.black,
      }}
    >
      {label}
    </Link>
  );
}

export function AppShell({
  title,
  children,
  portfolioSites = [],
  actions,
}: {
  title: string;
  children: React.ReactNode;
  portfolioSites?: PortfolioNavSite[];
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex" style={{ background: KEBU.bright, color: KEBU.black }}>
      <aside
        className="hidden lg:flex w-60 shrink-0 flex-col border-r sticky top-0 h-screen overflow-y-auto"
        style={{ borderColor: KEBU.border, background: KEBU.white }}
      >
        <div className="p-4" style={{ borderBottom: `1px solid ${KEBU.border}` }}>
          <Link href="/" className="flex items-center gap-2 mb-4">
            <KebuMark size={28} />
            <span className="text-xs font-bold uppercase tracking-[0.14em]">Kebu</span>
          </Link>
          <BackLink fallbackHref="/dashboard" />
        </div>

        <nav className="flex-1 p-3">
          <NavSection title="Opportunity OS">
            {PRODUCT_NAV.opportunity.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                active={pathname.startsWith(item.href)}
              />
            ))}
          </NavSection>

          <NavSection title="Kebu Builder">
            {PRODUCT_NAV.builder.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                active={pathname === item.href || pathname.startsWith("/create/")}
              />
            ))}
            {portfolioSites.length > 0 ? (
              <div className="mt-2 pl-2 space-y-0.5" style={{ borderLeft: `2px solid ${KEBU.border}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1" style={{ color: KEBU.faint }}>
                  My sites
                </p>
                {portfolioSites.map((site) => (
                  <div key={site.key} className="space-y-0.5">
                    {site.editorUrl ? (
                      <NavItem
                        href={site.editorUrl}
                        label={site.title}
                        active={pathname === site.editorUrl}
                      />
                    ) : (
                      <span className="block px-3 py-2 text-sm" style={{ color: KEBU.muted }}>
                        {site.title}
                      </span>
                    )}
                    {site.previewPath ? (
                      <a
                        href={site.previewPath}
                        target="_blank"
                        rel="noreferrer"
                        className="block px-3 py-1 text-[11px] font-semibold underline"
                        style={{ color: KEBU.faint }}
                      >
                        View live
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </NavSection>

          <NavSection title="Business">
            {PRODUCT_NAV.business.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                active={pathname.startsWith(item.href)}
              />
            ))}
          </NavSection>
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="sticky top-0 z-30 backdrop-blur-md lg:hidden"
          style={{ background: "rgba(255,251,247,0.95)", borderBottom: `1px solid ${KEBU.border}` }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <BackLink fallbackHref="/dashboard" />
            <p className="text-sm font-bold truncate" style={{ fontFamily: "var(--font-fraunces)" }}>
              {title}
            </p>
            <Link href="/" className="shrink-0">
              <KebuMark size={24} />
            </Link>
          </div>
        </header>

        {actions ? (
          <div
            className="hidden lg:flex items-center justify-end gap-2 px-6 py-3"
            style={{ borderBottom: `1px solid ${KEBU.border}` }}
          >
            {actions}
          </div>
        ) : null}

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
