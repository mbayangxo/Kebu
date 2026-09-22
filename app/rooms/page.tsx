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

const TOP_TABS = ["All rooms", "Joined", "Owned", "Starred", "Archived"];

const QUICK_ACTIONS = [
  { label: "Create room", icon: "create" as const, primary: true },
  { label: "Invite people", icon: "people" as const },
  { label: "Start a chat", icon: "message" as const },
  { label: "Add files", icon: "library" as const },
  { label: "Create task", icon: "work" as const },
  { label: "Schedule", icon: "calendar" as const },
  { label: "Share link", icon: "arrowRight" as const },
];

const ROOM_TYPE_FILTERS = ["All", "Projects", "Teams", "Communities", "Learning", "Events", "Private"];

const SUGGESTED_ROOMS = [
  { name: "Women in Tech", count: "1.8K members" },
  { name: "African Founders", count: "3.2K members" },
  { name: "Creative Africa", count: "2.1K members" },
];

const ROOM_GRADIENTS = [
  "linear-gradient(135deg,#FF6A00,#FF1F1F)",
  "linear-gradient(135deg,#111,#FF6A00)",
  "linear-gradient(135deg,#EEE8E1,#C0A88A)",
  "linear-gradient(135deg,#1A1A5C,#4A1D96)",
  "linear-gradient(135deg,#065F46,#10B981)",
  "linear-gradient(135deg,#9A3412,#EA580C)",
  "linear-gradient(135deg,#1E3A8A,#3B82F6)",
  "linear-gradient(135deg,#374151,#6B7280)",
];

