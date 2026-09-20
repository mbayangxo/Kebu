"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";

type Notice = {
  id: string;
  kind: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

export function KebuNotifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/me/notifications", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    setItems(Array.isArray(data.notifications) ? data.notifications : []);
    setUnread(typeof data.unread === "number" ? data.unread : 0);
    setLoaded(true);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function readOne(id: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item));
    setUnread((current) => Math.max(0, current - 1));
    await fetch("/api/me/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  async function readAll() {
    const count = unread;
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    setUnread(0);
    const res = await fetch("/api/me/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => null);
    if (!res?.ok) {
      setUnread(count);
      void load();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border bg-white outline-none transition hover:bg-black/[.025] focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
        style={{ borderColor: KEBU.borders.default, color: KEBU.black }}
      >
        <KebuIcon name="notifications" size={17} />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-black text-white" style={{ background: KEBU.red }}>{unread > 9 ? "9+" : unread}</span>
        ) : null}
      </button>

      {open ? (
        <>
          <button type="button" aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <section className="fixed inset-x-3 top-16 z-50 max-h-[72vh] overflow-hidden rounded-[20px] border bg-white shadow-2xl sm:absolute sm:inset-auto sm:right-0 sm:top-11 sm:w-[360px]" style={{ borderColor: KEBU.borders.default }}>
            <header className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: KEBU.borders.default }}>
              <div><p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>Kebu</p><h2 className="text-sm font-black">Notifications</h2></div>
              {unread > 0 ? <button type="button" onClick={() => void readAll()} className="text-[9px] font-black uppercase tracking-wide" style={{ color: KEBU.orange }}>Read all</button> : null}
            </header>
            <div className="max-h-[60vh] overflow-y-auto">
              {!loaded ? <p className="p-5 text-xs" style={{ color: KEBU.muted }}>Loading…</p> : items.length ? items.map((item) => {
                const inner = (
                  <>
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: item.read_at ? "transparent" : KEBU.orange }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-black">{item.title}</span>
                      {item.body ? <span className="mt-1 block text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>{item.body}</span> : null}
                      <time className="mt-1 block text-[8px] uppercase tracking-wide" style={{ color: KEBU.faint }}>{new Date(item.created_at).toLocaleString()}</time>
                    </span>
                  </>
                );
                const className = "flex gap-3 border-b px-4 py-3 text-left hover:bg-black/[.02]";
                const style = { borderColor: KEBU.borders.subtle, background: item.read_at ? undefined : "rgba(255,106,0,.035)" };
                return item.action_url ? (
                  <Link key={item.id} href={item.action_url} onClick={() => { if (!item.read_at) void readOne(item.id); setOpen(false); }} className={className} style={style}>{inner}</Link>
                ) : (
                  <button key={item.id} type="button" onClick={() => { if (!item.read_at) void readOne(item.id); }} className={"w-full " + className} style={style}>{inner}</button>
                );
              }) : (
                <div className="p-8 text-center"><KebuIcon name="notifications" size={25} className="mx-auto" style={{ color: KEBU.faint }} /><p className="mt-3 text-[11px] font-black">Nothing new.</p><p className="mt-1 text-[9px]" style={{ color: KEBU.muted }}>Kebu will only show real account and product notifications here.</p></div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
