"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KebuWorldSwitcher } from "@/app/components/kebu/kebu-world-switcher";
import { KEBU } from "@/lib/kebu-brand";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";

type ChildItem = {
  label: string;
  href: string;
  icon: KebuIconName;
  prefixes?: string[];
  badge?: "messages";
};

type NavGroup = {
  id: string;
  label: string;
  icon: KebuIconName;
  children: ChildItem[];
};

const GROUPS: NavGroup[] = [
  {
    id: "create",
    label: "Create",
    icon: "create",
    children: [
      { label: "Studio", href: "/studio", icon: "studio" },
      { label: "Sites", href: "/my-sites", icon: "builder", prefixes: ["/my-sites", "/create"] },
      { label: "New site", href: "/create/new", icon: "create" },
    ],
  },
  {
    id: "business",
    label: "Business",
    icon: "spaces",
    children: [
      { label: "Business home", href: "/business", icon: "spaces", prefixes: ["/business", "/b2b", "/ka-score"] },
      { label: "Shop", href: "/shop", icon: "commerce" },
    ],
  },
  {
    id: "work",
    label: "Work",
    icon: "work",
    children: [
      { label: "Spaces", href: "/spaces", icon: "spaces" },
      { label: "Rooms", href: "/rooms", icon: "spaces" },
      { label: "Library", href: "/library", icon: "library" },
      { label: "Docs", href: "/docs", icon: "work" },
      { label: "Tasks", href: "/tasks", icon: "work" },
      { label: "Calendar", href: "/calendar", icon: "calendar" },
      { label: "People", href: "/people", icon: "people" },
    ],
  },
  {
    id: "connect",
    label: "Connect",
    icon: "message",
    children: [
      { label: "Mail", href: "/email", icon: "message" },
      { label: "Chat", href: "/chat", icon: "message", badge: "messages" },
      { label: "Customer messages", href: "/messages", icon: "message" },
    ],
  },
  {
    id: "discover",
    label: "Discover",
    icon: "search",
    children: [
      { label: "Search", href: "/search", icon: "search" },
      { label: "Browser", href: "/browser", icon: "search" },
      { label: "Opportunity OS", href: "/opportunity", icon: "opportunity", prefixes: ["/opportunity"] },
    ],
  },
];

