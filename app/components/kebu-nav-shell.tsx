"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";
import { useKebuUser } from "@/app/hooks/use-kebu-user";
import { displayFirstName } from "@/lib/account/user-profile";

type FlyoutItem = { label: string; href: string; icon: KebuIconName };
type RailItem = {
  id: string;
  label: string;
  icon: KebuIconName;
  href?: string;
  flyout?: FlyoutItem[];
  badge?: "messages";
  matchPrefixes?: string[];
};

const CREATE_FLYOUT: FlyoutItem[] = [
  { label: "Studio", href: "/studio", icon: "studio" },
  { label: "Sites", href: "/my-sites", icon: "builder" },
  { label: "Code", href: "/create/code", icon: "work" },
  { label: "Design", href: "/studio/new", icon: "create" },
  { label: "Video", href: "/studio/video/new", icon: "studio" },
  { label: "AI Tools", href: "/tools", icon: "yande" },
  { label: "Templates", href: "/studio/templates", icon: "library" },
];

const DISCOVER_FLYOUT: FlyoutItem[] = [
  { label: "Search", href: "/search", icon: "search" },
  { label: "Browser", href: "/browser", icon: "search" },
  { label: "Opportunity OS", href: "/opportunity", icon: "opportunity" },
];

const CONNECT_FLYOUT: FlyoutItem[] = [
  { label: "Mail", href: "/email", icon: "message" },
  { label: "Chat", href: "/chat", icon: "message" },
  { label: "Messages", href: "/messages", icon: "message" },
];

const MORE_FLYOUT: FlyoutItem[] = [
  { label: "Business", href: "/business", icon: "spaces" },
  { label: "Spaces", href: "/spaces", icon: "spaces" },
  { label: "Calendar", href: "/calendar", icon: "calendar" },
  { label: "Library", href: "/library", icon: "library" },
  { label: "Tasks", href: "/tasks", icon: "work" },
  { label: "People", href: "/people", icon: "people" },
  { label: "Shop", href: "/shop", icon: "commerce" },
];

const RAIL: RailItem[] = [
  { id: "home", label: "Home", icon: "home", href: "/dashboard", matchPrefixes: ["/dashboard"] },
  { id: "create", label: "Create", icon: "create", flyout: CREATE_FLYOUT, matchPrefixes: ["/studio", "/my-sites", "/create"] },
  { id: "discover", label: "Discover", icon: "search", flyout: DISCOVER_FLYOUT, matchPrefixes: ["/search", "/browser", "/opportunity"] },
  { id: "connect", label: "Connect", icon: "message", badge: "messages", flyout: CONNECT_FLYOUT, matchPrefixes: ["/email", "/chat", "/messages"] },
  { id: "more", label: "More", icon: "more", flyout: MORE_FLYOUT, matchPrefixes: ["/business", "/spaces", "/calendar", "/library", "/tasks", "/people", "/shop"] },
];

function isRailActive(path: string, item: RailItem): boolean {
  if (item.href && (path === item.href || path.startsWith(item.href + "/"))) return true;
  if (item.matchPrefixes) {
    return item.matchPrefixes.some((p) => path === p || path.startsWith(p + "/"));
  }
  return false;
}

