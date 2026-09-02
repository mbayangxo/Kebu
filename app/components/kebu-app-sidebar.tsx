"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuSidebarAuthFooter } from "@/app/components/kebu-sidebar-auth-footer";
import { useKebuWorkspace } from "@/app/hooks/use-kebu-workspace";
import { KEBU } from "@/lib/kebu-brand";
import { PRODUCT_NAV } from "@/lib/navigation/product-nav";
import { workspaceHome, workspaceLabel } from "@/lib/navigation/kebu-workspace";

export type PortfolioNavSite = {
  key: string;
  title: string;
  editorUrl: string | null;
  previewPath: string | null;
};

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p
        className="text-[9px] font-bold uppercase tracking-[0.24em] mb-2 px-3"
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
      className="group flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all"
      style={{
        background: active ? KEBU.orange : "transparent",
        color: active ? KEBU.white : "rgba(255,255,255,0.82)",
        boxShadow: active ? "0 4px 20px rgba(255,85,0,0.35)" : "none",
      }}
    >
      <span
        className="w-1 h-4 rounded-full shrink-0 transition-opacity"
        style={{
          background: active ? KEBU.white : KEBU.red,
          opacity: active ? 0.9 : 0.5,
        }}
        aria-hidden
      />
      {label}
    </Link>
  );
}

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function renderItems(pathname: string, items: readonly { label: string; href: string; exact?: boolean }[]) {
  return items.map((item) => (
    <NavItem
      key={item.href}
      href={item.href}
      label={item.label}
      active={isActive(pathname, item.href, item.exact)}
    />
  ));
}

/** Left rail — workspace-aware. Black + orange + red. */
export function KebuAppSidebar({
  portfolioSites = [],
  className = "",
}: {
  portfolioSites?: PortfolioNavSite[];
  className?: string;
}) {
  const pathname = usePathname();
  const { workspace, ready } = useKebuWorkspace();
  const ws = workspace ?? "kebu";
  const homeHref = workspaceHome(ws);

  return (
    <aside
      className={`hidden lg:flex w-[15rem] shrink-0 flex-col sticky top-0 h-screen overflow-y-auto ${className}`}
      style={{ background: KEBU.black, color: KEBU.white }}
    >
      <div
        className="h-[3px] w-full shrink-0"
        style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange}, ${KEBU.orangeLight})` }}
      />

      <div className="px-4 py-5" style={{ borderBottom: "1px solid rgba(255,85,0,0.2)" }}>
        <Link href={homeHref} className="flex items-center gap-2.5 group">
          <KebuMark size={28} />
          <div className="min-w-0">
            <span className="block text-xs font-black uppercase tracking-[0.2em] text-white group-hover:text-[#FF5500] transition-colors">
              Kebu
            </span>
            {ready ? (
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-white/50 truncate">
                {workspaceLabel(ws)}
              </span>
            ) : null}
          </div>
        </Link>
        <Link
          href="/start?pick=1"
          className="mt-3 inline-block text-[10px] font-bold uppercase tracking-wider text-white/55 hover:text-[#FF5500] transition-colors"
        >
          Switch workspace →
        </Link>
      </div>

      <nav className="flex-1 px-2 py-5">
        <NavSection title="Connected">
          {renderItems(pathname, PRODUCT_NAV.account)}
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
        </NavSection>

        {ws === "kebu" ? (
          <NavSection title="Kebu">
            {renderItems(pathname, PRODUCT_NAV.kebu)}
            <NavItem href="/" label="Kebu home" active={pathname === "/"} />
          </NavSection>
        ) : null}

        {ws === "business" ? (
          <>
            <NavSection title="Kebu Business">
              {renderItems(pathname, PRODUCT_NAV.businessHome)}
            </NavSection>

            <NavSection title="Kebu Builder">
              {renderItems(pathname, PRODUCT_NAV.builder)}
              {portfolioSites.length > 0 ? (
                <div className="mt-2 ml-3 pl-3 space-y-0.5" style={{ borderLeft: `2px solid ${KEBU.red}` }}>
                  {portfolioSites.map((site) =>
                    site.editorUrl ? (
                      <NavItem
                        key={site.key}
                        href={site.editorUrl}
                        label={site.title}
                        active={pathname === site.editorUrl}
                      />
                    ) : null,
                  )}
                </div>
              ) : null}
            </NavSection>

            <NavSection title="Kebu Create">
              {renderItems(pathname, PRODUCT_NAV.create)}
            </NavSection>

            <NavSection title="Alkebulan">
              {renderItems(pathname, PRODUCT_NAV.alkebulan)}
            </NavSection>
          </>
        ) : null}

        {ws === "studio" ? (
          <NavSection title="Kebu Studio">
            {renderItems(pathname, PRODUCT_NAV.studio)}
          </NavSection>
        ) : null}
      </nav>

      <KebuSidebarAuthFooter variant="dark" />
    </aside>
  );
}
