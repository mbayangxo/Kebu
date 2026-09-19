"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";

type Item = { label: string; href: string; icon: KebuIconName; prefixes?: string[]; badge?: "messages" };
const CORE: Item[] = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Search", href: "/search", icon: "search" },
];
const CAPABILITIES: Item[] = [
  { label: "Opportunity", href: "/opportunity", icon: "opportunity" },
  { label: "Builder", href: "/my-sites", icon: "builder", prefixes: ["/my-sites", "/create"] },
  { label: "Studio", href: "/studio", icon: "studio" },
  { label: "Commerce", href: "/shop", icon: "commerce" },
  { label: "Business", href: "/business", icon: "spaces", prefixes: ["/business", "/b2b", "/ka-score"] },
  { label: "Messages", href: "/messages", icon: "message", badge: "messages" },
];

function isOn(path: string, item: Item) {
  const prefixes = item.prefixes ?? [item.href];
  return prefixes.some(p => path === p || path.startsWith(p + "/"));
}

function NavItem({ item, path, count = 0 }: { item: Item; path: string; count?: number }) {
  const on = isOn(path, item);
  return <Link href={item.href} aria-current={on ? "page" : undefined}
    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition"
    style={{ background: on ? KEBU.cream : "transparent", color: on ? KEBU.black : KEBU.muted }}>
    <span className="relative flex h-8 w-8 items-center justify-center rounded-lg"
      style={{ background: on ? KEBU.black : "transparent", color: on ? KEBU.orange : "currentColor" }}>
      <KebuIcon name={item.icon} size={18} />
    </span>
    <span className="min-w-0 flex-1 truncate">{item.label}</span>
    {count > 0 ? <span className="rounded-full px-1.5 py-0.5 text-[9px] font-black text-white" style={{background: KEBU.orange}}>{count > 99 ? "99+" : count}</span> : null}
  </Link>;
}

export function KebuNavShell() {
  const path = usePathname();
  const [messages, setMessages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/messages/unread-count", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(v => { if (!cancelled && typeof v?.count === "number") setMessages(v.count); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (path === "/" || isMarketingPath(path) || path.startsWith("/login") || path.startsWith("/signup")) return null;

  const createBg = "linear-gradient(135deg," + KEBU.orange + "," + KEBU.red + ")";

  return <>
    <aside className="sticky top-0 hidden h-screen w-[224px] shrink-0 flex-col border-r bg-white md:flex" style={{borderColor: KEBU.borders.default}}>
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2" aria-label="Kebu Home"><KebuMark size={27}/><span className="text-xs font-black uppercase tracking-[.2em]">Kebu</span></Link>
        <Link href="/create" aria-label="Create" className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{background:createBg}}><KebuIcon name="create" size={17}/></Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="space-y-1">{CORE.map(i=><NavItem key={i.href} item={i} path={path}/>)}</div>
        <p className="px-3 pb-2 pt-7 text-[9px] font-black uppercase tracking-[.2em]" style={{color:KEBU.faint}}>Work</p>
        <div className="space-y-1">{CAPABILITIES.map(i=><NavItem key={i.href} item={i} path={path} count={i.badge==="messages"?messages:0}/>)}</div>
      </nav>
      <div className="border-t p-2" style={{borderColor:KEBU.borders.subtle}}>
        <Link href="/account" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold" style={{color:KEBU.muted}}><KebuIcon name="settings" size={18}/>Account</Link>
      </div>
    </aside>

    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t bg-white/95 px-2 py-2 backdrop-blur md:hidden" style={{borderColor:KEBU.borders.default}} aria-label="Primary navigation">
      {[CORE[0], CORE[1], CAPABILITIES[0], CAPABILITIES[1]].map(item=>{const on=isOn(path,item);return <Link key={item.href} href={item.href} aria-current={on?"page":undefined} className="flex min-w-14 flex-col items-center gap-1 text-[9px] font-bold" style={{color:on?KEBU.orange:KEBU.muted}}><KebuIcon name={item.icon} size={19}/><span>{item.label}</span></Link>})}
      <Link href="/create" aria-label="Create" className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{background:createBg}}><KebuIcon name="create" size={19}/></Link>
    </nav>
  </>;
}

export function KebuNavSidebar() { return <KebuNavShell />; }
