"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { useKebuAccountContext } from "@/app/hooks/use-kebu-account-context";
import { KEBU } from "@/lib/kebu-brand";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";

type NavItem = {
  label: string;
  href: string;
  icon: KebuIconName;
  prefixes?: string[];
};

function itemActive(path: string, item: NavItem) {
  return (item.prefixes ?? [item.href]).some(
    (prefix) => path === prefix || path.startsWith(prefix + "/"),
  );
}

const PRIMARY: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Search", href: "/search", icon: "search" },
  { label: "Spaces", href: "/spaces", icon: "spaces", prefixes: ["/spaces", "/rooms"] },
  { label: "Studio", href: "/studio", icon: "studio" },
  { label: "Mail", href: "/email", icon: "message" },
  { label: "Opportunity", href: "/opportunity", icon: "opportunity" },
];

const GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Create",
    items: [
      { label: "Studio", href: "/studio", icon: "studio" },
      { label: "Sites", href: "/my-sites", icon: "builder", prefixes: ["/my-sites", "/create"] },
      { label: "Shop", href: "/shop", icon: "commerce" },
    ],
  },
  {
    label: "Organize",
    items: [
      { label: "Library", href: "/library", icon: "library", prefixes: ["/library", "/docs"] },
      { label: "Work", href: "/work", icon: "work", prefixes: ["/work", "/tasks", "/calendar"] },
    ],
  },
  {
    label: "Connect",
    items: [
      { label: "Spaces", href: "/spaces", icon: "spaces", prefixes: ["/spaces", "/rooms"] },
      { label: "People", href: "/people", icon: "people" },
      { label: "Mail", href: "/email", icon: "message" },
    ],
  },
  {
    label: "Build",
    items: [
      { label: "Businesses", href: "/business", icon: "spaces", prefixes: ["/business"] },
      { label: "Opportunity", href: "/opportunity", icon: "opportunity" },
      { label: "Finance", href: "/finance", icon: "work" },
    ],
  },
  {
    label: "Explore",
    items: [
      { label: "Search", href: "/search", icon: "search" },
      { label: "Browser", href: "/browser", icon: "universe" },
    ],
  },
];

function AppIcon({
  item,
  path,
  compact = false,
  onNavigate,
}: {
  item: NavItem;
  path: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const active = itemActive(path, item);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={
        compact
          ? "group flex h-10 w-10 items-center justify-center rounded-[11px] outline-none transition hover:bg-black/[.045] focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
          : "group flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[14px] px-2 text-center outline-none transition hover:bg-black/[.035] focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
      }
      style={{
        background: active ? "rgba(255,106,0,.11)" : undefined,
        color: active ? KEBU.orange : KEBU.black,
      }}
    >
      <KebuIcon name={item.icon} size={compact ? 18 : 21} />
      {!compact ? <span className="text-[9px] font-semibold">{item.label}</span> : null}
    </Link>
  );
}