export function KebuNavShell() {
  const path = usePathname();
  const { profile } = useKebuUser();
  const [messages, setMessages] = useState(0);
  const [openFlyout, setOpenFlyout] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const first = profile ? displayFirstName(profile.name, profile.email) : "";

  useEffect(() => { setOpenFlyout(null); }, [path]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/messages/unread-count", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && typeof d?.count === "number") setMessages(d.count); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!openFlyout) return;
    const handler = (e: MouseEvent) => {
      if (railRef.current && !railRef.current.contains(e.target as Node)) {
        setOpenFlyout(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openFlyout]);

  if (
    path === "/" ||
    isMarketingPath(path) ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/welcome")
  ) return null;

  const sb = "rgba(255,255,255,0.5)";
  const sbBorder = "rgba(255,255,255,0.07)";
  const flyoutItems = openFlyout ? RAIL.find((r) => r.id === openFlyout)?.flyout ?? null : null;
  const flyoutLabel = openFlyout ? RAIL.find((r) => r.id === openFlyout)?.label : null;
  const createGrad = `linear-gradient(135deg,${KEBU.orange},${KEBU.red})`;

  return (
    <>
      {/* Desktop: icon rail + flyout panel */}
      <div ref={railRef} className="sticky top-0 hidden h-screen shrink-0 md:flex" style={{ zIndex: 40 }}>
        {/* 72px icon rail */}
        <aside className="flex h-full w-[72px] flex-col border-r" style={{ background: KEBU.surface.sidebar, borderColor: sbBorder }}>
          {/* Kebu mark */}
          <div className="flex h-14 items-center justify-center">
            <Link href="/dashboard" aria-label="Kebu Home" className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-white/10">
              <KebuMark size={20} style={{ filter: "brightness(0) invert(1)" }} />
            </Link>
          </div>

          {/* Rail items */}
          <nav className="flex flex-1 flex-col items-center gap-0.5 py-1" aria-label="Main navigation">
            {RAIL.map((item) => {
              const active = isRailActive(path, item);
              const isOpen = openFlyout === item.id;
              const hasBadge = item.badge === "messages" && messages > 0;

              if (item.href && !item.flyout) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="flex w-full flex-col items-center gap-1 px-2 py-2 focus-visible:outline-none"
                    style={{ color: active ? "#FFFFFF" : sb }}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
                      style={{ background: active ? "rgba(255,85,0,0.25)" : "transparent" }}>
                      <KebuIcon name={item.icon} size={20} style={{ color: active ? KEBU.orange : "currentColor" }} />
                    </span>
                    <span className="text-[9px] font-semibold leading-none">{item.label}</span>
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOpenFlyout((c) => c === item.id ? null : item.id)}
                  aria-expanded={isOpen}
                  className="relative flex w-full flex-col items-center gap-1 px-2 py-2 focus-visible:outline-none"
                  style={{ color: active || isOpen ? "#FFFFFF" : sb }}
                >
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
                    style={{ background: active ? "rgba(255,85,0,0.25)" : isOpen ? "rgba(255,255,255,0.08)" : "transparent" }}>
                    <KebuIcon name={item.icon} size={20} style={{ color: active ? KEBU.orange : "currentColor" }} />
                    {hasBadge ? (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full" style={{ background: KEBU.orange }} />
                    ) : null}
                  </span>
                  <span className="text-[9px] font-semibold leading-none">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Profile section at bottom */}
          <div className="flex flex-col items-center gap-2 border-t py-3" style={{ borderColor: sbBorder }}>
            <Link href="/account" className="flex flex-col items-center gap-1 group focus-visible:outline-none" aria-label="Your account">
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-transparent group-hover:ring-white/20 transition-all" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black text-black ring-2 ring-transparent group-hover:ring-white/20 transition-all" style={{ background: KEBU.orange }}>
                  {(first || "K").charAt(0).toUpperCase()}
                </span>
              )}
              {first ? <span className="text-[9px] font-semibold" style={{ color: sb }}>{first}</span> : null}
            </Link>
            <Link href="/account/settings" aria-label="Settings"
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/8 focus-visible:outline-none"
              style={{ color: sb }}>
              <KebuIcon name="settings" size={15} />
            </Link>
          </div>
        </aside>

        {/* Flyout panel */}
        {flyoutItems && openFlyout ? (
          <div className="flex h-full w-[220px] flex-col border-r bg-white shadow-2xl" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
            <div className="flex h-14 items-center justify-between border-b px-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
              <span className="text-[11px] font-black uppercase tracking-[.13em]" style={{ color: KEBU.orange }}>{flyoutLabel}</span>
              <Link href="/create/new" className="flex h-7 w-7 items-center justify-center rounded-full text-white text-[16px] font-black leading-none" style={{ background: createGrad }}>
                +
              </Link>
            </div>
            <nav className="flex-1 overflow-y-auto p-2" aria-label={`${flyoutLabel ?? ""} navigation`}>
              {flyoutItems.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-colors hover:bg-black/[0.04]"
                  style={{ color: path.startsWith(item.href) ? KEBU.black : "rgba(0,0,0,0.6)" }}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: path.startsWith(item.href) ? "rgba(255,85,0,0.12)" : "rgba(0,0,0,0.05)", color: path.startsWith(item.href) ? KEBU.orange : "rgba(0,0,0,0.4)" }}>
                    <KebuIcon name={item.icon} size={15} />
                  </span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(62px+env(safe-area-inset-bottom))] items-start justify-around border-t bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur md:hidden"
        style={{ borderColor: KEBU.borders.default }} aria-label="Primary navigation">
        <Link href="/dashboard" className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: path === "/dashboard" ? KEBU.orange : KEBU.muted }}>
          <KebuIcon name="home" size={19} /><span>Home</span>
        </Link>
        <Link href="/studio" className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: path.startsWith("/studio") ? KEBU.orange : KEBU.muted }}>
          <KebuIcon name="studio" size={19} /><span>Create</span>
        </Link>
        <Link href="/business" className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: path.startsWith("/business") || path.startsWith("/shop") ? KEBU.orange : KEBU.muted }}>
          <KebuIcon name="spaces" size={19} /><span>Business</span>
        </Link>
        <Link href="/create/new" aria-label="New" className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ background: createGrad }}>
          <KebuIcon name="create" size={19} />
        </Link>
        <Link href="/tools" className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: KEBU.muted }}>
          <KebuIcon name="more" size={19} /><span>Apps</span>
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
