"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";
import { useKebuUser } from "@/app/hooks/use-kebu-user";
import { displayFirstName } from "@/lib/account/user-profile";
import { KebuWorldSwitcher } from "@/app/components/kebu/kebu-world-switcher";

type NavChild = {
  label: string;
  href: string;
  icon: KebuIconName;
  matchPrefixes?: string[];
  badge?: "messages";
};

type NavGroup = {
  id: string;
  label: string;
  icon: KebuIconName;
  href?: string;
  children?: NavChild[];
  matchPrefixes?: string[];
};

const NAV: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    icon: "home",
    href: "/dashboard",
    matchPrefixes: ["/dashboard"],
  },
  {
    id: "everyday",
    label: "Everyday",
    icon: "calendar",
    children: [
      { label: "Calendar", href: "/calendar", icon: "calendar" },
      { label: "Tasks", href: "/tasks", icon: "work" },
      { label: "Library", href: "/library", icon: "library" },
      { label: "Docs", href: "/docs", icon: "work" },
    ],
    matchPrefixes: ["/calendar", "/tasks", "/library", "/docs"],
  },
  {
    id: "create",
    label: "Create",
    icon: "create",
    children: [
      { label: "Studio", href: "/studio", icon: "studio" },
      { label: "Sites", href: "/my-sites", icon: "builder", matchPrefixes: ["/my-sites", "/create/sites", "/create/domains", "/create/aesthetics"] },
      { label: "Code", href: "/create/code", icon: "work" },
      { label: "Design", href: "/studio/new", icon: "create" },
      { label: "Text", href: "/docs", icon: "work" },
      { label: "Video", href: "/studio/video/new", icon: "studio" },
      { label: "AI Tools", href: "/tools", icon: "yande" },
    ],
    matchPrefixes: ["/studio", "/my-sites", "/create"],
  },
  {
    id: "discover",
    label: "Discover",
    icon: "search",
    children: [
      { label: "Search", href: "/search", icon: "search" },
      { label: "Browser", href: "/browser", icon: "search" },
      { label: "Opportunity OS", href: "/opportunity", icon: "opportunity" },
    ],
    matchPrefixes: ["/search", "/browser", "/opportunity"],
  },
  {
    id: "connect",
    label: "Connect",
    icon: "message",
    children: [
      { label: "Mail", href: "/email", icon: "message" },
      { label: "Chat", href: "/chat", icon: "message", badge: "messages" },
      { label: "Messages", href: "/messages", icon: "message" },
    ],
    matchPrefixes: ["/email", "/chat", "/messages"],
  },
  {
    id: "more",
    label: "More",
    icon: "more",
    children: [
      { label: "Business", href: "/business", icon: "spaces" },
      { label: "Spaces", href: "/spaces", icon: "spaces" },
      { label: "People", href: "/people", icon: "people" },
      { label: "Shop", href: "/shop", icon: "commerce" },
      { label: "Rooms", href: "/rooms", icon: "spaces" },
    ],
    matchPrefixes: ["/business", "/spaces", "/people", "/shop", "/rooms"],
  },
];

function childActive(path: string, child: NavChild): boolean {
  const prefixes = child.matchPrefixes ?? [child.href];
  return prefixes.some((p) => path === p || path.startsWith(p + "/"));
}

function groupActive(path: string, group: NavGroup): boolean {
  if (group.href && (path === group.href || path.startsWith(group.href + "/"))) return true;
  if (group.matchPrefixes) return group.matchPrefixes.some((p) => path === p || path.startsWith(p + "/"));
  return group.children?.some((c) => childActive(path, c)) ?? false;
}

