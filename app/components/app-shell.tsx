"use client";

import Link from "next/link";
import { BackLink } from "@/app/components/back-link";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuAppSidebar, type PortfolioNavSite } from "@/app/components/kebu-app-sidebar";
import { KEBU } from "@/lib/kebu-brand";

export type { PortfolioNavSite };

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
  return (
    <div className="min-h-screen flex" style={{ background: KEBU.bright, color: KEBU.black }}>
      <KebuAppSidebar portfolioSites={portfolioSites} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="sticky top-0 z-30 lg:hidden"
          style={{ background: KEBU.black, borderBottom: `2px solid ${KEBU.orange}` }}
        >
          <div
            className="h-[3px] w-full"
            style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }}
          />
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <BackLink fallbackHref="/dashboard" />
            <p className="text-sm font-bold truncate text-white" style={{ fontFamily: "var(--font-fraunces)" }}>
              {title}
            </p>
            <Link href="/" className="shrink-0">
              <KebuMark size={24} />
            </Link>
          </div>
        </header>

        {actions ? (
          <div
            className="hidden lg:flex items-center justify-end gap-2 px-8 py-3"
            style={{ borderBottom: `1px solid rgba(255,85,0,0.15)` }}
          >
            {actions}
          </div>
        ) : null}

        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </div>
  );
}
