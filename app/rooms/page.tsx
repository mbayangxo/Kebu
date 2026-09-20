"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import type { AccountWorkspaceContext } from "@/lib/account/workspace-context";
import { KEBU } from "@/lib/kebu-brand";

type Room = {
  id: string;
  business_id: string | null;
  name: string;
  description: string;
  room_type: string;
  updated_at: string;
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [workspace, setWorkspace] = useState<AccountWorkspaceContext | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roomType, setRoomType] = useState("project");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const workspaceRes = await fetch("/api/me/workspace", { credentials: "include" });
    const workspaceData = await workspaceRes.json().catch(() => ({}));
    const context = workspaceRes.ok ? workspaceData.context as AccountWorkspaceContext : null;
    setWorkspace(context);
    const params = new URLSearchParams();
    if (context?.activeBusinessId) params.set("businessId", context.activeBusinessId);
    else params.set("personal", "1");
    const res = await fetch("/api/rooms?" + params.toString(), { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Could not load rooms."); return; }
    setRooms(Array.isArray(data.rooms) ? data.rooms : []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createRoom() {
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/rooms", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description,
        roomType,
        businessId: workspace?.activeBusinessId ?? null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok || !data.room) { setError(data.error || "Could not create room."); return; }
    setRooms((current) => [data.room, ...current]);
    setName("");
    setDescription("");
  }

  return (
    <AppShell title="Rooms">
      <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-7">
        <header className="grid gap-5 border-b pb-6 lg:grid-cols-[1fr_420px] lg:items-end" style={{ borderColor: KEBU.borders.default }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Rooms · {workspace?.activeBusiness?.name ?? "Personal Kebu"}</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>A room is where a project actually lives.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>Wall, tasks, calendar, links, people, decisions and chat stay together. Rooms sit inside a Kebu space; they are not the same thing as Chat or Spaces.</p>
          </div>
          <div className="rounded-[20px] border bg-white p-3.5" style={{ borderColor: KEBU.borders.default }}>
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Room name" className="min-h-10 rounded-xl border px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} />
              <select value={roomType} onChange={(event) => setRoomType(event.target.value)} className="min-h-10 rounded-xl border bg-white px-2 text-[10px] font-bold outline-none" style={{ borderColor: KEBU.borders.default }}>
                <option value="project">Project</option>
                <option value="team">Team</option>
                <option value="community">Community</option>
                <option value="client">Client</option>
              </select>
            </div>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="What is this room for?" className="mt-2 w-full rounded-xl border px-3 py-2 text-[11px] outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} />
            <button type="button" disabled={!name.trim() || creating} onClick={() => void createRoom()} className="mt-2 rounded-full bg-black px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-35">{creating ? "Creating…" : "Create room →"}</button>
          </div>
        </header>

        {error ? <div className="mt-4 rounded-xl border px-4 py-3 text-xs" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>{error}</div> : null}

        <section className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.length ? rooms.map((room, index) => (
            <Link key={room.id} href={"/rooms/" + room.id} className="group min-h-[220px] overflow-hidden rounded-[22px] border bg-white outline-none transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(10,10,10,.06)] focus-visible:ring-2 focus-visible:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }}>
              <div className="relative h-24 overflow-hidden" style={{ background: index % 3 === 0 ? "linear-gradient(135deg,#FF6A00,#FF1F1F)" : index % 3 === 1 ? "linear-gradient(135deg,#111,#FF6A00)" : "linear-gradient(135deg,#EEE8E1,#FF6A00)" }}>
                <div className="absolute -right-8 -top-10 h-28 w-28 rotate-[26deg] rounded-[26px] border-[16px] border-black/35" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2"><p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>{room.room_type}</p><span className="text-black/20 group-hover:translate-x-1 transition">→</span></div>
                <h2 className="mt-2 truncate text-lg font-black">{room.name}</h2>
                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>{room.description || "No description yet."}</p>
              </div>
            </Link>
          )) : (
            <div className="col-span-full rounded-[22px] border border-dashed bg-white p-10 text-center" style={{ borderColor: KEBU.borders.default }}>
              <KebuIcon name="spaces" size={30} className="mx-auto" style={{ color: KEBU.faint }} />
              <p className="mt-3 text-sm font-black">No rooms in this space yet.</p>
              <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>Create one for a project, team, client or community when you need a shared working place.</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