const ONLINE_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [workspace, setWorkspace] = useState<AccountWorkspaceContext | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roomType, setRoomType] = useState("project");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTopTab, setActiveTopTab] = useState("All rooms");
  const [activeTypeFilter, setActiveTypeFilter] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);

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
    setShowCreateModal(false);
  }

  // Today's date for sidebar
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Mock scheduled events (static placeholder)
  const scheduledEvents = [
    { time: "9:00 AM", name: "Team standup", biz: "Design team", color: KEBU.orange },
    { time: "2:00 PM", name: "Client review", biz: "Project Phoenix", color: "#3B82F6" },
    { time: "4:30 PM", name: "1-on-1", biz: "Engineering", color: "#10B981" },
  ];

  return (
    <AppShell title="Rooms">
      <div style={{ background: "#FAFAF9", minHeight: "100vh" }}>
        <div className="flex gap-0">
          <main className="flex-1 min-w-0 px-5 py-6 sm:px-8 space-y-5">
            {/* Top tab row */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {TOP_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTopTab(tab)}
                  className="shrink-0 rounded-full px-4 py-1.5 text-[11px] font-bold transition"
                  style={
                    activeTopTab === tab
                      ? { background: KEBU.black, color: "#fff" }
                      : { background: "white", color: KEBU.muted, border: "1px solid " + KEBU.borders.default }
                  }
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Quick actions bar */}
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={action.label === "Create room" ? () => setShowCreateModal(true) : undefined}
                  className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border bg-white px-3.5 py-3 hover:bg-black/[.02] hover:-translate-y-0.5 transition"
                  style={{
                    borderColor: action.primary ? "transparent" : KEBU.borders.default,
                    background: action.primary ? KEBU.black : "white",
                    color: action.primary ? "white" : KEBU.black,
                    minWidth: 72,
                  }}
                >
                  <KebuIcon
                    name={action.icon}
                    size={16}
                    style={{ color: action.primary ? "white" : KEBU.orange }}
                  />
                  <span className="text-[9px] font-bold text-center leading-tight whitespace-nowrap">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Secondary filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {ROOM_TYPE_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveTypeFilter(f)}
                  className="shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition"
                  style={
                    activeTypeFilter === f
                      ? { background: KEBU.black, color: "#fff" }
                      : { background: "white", color: KEBU.muted, border: "1px solid " + KEBU.borders.default }
                  }
                >
                  {f}
                </button>
              ))}
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button className="rounded-xl border bg-white px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: KEBU.borders.default }}>🔍</button>
                <button className="rounded-xl border bg-white px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: KEBU.borders.default }}>Recent ↕</button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border px-4 py-3 text-xs" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>
                {error}
              </div>
            )}

            {/* Room cards grid */}
            {rooms.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
                {rooms.map((room, index) => (
                  <Link
                    key={room.id}
                    href={"/rooms/" + room.id}
                    className="group overflow-hidden rounded-2xl border bg-white hover:-translate-y-0.5 hover:shadow-md transition"
                    style={{ borderColor: KEBU.borders.default }}
                  >
                    {/* Cover */}
                    <div
                      className="relative h-32 overflow-hidden"
                      style={{ background: ROOM_GRADIENTS[index % ROOM_GRADIENTS.length] }}
                    >
                      <div className="absolute -right-6 -top-8 h-24 w-24 rotate-[26deg] rounded-[20px] border-[14px] border-black/20" />
                      {/* Star */}
                      <button
                        className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition"
                        onClick={(e) => e.preventDefault()}
                      >
                        ☆
                      </button>
                    </div>
                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="truncate text-[13px] font-black">{room.name}</h2>
                        <button className="shrink-0 text-black/30 text-[11px]" onClick={(e) => e.preventDefault()}>···</button>
                      </div>
                      {/* Member row */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="h-5 w-5 rounded-full border-2 border-white"
                              style={{ background: ONLINE_COLORS[i % ONLINE_COLORS.length] }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#10B981" }} />
                          <span className="text-[10px]" style={{ color: KEBU.faint }}>
                            {(index % 5) + 1} online
                          </span>
                        </div>
                        <span className="ml-auto text-[9px] uppercase tracking-wide" style={{ color: KEBU.faint }}>
                          {room.room_type} · {timeAgo(room.updated_at)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed bg-white p-12 text-center" style={{ borderColor: KEBU.borders.default }}>
                <KebuIcon name="spaces" size={30} className="mx-auto mb-3" style={{ color: KEBU.faint }} />
                <p className="text-sm font-black">No rooms in this space yet.</p>
                <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
                  Create one for a project, team, client or community.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 inline-flex rounded-full px-4 py-2 text-[10px] font-bold text-white"
                  style={{ background: KEBU.black }}
                >
                  + Create room
                </button>
              </div>
            )}

            {/* Find more rooms banner */}
            <div
              className="rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4"
              style={{ background: "linear-gradient(135deg,#1A1A1A,#2D2520)" }}
            >
              <div>
                <p className="text-sm font-black text-white" style={{ fontFamily: "var(--font-fraunces)" }}>
                  Find more rooms
                </p>
                <p className="mt-0.5 text-[11px] text-white/50">Discover communities and spaces to join.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-7 w-7 rounded-full border-2 border-[#1A1A1A]"
                      style={{ background: ONLINE_COLORS[i % ONLINE_COLORS.length] }}
                    />
                  ))}
                </div>
                <button className="rounded-full border border-white/20 px-3.5 py-1.5 text-[11px] font-bold text-white hover:border-white/40 transition">
                  Browse
                </button>
              </div>
            </div>
          </main>

          {/* Right sidebar */}
          <aside className="hidden xl:flex w-64 shrink-0 flex-col gap-4 px-4 py-6">
            {/* Calendar */}
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
              <div className="flex items-center justify-between mb-3">
                <button className="text-[11px]" style={{ color: KEBU.faint }}>←</button>
                <p className="text-[12px] font-black">{dayName}, {monthDay}</p>
                <button className="text-[11px]" style={{ color: KEBU.faint }}>→</button>
              </div>
              <ul className="space-y-2">
                {scheduledEvents.map((ev) => (
                  <li key={ev.name} className="flex items-start gap-2.5">
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[11px] font-bold">{ev.name}</p>
                      <p className="text-[9px]" style={{ color: KEBU.faint }}>{ev.time} · {ev.biz}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/calendar" className="mt-3 block text-[10px] font-bold" style={{ color: KEBU.orange }}>
                Open calendar →
              </Link>
            </div>

            {/* Pinned rooms */}
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>
                Pinned rooms
              </p>
              {rooms.length > 0 ? (
                <ul className="space-y-1">
                  {rooms.slice(0, 4).map((room, i) => (
                    <li key={room.id}>
                      <Link
                        href={"/rooms/" + room.id}
                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[11px] font-bold hover:bg-black/[.03] transition"
                      >
                        <div
                          className="h-3.5 w-3.5 shrink-0 rounded-full"
                          style={{ background: ROOM_GRADIENTS[i % ROOM_GRADIENTS.length] }}
                        />
                        <span className="flex-1 truncate">{room.name}</span>
                        <span className="text-[10px]" style={{ color: KEBU.faint }}>→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px]" style={{ color: KEBU.faint }}>No rooms pinned yet.</p>
              )}
            </div>

            {/* Suggested rooms */}
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>
                Suggested rooms
              </p>
              <ul className="space-y-2">
                {SUGGESTED_ROOMS.map((sr) => (
                  <li key={sr.name} className="flex items-center gap-2.5">
                    <div className="h-8 w-8 shrink-0 rounded-xl" style={{ background: "rgba(255,85,0,0.09)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[11px] font-bold">{sr.name}</p>
                      <p className="text-[9px]" style={{ color: KEBU.faint }}>{sr.count}</p>
                    </div>
                    <button
                      className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold hover:bg-black/[.03] transition"
                      style={{ borderColor: KEBU.borders.default }}
                    >
                      Join
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {/* Create room modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ background: "rgba(10,10,10,0.5)", zIndex: KEBU.z.modal }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
          >
            <div className="w-full max-w-md rounded-[24px] border bg-white p-6" style={{ borderColor: KEBU.borders.default }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black" style={{ fontFamily: "var(--font-fraunces)" }}>Create a room</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-[18px] leading-none" style={{ color: KEBU.faint }}
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_120px] gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Room name"
                    className="min-h-10 rounded-xl border px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#FF6A00]"
                    style={{ borderColor: KEBU.borders.default }}
                  />
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="min-h-10 rounded-xl border bg-white px-2 text-[10px] font-bold outline-none"
                    style={{ borderColor: KEBU.borders.default }}
                  >
                    <option value="project">Project</option>
                    <option value="team">Team</option>
                    <option value="community">Community</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What is this room for?"
                  className="w-full rounded-xl border px-3 py-2 text-[11px] outline-none focus:ring-2 focus:ring-[#FF6A00]"
                  style={{ borderColor: KEBU.borders.default }}
                />
                {error && (
                  <p className="text-xs" style={{ color: KEBU.status.errorText }}>{error}</p>
                )}
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-full border px-4 py-2 text-[11px] font-bold"
                    style={{ borderColor: KEBU.borders.default }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!name.trim() || creating}
                    onClick={() => void createRoom()}
                    className="rounded-full bg-black px-5 py-2 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-35"
                  >
                    {creating ? "Creating…" : "Create room →"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