export function KebuNavShell() {
  const path = usePathname();
  const { profile } = useKebuUser();
  const [messages, setMessages] = useState(0);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const first = profile ? displayFirstName(profile.name, profile.email) : "";

  // Auto-open the active group
  useEffect(() => {
    const active = NAV.find((g) => g.id !== "home" && groupActive(path, g));
    if (active) setOpenGroup(active.id);
  }, [path]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/messages/unread-count", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { count?: number } | null) => { if (!cancelled && typeof d?.count === "number") setMessages(d.count); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (
    path === "/" ||
    isMarketingPath(path) ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/welcome")
  ) return null;

  const bg = "#0F0F0F";
  const border = "rgba(255,255,255,0.07)";
  const textMuted = "rgba(255,255,255,0.5)";
  const textDim = "rgba(255,255,255,0.35)";
  const hoverBg = "rgba(255,255,255,0.06)";

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="sticky top-0 hidden h-screen w-[160px] shrink-0 flex-col border-r md:flex"
        style={{ background: bg, borderColor: border, overflowY: "auto" }}
      >
        {/* Logo */}
        <div className="px-4 pt-5 pb-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 group focus-visible:outline-none" aria-label="Kebu Home">
            <KebuMark size={22} style={{ filter: "brightness(0) invert(1)" }} />
            <span className="text-[15px] font-black tracking-[-0.04em] text-white">kebu</span>
            <span className="text-[15px] font-black" style={{ color: KEBU.orange }}>•</span>
          </Link>
          <p className="mt-0.5 text-[8px] font-black uppercase tracking-[.18em]" style={{ color: textDim }}>ONE ID. MANY WORLDS.</p>
        </div>

        {/* User section */}
        <div className="mx-3 mb-3 rounded-xl border overflow-hidden" style={{ borderColor: border, background: "rgba(255,255,255,0.04)" }}>
          <Link href="/account" className="flex items-center gap-2.5 px-2.5 pt-2.5 pb-2 group focus-visible:outline-none">
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-black" style={{ background: KEBU.orange }}>
                {(first || "K").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-black text-white leading-none">{first || "My Kebu"}</p>
              <p className="mt-0.5 text-[9px] text-white/40 leading-none">My account →</p>
            </div>
          </Link>
          <div className="px-1.5 pb-1.5" style={{ borderTop: `1px solid ${border}` }}>
            <KebuWorldSwitcher dark compact />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Main navigation">
          {NAV.map((group) => {
            const isHome = group.id === "home";
            const active = groupActive(path, group);
            const open = openGroup === group.id;

            if (isHome) {
              return (
                <Link
                  key={group.id}
                  href={group.href!}
                  aria-current={active ? "page" : undefined}
                  className="flex min-h-9 items-center gap-2.5 rounded-xl px-2.5 text-[13px] font-semibold transition-colors hover:text-white focus-visible:outline-none mb-0.5"
                  style={{ background: active ? "rgba(255,85,0,0.18)" : "transparent", color: active ? "#FFFFFF" : textMuted }}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: active ? "rgba(255,85,0,0.25)" : "rgba(255,255,255,0.06)", color: active ? KEBU.orange : textMuted }}>
                    <KebuIcon name={group.icon} size={15} />
                  </span>
                  {group.label}
                </Link>
              );
            }

            return (
              <div key={group.id} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => setOpenGroup((c) => c === group.id ? null : group.id)}
                  aria-expanded={open}
                  className="flex min-h-9 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] font-semibold transition-colors hover:text-white focus-visible:outline-none"
                  style={{ background: active && !open ? "rgba(255,85,0,0.10)" : open ? hoverBg : "transparent", color: active || open ? "#FFFFFF" : textMuted }}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: active ? "rgba(255,85,0,0.25)" : "rgba(255,255,255,0.06)", color: active ? KEBU.orange : textMuted }}>
                    <KebuIcon name={group.icon} size={15} />
                  </span>
                  <span className="flex-1 truncate">{group.label}</span>
                  <span className="text-[10px] transition-transform" style={{ color: textDim, transform: open ? "rotate(90deg)" : "none" }}>›</span>
                </button>

                {open && group.children ? (
                  <div className="ml-3 mt-0.5 space-y-0.5 pl-3 border-l" style={{ borderColor: border }}>
                    {group.children.map((child) => {
                      const ca = childActive(path, child);
                      const count = child.badge === "messages" ? messages : 0;
                      return (
                        <Link
                          key={child.href + child.label}
                          href={child.href}
                          aria-current={ca ? "page" : undefined}
                          className="flex min-h-8 items-center gap-2 rounded-lg px-2.5 text-[12px] font-medium transition-colors hover:text-white focus-visible:outline-none"
                          style={{ background: ca ? KEBU.orange : "transparent", color: ca ? "#FFFFFF" : textMuted }}
                        >
                          <KebuIcon name={child.icon} size={14} style={{ color: ca ? "#FFFFFF" : textMuted }} />
                          <span className="flex-1 truncate">{child.label}</span>
                          {count > 0 ? (
                            <span className="rounded-full px-1.5 py-0.5 text-[8px] font-black text-white" style={{ background: KEBU.orange }}>
                              {count > 99 ? "99+" : count}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}

          {/* Separator */}
          <div className="my-2 border-t" style={{ borderColor: border }} />

          {/* + Add */}
          <Link href="/create/new"
            className="flex min-h-9 items-center gap-2.5 rounded-xl px-2.5 text-[13px] font-black transition-colors hover:text-white focus-visible:outline-none"
            style={{ color: textMuted }}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-[18px] font-black leading-none" style={{ background: KEBU.orange }}>+</span>
            Add
          </Link>
        </nav>

        {/* Bottom promo card */}
        <div className="m-3 mt-0">
          <div className="relative overflow-hidden rounded-2xl p-4" style={{ background: "linear-gradient(145deg,#1a0800,#2d1200)" }}>
            <div className="absolute -right-6 -top-6 h-20 w-20 opacity-40" style={{ background: `radial-gradient(circle,${KEBU.orange},transparent 70%)` }} />
            <p className="relative z-10 text-[12px] font-black leading-snug text-white">
              Your ideas belong<br />somewhere{" "}
              <span style={{ color: KEBU.orange }}>beautiful.</span>
            </p>
            <Link href="/create/new" className="relative z-10 mt-3 flex items-center gap-1 text-[10px] font-black" style={{ color: KEBU.orange }}>
              Start creating <span>→</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(60px+env(safe-area-inset-bottom))] items-start justify-around border-t px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-md md:hidden"
        style={{ background: "rgba(15,15,15,0.95)", borderColor: border }}
        aria-label="Primary navigation"
      >
        <Link href="/dashboard" className="flex min-w-12 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: path === "/dashboard" ? KEBU.orange : textMuted }}>
          <KebuIcon name="home" size={20} /><span>Home</span>
        </Link>
        <Link href="/search" className="flex min-w-12 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: path === "/search" || path.startsWith("/search/") ? KEBU.orange : textMuted }}>
          <KebuIcon name="search" size={20} /><span>Search</span>
        </Link>
        <Link href="/create/new" aria-label="Create" className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ background: `linear-gradient(135deg,${KEBU.orange},${KEBU.red})` }}>
          <KebuIcon name="create" size={20} />
        </Link>
        <Link href="/library" className="flex min-w-12 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: path === "/library" || path.startsWith("/library/") ? KEBU.orange : textMuted }}>
          <KebuIcon name="library" size={20} /><span>Library</span>
        </Link>
        <Link href="/account" className="flex min-w-12 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: path === "/account" || path.startsWith("/account/") ? KEBU.orange : textMuted }}>
          <KebuIcon name="people" size={20} /><span>Profile</span>
        </Link>
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
