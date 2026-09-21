"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KebuWorldSwitcher } from "@/app/components/kebu/kebu-world-switcher";
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

function NavLink({ item, path }: { item: NavItem; path: string }) {
  const active = itemActive(path, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-[12px] font-bold outline-none transition hover:bg-black/[.025] focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
      style={{
        background: active ? "rgba(255,106,0,.08)" : "transparent",
        color: active ? KEBU.black : KEBU.muted,
      }}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-[10px]"
        style={{
          background: active ? KEBU.black : "transparent",
          color: active ? KEBU.orange : "currentColor",
        }}
      >
        <KebuIcon name={item.icon} size={17} />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

const PERSONAL_ITEMS: NavItem[] = [
  { label: "Studio", href: "/studio", icon: "studio" },
  { label: "Spaces", href: "/spaces", icon: "spaces" },
  { label: "Rooms", href: "/rooms", icon: "spaces" },
  { label: "Library", href: "/library", icon: "library" },
  { label: "Documents", href: "/docs", icon: "work" },
  { label: "Tasks", href: "/tasks", icon: "work" },
  { label: "Calendar", href: "/calendar", icon: "calendar" },
  { label: "People", href: "/people", icon: "people" },
  { label: "Mail", href: "/email", icon: "message" },
  { label: "Search", href: "/search", icon: "search" },
  { label: "Opportunity OS", href: "/opportunity", icon: "opportunity" },
];

const BUSINESS_ITEMS: NavItem[] = [
  { label: "My Businesses", href: "/business", icon: "spaces", prefixes: ["/business"] },
  { label: "Sites", href: "/my-sites", icon: "builder", prefixes: ["/my-sites", "/create"] },
  { label: "Shop", href: "/shop", icon: "commerce" },
  { label: "Customer messages", href: "/messages", icon: "message" },
  { label: "Business people", href: "/people?scope=business", icon: "people", prefixes: ["/people"] },
];

const SHARED_BUSINESS_ITEMS: NavItem[] = [
  { label: "Studio", href: "/studio", icon: "studio" },
  { label: "Spaces", href: "/spaces", icon: "spaces" },
  { label: "Rooms", href: "/rooms", icon: "spaces" },
  { label: "Library", href: "/library", icon: "library" },
  { label: "Documents", href: "/docs", icon: "work" },
  { label: "Tasks", href: "/tasks", icon: "work" },
  { label: "Calendar", href: "/calendar", icon: "calendar" },
  { label: "Mail", href: "/email", icon: "message" },
  { label: "Search", href: "/search", icon: "search" },
  { label: "Opportunity OS", href: "/opportunity", icon: "opportunity" },
];

export function KebuNavShell() {
  const path = usePathname();
  const { context } = useKebuAccountContext();

  if (
    path === "/" ||
    isMarketingPath(path) ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/welcome") ||
    path.startsWith("/studio")
  ) {
    return null;
  }

  const businessMode = context?.mode === "business";
  const items = businessMode
    ? [...BUSINESS_ITEMS, ...SHARED_BUSINESS_ITEMS]
    : PERSONAL_ITEMS;

  return (
    <>
      <aside
        className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r bg-white md:flex"
        style={{ borderColor: KEBU.borders.default }}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Kebu Home">
            <KebuMark size={27} />
            <span className="text-xs font-black uppercase tracking-[.2em]">Kebu</span>
          </Link>
          <Link
            href="/studio/new"
            aria-label="Create something"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white"
            style={{ background: "linear-gradient(135deg,#FF6A00,#FF1F1F)" }}
          >
            <KebuIcon name="create" size={17} />
          </Link>
        </div>

        <KebuWorldSwitcher />

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <NavLink item={{ label: "Home", href: "/dashboard", icon: "home" }} path={path} />

          {businessMode ? (
            <p className="px-3 pb-1 pt-4 text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>
              Business
            </p>
          ) : (
            <p className="px-3 pb-1 pt-4 text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.faint }}>
              Personal
            </p>
          )}

          <div className="space-y-0.5">
            {items.map((item, index) => (
              <div key={item.label + item.href}>
                {businessMode && index === BUSINESS_ITEMS.length ? (
                  <p className="px-3 pb-1 pt-4 text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.faint }}>
                    Shared tools
                  </p>
                ) : null}
                <NavLink item={item} path={path} />
              </div>
            ))}
          </div>

          <Link
            href="/tools"
            className="mt-4 flex min-h-10 items-center gap-3 rounded-xl px-2.5 text-[11px] font-semibold outline-none transition hover:bg-black/[.025] focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
            style={{ color: KEBU.muted }}
          >
            <span className="flex h-8 w-8 items-center justify-center">
              <KebuIcon name="more" size={17} />
            </span>
            <span>Tools</span>
          </Link>
        </nav>

        <div className="border-t p-2" style={{ borderColor: KEBU.borders.subtle }}>
          <Link
            href="/account"
            className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-[12px] font-bold"
            style={{ color: KEBU.muted }}
          >
            <KebuIcon name="settings" size={17} />
            Account
          </Link>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(62px+env(safe-area-inset-bottom))] items-start justify-around border-t bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur md:hidden"
        style={{ borderColor: KEBU.borders.default }}
        aria-label="Primary navigation"
      >
        <Link href="/dashboard" className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: path === "/dashboard" ? KEBU.orange : KEBU.muted }}>
          <KebuIcon name="home" size={19} /><span>Home</span>
        </Link>
        <Link href="/studio" className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: KEBU.muted }}>
          <KebuIcon name="studio" size={19} /><span>Studio</span>
        </Link>
        <Link href={businessMode ? "/business" : "/rooms"} className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: KEBU.muted }}>
          <KebuIcon name={businessMode ? "spaces" : "people"} size={19} />
          <span>{businessMode ? "Business" : "Rooms"}</span>
        </Link>
        <Link href="/search" className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: KEBU.muted }}>
          <KebuIcon name="search" size={19} /><span>Search</span>
        </Link>
        <Link href="/tools" className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: KEBU.muted }}>
          <KebuIcon name="more" size={19} /><span>Tools</span>
        </Link>
      </nav>
    </>
  );
}

export function KebuNavSidebar() {
  return <KebuNavShell />;
}