function itemActive(path: string, item: ChildItem) {
  const prefixes = item.prefixes ?? [item.href];
  return prefixes.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

function groupActive(path: string, group: NavGroup) {
  return group.children.some((item) => itemActive(path, item));
}

function activeGroupId(path: string) {
  return GROUPS.find((group) => groupActive(path, group))?.id ?? null;
}

function ChildLink({ item, path, count = 0 }: { item: ChildItem; path: string; count?: number }) {
  const active = itemActive(path, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-[11px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
      style={{ background: active ? "rgba(255,106,0,.15)" : "transparent", color: active ? "#FFFFFF" : "rgba(255,255,255,0.55)" }}
    >
      <KebuIcon name={item.icon} size={14} style={{ color: active ? KEBU.orange : "currentColor" }} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count > 0 ? <span className="rounded-full px-1.5 py-0.5 text-[8px] font-black text-white" style={{ background: KEBU.orange }}>{count > 99 ? "99+" : count}</span> : null}
    </Link>
  );
}

export function KebuNavShell() {
  const path = usePathname();
  const [messages, setMessages] = useState(0);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    setOpenGroup(null);
  }, [path]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/messages/unread-count", { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!cancelled && typeof data?.count === "number") setMessages(data.count);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const currentGroup = useMemo(() => GROUPS.find((group) => group.id === openGroup) ?? null, [openGroup]);

  if (
    path === "/" ||
    isMarketingPath(path) ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/welcome")
  ) return null;

  const createBg = "linear-gradient(135deg," + KEBU.orange + "," + KEBU.red + ")";

  const sidebarText = "rgba(255,255,255,0.55)";
  const sidebarTextActive = "#FFFFFF";
  const sidebarBorder = "rgba(255,255,255,0.07)";
  const sidebarHover = "rgba(255,255,255,0.05)";

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[160px] shrink-0 flex-col border-r md:flex" style={{ background: KEBU.surface.sidebar, borderColor: sidebarBorder }}>
        <div className="flex h-14 items-center justify-between px-3">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Kebu Home">
            <KebuMark size={24} className="object-contain" style={{ filter: "brightness(0) invert(1)" }} />
            <span className="text-sm font-black tracking-[-0.04em]" style={{ color: sidebarTextActive }}>kebu</span>
          </Link>
          <Link href="/create/new" aria-label="Create" className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ background: createBg }}>
            <KebuIcon name="create" size={15} />
          </Link>
        </div>

        <div className="px-2 pb-1">
          <KebuWorldSwitcher compact dark />
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <Link
            href="/dashboard"
            className="flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-[12px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
            style={{ background: path === "/dashboard" ? "rgba(255,106,0,.15)" : "transparent", color: path === "/dashboard" ? sidebarTextActive : sidebarText }}
            onMouseEnter={(e) => { if (path !== "/dashboard") e.currentTarget.style.background = sidebarHover; }}
            onMouseLeave={(e) => { if (path !== "/dashboard") e.currentTarget.style.background = "transparent"; }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: path === "/dashboard" ? "rgba(255,85,0,0.25)" : "transparent", color: path === "/dashboard" ? KEBU.orange : sidebarText }}>
              <KebuIcon name="home" size={17} />
            </span>
            <span>Home</span>
          </Link>

          <div className="mt-2 space-y-0.5">
            {GROUPS.map((group) => {
              const active = groupActive(path, group);
              const open = openGroup === group.id;
              return (
                <div key={group.id}>
                  <button
                    type="button"
                    onClick={() => setOpenGroup((current) => current === group.id ? null : group.id)}
                    aria-expanded={open}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 text-left text-[12px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
                    style={{ background: active ? "rgba(255,106,0,.15)" : "transparent", color: active ? sidebarTextActive : sidebarText }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = sidebarHover; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: active ? "rgba(255,85,0,0.25)" : "transparent", color: active ? KEBU.orange : sidebarText }}>
                      <KebuIcon name={group.icon} size={17} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{group.label}</span>
                    <span className="text-[9px]" style={{ opacity: 0.4 }}>{open ? "▴" : "▾"}</span>
                  </button>

                  {open ? (
                    <div className="ml-8 mt-0.5 space-y-0.5 border-l pl-2" style={{ borderColor: sidebarBorder }}>
                      {group.children.map((item) => (
                        <ChildLink key={item.href + item.label} item={item} path={path} count={item.badge === "messages" ? messages : 0} />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <Link
            href="/tools"
            className="mt-3 flex min-h-10 items-center gap-3 rounded-xl px-2.5 text-[11px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
            style={{ color: sidebarText }}
            onMouseEnter={(e) => { e.currentTarget.style.background = sidebarHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span className="flex h-8 w-8 items-center justify-center"><KebuIcon name="more" size={17} /></span>
            <span>All apps</span>
          </Link>

          {currentGroup ? null : null}
        </nav>

        <div className="border-t p-2" style={{ borderColor: sidebarBorder }}>
          <Link href="/account" className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-[12px] font-bold" style={{ color: sidebarText }}><KebuIcon name="settings" size={17} /><span>Account</span></Link>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(62px+env(safe-area-inset-bottom))] items-start justify-around border-t bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur md:hidden" style={{ borderColor: KEBU.borders.default }} aria-label="Primary navigation">
        <Link href="/dashboard" className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: path === "/dashboard" ? KEBU.orange : KEBU.muted }}><KebuIcon name="home" size={19} /><span>Home</span></Link>
        <Link href="/studio" className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: path.startsWith("/studio") ? KEBU.orange : KEBU.muted }}><KebuIcon name="studio" size={19} /><span>Create</span></Link>
        <Link href="/business" className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: path.startsWith("/business") || path.startsWith("/shop") ? KEBU.orange : KEBU.muted }}><KebuIcon name="spaces" size={19} /><span>Business</span></Link>
        <Link href="/create/new" aria-label="New" className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ background: createBg }}><KebuIcon name="create" size={19} /></Link>
        <Link href="/tools" className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: KEBU.muted }}><KebuIcon name="more" size={19} /><span>Apps</span></Link>
      </nav>
    </>
  );
}

export function KebuNavSidebar() {
  return <KebuNavShell />;
}

export type PortfolioNavSite = {
  key: string;
  title: string;
  editorUrl: string | null;
  previewPath: string | null;
};
