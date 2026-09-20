"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KebuWorldSwitcher } from "@/app/components/kebu/kebu-world-switcher";
import { KEBU_TOOLS, parseKebuSetup, toolById, type KebuToolId } from "@/lib/account/kebu-setup";
import { KEBU } from "@/lib/kebu-brand";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";

type Item = { label: string; href: string; icon: KebuIconName; prefixes?: string[]; badge?: "messages" };

const CORE: Item[] = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Search", href: "/search", icon: "search" },
  { label: "Spaces", href: "/spaces", icon: "spaces" },
  { label: "Opportunities", href: "/opportunity", icon: "opportunity" },
];

function isOn(path: string, item: Item) {
  const prefixes = item.prefixes ?? [item.href];
  return prefixes.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

function NavItem({ item, path, count = 0 }: { item: Item; path: string; count?: number }) {
  const active = isOn(path, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="group flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-[12px] font-bold outline-none transition hover:bg-black/[.025] focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
      style={{ background: active ? "rgba(255,106,0,.08)" : "transparent", color: active ? KEBU.black : KEBU.muted }}
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: active ? KEBU.black : "transparent", color: active ? KEBU.orange : "currentColor" }}>
        <KebuIcon name={item.icon} size={17} />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count > 0 ? <span className="rounded-full px-1.5 py-0.5 text-[9px] font-black text-white" style={{ background: KEBU.orange }}>{count > 99 ? "99+" : count}</span> : null}
    </Link>
  );
}

function toolItem(id: KebuToolId): Item | null {
  const tool = toolById(id);
  if (!tool) return null;
  const prefixes =
    id === "sites" ? ["/my-sites", "/create"] :
    id === "business" ? ["/business", "/b2b", "/ka-score"] :
    undefined;
  return { label: tool.label, href: tool.href, icon: tool.icon as KebuIconName, prefixes, badge: id === "chat" ? "messages" : undefined };
}

export function KebuNavShell() {
  const path = usePathname();
  const [messages, setMessages] = useState(0);
  const [toolIds, setToolIds] = useState<KebuToolId[]>([]);
  const [launcherOpen, setLauncherOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/messages/unread-count", { credentials: "include" }).then((res) => res.ok ? res.json() : null),
      fetch("/api/me/kebu-setup", { credentials: "include" }).then((res) => res.ok ? res.json() : null),
    ]).then(([messageData, setupData]) => {
      if (cancelled) return;
      if (typeof messageData?.count === "number") setMessages(messageData.count);
      const setup = parseKebuSetup(setupData?.setup);
      setToolIds(setup.tools);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const pinned = useMemo(() => {
    const unique = toolIds.filter((id) => !["search", "opportunities", "spaces"].includes(id));
    return unique.slice(0, 6).map(toolItem).filter((item): item is Item => Boolean(item));
  }, [toolIds]);

  if (path === "/" || isMarketingPath(path) || path.startsWith("/login") || path.startsWith("/signup") || path.startsWith("/welcome")) return null;

  const createBg = "linear-gradient(135deg," + KEBU.orange + "," + KEBU.red + ")";

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r bg-white md:flex" style={{ borderColor: KEBU.borders.default }}>
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Kebu Home">
            <KebuMark size={27} />
            <span className="text-xs font-black uppercase tracking-[.2em]">Kebu</span>
          </Link>
          <Link href="/create" aria-label="Create" className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ background: createBg }}>
            <KebuIcon name="create" size={17} />
          </Link>
        </div>

        <KebuWorldSwitcher />

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <div className="space-y-0.5">{CORE.map((item) => <NavItem key={item.href} item={item} path={path} />)}</div>

          {pinned.length ? (
            <>
              <p className="px-3 pb-2 pt-6 text-[9px] font-black uppercase tracking-[.2em]" style={{ color: KEBU.faint }}>Your tools</p>
              <div className="space-y-0.5">{pinned.map((item) => <NavItem key={item.href} item={item} path={path} count={item.badge === "messages" ? messages : 0} />)}</div>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => setLauncherOpen((open) => !open)}
            aria-expanded={launcherOpen}
            className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 text-[12px] font-bold outline-none transition hover:bg-black/[.025] focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
            style={{ color: KEBU.muted }}
          >
            <span className="flex h-8 w-8 items-center justify-center"><KebuIcon name="more" size={18} /></span>
            <span>All tools</span>
            <span className="ml-auto text-[9px]">{launcherOpen ? "▴" : "▾"}</span>
          </button>

          {launcherOpen ? (
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-[16px] border bg-[#FFFCF8] p-2" style={{ borderColor: KEBU.borders.default }}>
              {KEBU_TOOLS.map((tool) => (
                <Link key={tool.id} href={tool.href} onClick={() => setLauncherOpen(false)} className="rounded-xl p-2 text-left text-[10px] font-bold hover:bg-white">
                  <KebuIcon name={tool.icon as KebuIconName} size={15} className="mb-1.5" style={{ color: KEBU.orange }} />
                  {tool.label}
                </Link>
              ))}
            </div>
          ) : null}
        </nav>

        <div className="border-t p-2" style={{ borderColor: KEBU.borders.subtle }}>
          <Link href="/account" className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-[12px] font-bold" style={{ color: KEBU.muted }}><KebuIcon name="settings" size={17} />Account</Link>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(62px+env(safe-area-inset-bottom))] items-start justify-around border-t bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur md:hidden" style={{ borderColor: KEBU.borders.default }} aria-label="Primary navigation">
        {[CORE[0], CORE[1], CORE[2]].map((item) => {
          const active = isOn(path, item);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: active ? KEBU.orange : KEBU.muted }}><KebuIcon name={item.icon} size={19} /><span>{item.label}</span></Link>;
        })}
        <Link href="/create" aria-label="Create" className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ background: createBg }}><KebuIcon name="create" size={19} /></Link>
        <Link href="/account" className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{ color: KEBU.muted }}><KebuIcon name="more" size={19} /><span>More</span></Link>
      </nav>
    </>
  );
}

export function KebuNavSidebar() {
  return <KebuNavShell />;
}
