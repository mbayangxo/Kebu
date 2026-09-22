"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import type { HomeSummary } from "@/lib/account/home-summary";
import type { AccountWorkspaceContext } from "@/lib/account/workspace-context";
import { KEBU } from "@/lib/kebu-brand";

type Room = {
  id: string;
  name: string;
  description: string;
  room_type: string;
  updated_at: string;
};

export default function SpacesPage() {
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [homeRes, workspaceRes] = await Promise.all([
        fetch("/api/me/home", { credentials: "include" }),
        fetch("/api/me/workspace", { credentials: "include" }),
      ]);
      const homeData = await homeRes.json().catch(() => ({}));
      const workspaceData = await workspaceRes.json().catch(() => ({}));
      if (cancelled) return;
      if (homeRes.ok) setSummary(homeData.summary ?? null);

      const context = workspaceRes.ok ? workspaceData.context as AccountWorkspaceContext : null;
      const params = new URLSearchParams();
      if (context?.activeBusinessId) params.set("businessId", context.activeBusinessId);
      else params.set("personal", "1");

      const roomRes = await fetch("/api/rooms?" + params.toString(), { credentials: "include" });
      const roomData = await roomRes.json().catch(() => ({}));
      if (!cancelled && roomRes.ok) setRooms(Array.isArray(roomData.rooms) ? roomData.rooms : []);
      if (!cancelled) setLoadingRooms(false);
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const businesses = summary?.businesses ?? [];
  const sites = summary?.sites ?? [];
  const updates = summary?.updates ?? [];

  return (
    <AppShell title="Spaces">
      <div className="mx-auto max-w-[1450px] px-4 py-4 sm:px-6 lg:px-7">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-4" style={{ borderColor: KEBU.border }}>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">Spaces</p>
            <h1 className="mt-1 text-[30px] leading-none tracking-[-.045em]" style={{ fontFamily:"var(--font-fraunces)" }}>Where people and work come together.</h1>
            <p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-black/42">Open a business space, a room, or a shared project. Tools live inside the space when they are useful instead of crowding the global navigation.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/rooms" className="rounded-full border px-4 py-2.5 text-[9px] font-semibold" style={{ borderColor: KEBU.border }}>Browse rooms</Link>
            <Link href="/business/register" className="rounded-full bg-black px-4 py-2.5 text-[9px] font-semibold text-white">+ New space</Link>
          </div>
        </header>

        <section className="py-5">
          <div className="mb-3 flex items-center justify-between">
            <div><p className="text-[12px] font-semibold">Your spaces</p><p className="mt-0.5 text-[9px] text-black/35">Businesses and places you actively use.</p></div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {businesses.map((business, index) => (
              <Link key={business.id} href={"/business/" + business.id} className="group relative min-h-[180px] min-w-[260px] max-w-[320px] flex-1 overflow-hidden rounded-[16px] bg-black text-white">
                <div className="absolute inset-0" style={{ background: index % 3 === 0 ? "radial-gradient(circle at 75% 20%,rgba(255,106,0,.72),transparent 28%),linear-gradient(135deg,#151515,#210b07)" : index % 3 === 1 ? "linear-gradient(135deg,#0b0b0c,#85301f)" : "linear-gradient(135deg,#25100b,#ff6a00)" }} />
                <div className="relative flex h-full flex-col justify-between p-4">
                  <div><p className="text-[8px] uppercase tracking-[.14em] text-white/40">Business space</p><h2 className="mt-2 text-[25px] leading-none" style={{fontFamily:"var(--font-fraunces)"}}>{business.name}</h2><p className="mt-2 text-[9px] text-white/45">{business.role}</p></div>
                  <span className="text-[9px] font-semibold text-[#FFB09A]">Open space →</span>
                </div>
              </Link>
            ))}
            {sites.slice(0,4).map((site) => (
              <Link key={site.id} href={"/my-sites/" + site.id} className="group min-h-[180px] min-w-[230px] overflow-hidden rounded-[16px] border bg-white p-4" style={{borderColor:KEBU.border}}>
                <div className="flex h-full flex-col justify-between"><div><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF1E9]"><KebuIcon name="builder" size={16} style={{color:KEBU.orange}}/></span><h2 className="mt-5 truncate text-[14px] font-semibold">{site.title}</h2><p className="mt-1 text-[9px] text-black/35">{site.projectType === "store" ? "Store" : "Site"}</p></div><span className="text-[9px] text-black/35">Continue →</span></div>
              </Link>
            ))}
            {!businesses.length && !sites.length ? (
              <div className="flex min-h-[180px] min-w-[300px] items-center justify-center rounded-[16px] border border-dashed text-center" style={{borderColor:KEBU.border}}>
                <div><p className="text-[11px] font-semibold">No spaces yet.</p><p className="mt-1 text-[9px] text-black/35">Create a business, site, or room when you need one.</p></div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="border-t py-5" style={{borderColor:KEBU.border}}>
          <div className="mb-3 flex items-center justify-between">
            <div><p className="text-[12px] font-semibold">Rooms</p><p className="mt-0.5 text-[9px] text-black/35">Conversations, people, files and decisions stay together.</p></div>
            <Link href="/rooms" className="text-[9px] font-semibold text-black/40">See all →</Link>
          </div>
          {loadingRooms ? <div className="h-[170px] animate-pulse rounded-[16px] bg-black/[.03]" /> : rooms.length ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {rooms.slice(0,10).map((room,index)=>(
                <Link key={room.id} href={"/rooms/"+room.id} className="group min-w-[250px] overflow-hidden rounded-[16px] border bg-white" style={{borderColor:KEBU.border}}>
                  <div className="h-[96px]" style={{background:index%3===0?"linear-gradient(135deg,#160806,#ff6a00)":index%3===1?"linear-gradient(135deg,#101113,#8f4234)":"linear-gradient(135deg,#f3d8c9,#36110b)"}} />
                  <div className="p-3.5"><p className="text-[8px] font-semibold uppercase tracking-[.12em]" style={{color:KEBU.orange}}>{room.room_type}</p><h3 className="mt-1 truncate text-[12px] font-semibold">{room.name}</h3><p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-black/38">{room.description || "Open the room to see what is happening."}</p></div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[150px] items-center justify-between gap-4 rounded-[16px] border border-dashed px-5" style={{borderColor:KEBU.border}}>
              <div><p className="text-[11px] font-semibold">No rooms in this space yet.</p><p className="mt-1 text-[9px] text-black/35">Rooms can hold a project, club, study group, campaign or community.</p></div>
              <Link href="/rooms" className="rounded-full bg-black px-4 py-2 text-[9px] font-semibold text-white">Create a room</Link>
            </div>
          )}
        </section>

        <section className="grid gap-4 border-t py-5 lg:grid-cols-[minmax(0,1fr)_320px]" style={{borderColor:KEBU.border}}>
          <div>
            <div className="mb-2 flex items-center justify-between"><p className="text-[12px] font-semibold">Recent shared activity</p><Link href="/dashboard" className="text-[9px] text-black/35">Home →</Link></div>
            <div className="border-t" style={{borderColor:KEBU.border}}>
              {updates.slice(0,6).map((item)=>(
                <Link key={item.id} href={item.href} className="flex items-center gap-3 border-b py-3 transition hover:pl-1" style={{borderColor:KEBU.border}}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF1E9]"><KebuIcon name="spaces" size={14} style={{color:KEBU.orange}}/></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold">{item.title}</span><span className="block truncate text-[8px] text-black/35">{item.detail}</span></span>
                  <span className="text-black/20">→</span>
                </Link>
              ))}
              {!updates.length ? <p className="py-7 text-[9px] text-black/35">Shared activity will appear here as your spaces become active.</p> : null}
            </div>
          </div>
          <aside className="rounded-[16px] bg-[#F5EFE9] p-4">
            <p className="text-[20px] leading-[1.05]" style={{fontFamily:"var(--font-fraunces)"}}>One place for people.<br/>Not another app list.</p>
            <p className="mt-2 text-[9px] leading-relaxed text-black/42">Open a space and the relevant rooms, files, people, mail and work follow you there.</p>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
