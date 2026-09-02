"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackLink } from "@/app/components/back-link";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuAppSidebar, type PortfolioNavSite } from "@/app/components/kebu-app-sidebar";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";
import { KEBU } from "@/lib/kebu-brand";

export type { PortfolioNavSite };

function fallbackForPath(pathname: string): string {
  if (pathname.startsWith("/create/sites/")) return "/create/sites";
  if (pathname === "/create/sites" || pathname === "/create/domains" || pathname === "/create/templates") {
    return "/create";
  }
  if (pathname === "/create" || pathname === "/create/") return "/dashboard";
  if (pathname.startsWith("/create")) return "/create";
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

  // Marketing / auth pages: content only — never the logged-in left rail.
  if (publicSurface) {
    return <div className="min-h-screen" style={{ background: KEBU.bright, color: KEBU.black }}>{children}</div>;
  }

  const fallback = fallbackForPath(pathname);

  return (
    <div className="min-h-screen flex" style={{ background: KEBU.bright, color: KEBU.black }}>
      <KebuAppSidebar portfolioSites={portfolioSites} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header
          className="sticky top-0 z-30 lg:hidden"
          style={{ background: KEBU.black, borderBottom: `2px solid ${KEBU.orange}` }}
        >
          <div
            className="h-[3px] w-full"
            style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }}
          />
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <BackLink fallbackHref={fallback} variant="onDark" />
            <p className="text-sm font-bold truncate text-white" style={{ fontFamily: "var(--font-fraunces)" }}>
              {title}
            </p>
            <Link href="/" className="shrink-0">
              <KebuMark size={24} />
            </Link>
          </div>
        </header>

        {/* Desktop top bar — back on every page */}
        <div
          className="hidden lg:flex items-center justify-between gap-3 px-8 py-3 sticky top-0 z-30 backdrop-blur-md"
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
          {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
        </div>

        {/* Mobile-only actions row when provided */}
        {actions ? (
          <div
            className="flex lg:hidden items-center justify-end gap-2 px-4 py-2"
            style={{ borderBottom: `1px solid rgba(255,85,0,0.12)` }}
          >
            {actions}
          </div>
        ) : null}

        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </div>
  );
}