export function KebuNavShell() {
  const path = usePathname();
  const { context } = useKebuAccountContext();
  const [launcherOpen, setLauncherOpen] = useState(false);

  if (
    path === "/" ||
    isMarketingPath(path) ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/welcome") ||
    path.startsWith("/studio") ||
    path.startsWith("/email") ||
    path.startsWith("/browser")
  ) {
    return null;
  }

  const spaceLabel =
    context?.mode === "business" && context.activeBusiness?.name
      ? context.activeBusiness.name
      : "Kebu";

  return (
    <>
      <aside
        className="sticky top-0 hidden h-screen w-[66px] shrink-0 flex-col items-center border-r bg-white py-3 md:flex"
        style={{ borderColor: KEBU.borders.default }}
        aria-label="Kebu navigation"
      >
        <Link href="/dashboard" aria-label="Kebu Home" className="mb-2 flex h-10 w-10 items-center justify-center">
          <KebuMark size={29} />
        </Link>

        <button
          type="button"
          aria-label="Open Kebu apps"
          aria-expanded={launcherOpen}
          onClick={() => setLauncherOpen((value) => !value)}
          className="mb-3 grid h-10 w-10 grid-cols-2 place-content-center gap-[3px] rounded-[11px] border outline-none transition hover:bg-black/[.035] focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
          style={{ borderColor: KEBU.borders.default }}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="h-[5px] w-[5px] rounded-[2px] bg-black/70" />
          ))}
        </button>

        <nav className="flex flex-1 flex-col items-center gap-1">
          {PRIMARY.map((item) => (
            <AppIcon key={item.label} item={item} path={path} compact />
          ))}
        </nav>

        <div className="flex flex-col items-center gap-1">
          <Link
            href="/settings"
            title="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-[11px] text-black/55 transition hover:bg-black/[.035]"
          >
            <KebuIcon name="settings" size={18} />
          </Link>
          <Link
            href="/account"
            title="Account"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-[9px] font-semibold text-white"
          >
            ME
          </Link>
        </div>
      </aside>

      {launcherOpen ? (
        <>
          <button
            type="button"
            aria-label="Close Kebu apps"
            className="fixed inset-0 z-[70] hidden bg-black/5 md:block"
            onClick={() => setLauncherOpen(false)}
          />
          <section className="fixed left-[76px] top-3 z-[80] hidden w-[380px] overflow-hidden rounded-[22px] border bg-[#FFFCF8] shadow-[0_24px_70px_rgba(10,10,10,.16)] md:block" style={{ borderColor: KEBU.borders.default }}>
            <header className="flex items-start justify-between border-b px-4 py-4" style={{ borderColor: KEBU.borders.default }}>
              <div>
                <p className="text-[17px] font-semibold tracking-[-.025em]">Kebu</p>
                <p className="mt-0.5 max-w-[260px] truncate text-[9px] text-black/38">{spaceLabel}</p>
              </div>
              <button type="button" onClick={() => setLauncherOpen(false)} className="text-lg text-black/30">×</button>
            </header>
            <div className="max-h-[calc(100vh-90px)] overflow-y-auto p-3">
              {GROUPS.map((group) => (
                <section key={group.label} className="border-b py-3 last:border-b-0" style={{ borderColor: KEBU.borders.subtle }}>
                  <p className="mb-2 px-1 text-[8px] font-semibold uppercase tracking-[.14em] text-black/30">{group.label}</p>
                  <div className="grid grid-cols-3 gap-1">
                    {group.items.map((item) => (
                      <AppIcon key={item.label + item.href} item={item} path={path} onNavigate={() => setLauncherOpen(false)} />
                    ))}
                  </div>
                </section>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-3">
                <Link onClick={() => setLauncherOpen(false)} href="/settings" className="flex items-center gap-2 rounded-[12px] border px-3 py-3 text-[9px] font-semibold" style={{ borderColor: KEBU.borders.default }}>
                  <KebuIcon name="settings" size={16} /> Settings
                </Link>
                <Link onClick={() => setLauncherOpen(false)} href="/account" className="flex items-center gap-2 rounded-[12px] border px-3 py-3 text-[9px] font-semibold" style={{ borderColor: KEBU.borders.default }}>
                  <KebuIcon name="people" size={16} /> Account
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(58px+env(safe-area-inset-bottom))] items-start justify-around border-t bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur md:hidden"
        style={{ borderColor: KEBU.borders.default }}
        aria-label="Primary navigation"
      >
        {PRIMARY.slice(0, 4).map((item) => {
          const active = itemActive(path, item);
          return (
            <Link key={item.label} href={item.href} className="flex min-w-14 flex-col items-center gap-1 text-[8px] font-semibold" style={{ color: active ? KEBU.orange : KEBU.muted }}>
              <KebuIcon name={item.icon} size={18} /><span>{item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setLauncherOpen(true)} className="flex min-w-14 flex-col items-center gap-1 text-[8px] font-semibold" style={{ color: KEBU.muted }}>
          <KebuIcon name="more" size={18} /><span>More</span>
        </button>
      </nav>
    </>
  );
}

export function KebuNavSidebar() {
  return <KebuNavShell />;
}
