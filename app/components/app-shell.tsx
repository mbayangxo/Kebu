"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackLink } from "@/app/components/back-link";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuNavShell } from "@/app/components/kebu-nav-shell";
import type { PortfolioNavSite } from "@/app/components/kebu-app-sidebar";
import { KebuAccountCorner } from "@/app/components/kebu-account-corner";
import { KebuMobileNav } from "@/app/components/kebu-mobile-nav";
import { DataModeDock, DataModeProvider } from "@/app/components/create/data-mode-provider";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";
import "@/app/components/create/kebu-site-responsive.css";

export type { PortfolioNavSite };

function fallbackForPath(pathname: string): string {
  if (pathname.startsWith("/my-sites/")) return MY_SITES_HREF;
  if (pathname === MY_SITES_HREF) return "/business";
  if (pathname.startsWith("/create/sites")) return MY_SITES_HREF;
  if (pathname === "/create/domains" || pathname === "/create/templates" || pathname === "/create/aesthetics") {
    return "/create/aesthetics";
  }
  if (pathname === "/create" || pathname === "/create/") return "/create/aesthetics";
  if (pathname.startsWith("/create")) return "/create/aesthetics";
  if (pathname.startsWith("/shop")) return "/shop";
  if (pathname.startsWith("/business/")) return "/business";
  if (pathname.startsWith("/studio/")) return "/studio";
  if (pathname.startsWith("/opportunity/")) return "/opportunity";
  if (pathname === "/account") return "/dashboard";
  return "/dashboard";
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
  const publicSurface =
    pathname === "/" ||
    isMarketingPath(pathname) ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  if (publicSurface) {
    return <div className="min-h-screen" style={{ background: KEBU.bright, color: KEBU.black }}>{children}</div>;
  }

  const fallback = fallbackForPath(pathname);

  return (
    <DataModeProvider>
      <div
        className="kebu-app min-h-screen flex"
        style={{ background: KEBU.bright, color: KEBU.black }}
      >
        <KebuNavShell />

        <div className="flex-1 min-w-0 flex flex-col">
          <header
            className="sticky top-0 z-30 md:hidden"
            style={{ background: KEBU.black, borderBottom: `2px solid ${KEBU.orange}` }}
          >
            <div
              className="h-[3px] w-full"
              style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }}
            />
            <div className="flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <BackLink fallbackHref={fallback} variant="onDark" />
              </div>
              <p className="text-sm font-bold truncate text-white flex-1 text-center" style={{ fontFamily: "var(--font-fraunces)" }}>
                {title}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <KebuAccountCorner onDark />
                <Link href="/" className="shrink-0">
                  <KebuMark size={22} />
                </Link>
              </div>
            </div>
          </header>

          <div
            className="hidden md:flex items-center justify-between gap-3 px-8 lg:px-10 py-3.5 sticky top-0 z-30 backdrop-blur-md"
            style={{
              background: "rgba(255,251,247,0.92)",
              borderBottom: `1px solid rgba(255,85,0,0.15)`,
            }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <BackLink fallbackHref={fallback} variant="strong" />
              <h1
                className="text-sm font-bold truncate"
                style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
              >
                {title}
              </h1>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {actions}
              <KebuAccountCorner />
            </div>
          </div>

          {actions ? (
            <div
              className="flex md:hidden items-center justify-end gap-2 px-4 py-2"
              style={{ borderBottom: `1px solid rgba(255,85,0,0.12)` }}
            >
              {actions}
            </div>
          ) : null}

          {/* pb-20 ensures content clears the bottom tab bar on mobile */}
          <main className="flex-1 min-h-0 pb-20 md:pb-8">{children}</main>
        </div>
        <DataModeDock />
      </div>
    </DataModeProvider>
  );
}
