"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";

type Tab = "overview" | "wall" | "tasks" | "calendar" | "files" | "links" | "decisions" | "people" | "chat" | "ideas";
type WallFilter = "all" | "design" | "video" | "images" | "docs" | "links" | "ideas";
type Room = { id: string; name: string; description: string; room_type: string; business_id: string | null };
type Item = { id: string; kind: string; title: string; body: string; status: string; due_at: string | null; start_at: string | null };
type Post = { id: string; author_id: string; body: string; created_at: string };
type LinkRow = { id: string; label: string; url: string; created_at: string };
type Decision = { id: string; title: string; detail: string; decided_at: string };
type Member = { user_id: string; role: string; joined_at: string };
type Profile = { id: string; name: string | null; email: string | null; avatar_url: string | null };
type Message = { id: string; author_id: string; body: string; created_at: string };
type RoomFile = { id: string; file_name: string; mime: string; byte_size: number; created_at: string; downloadUrl: string | null };

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Home" },
  { id: "wall", label: "Wall" },
  { id: "tasks", label: "Tasks" },
  { id: "calendar", label: "Calendar" },
  { id: "files", label: "Files" },
  { id: "links", label: "Links" },
  { id: "decisions", label: "Decisions" },
  { id: "ideas", label: "Ideas" },
  { id: "people", label: "People" },
  { id: "chat", label: "Chat" },
];

const WALL_FILTERS: Array<{ id: WallFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "design", label: "Design" },
  { id: "video", label: "Video" },
  { id: "images", label: "Images" },
  { id: "docs", label: "Docs" },
  { id: "links", label: "Links" },
  { id: "ideas", label: "Ideas" },
];

const POST_ACCENTS = ["#FF6A00", "#9333EA", "#0EA5E9", "#10B981", "#E1306C", "#F59E0B"];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function PostCard({
  post,
  author,
  index,
}: {
  post: Post;
  author?: Profile;
  index: number;
}) {
  const accent = POST_ACCENTS[index % POST_ACCENTS.length];
  const version = `v${(index % 3) + 1}`;
  const typeLabel = index % 4 === 0 ? "Design" : index % 4 === 1 ? "Video" : index % 4 === 2 ? "Doc" : "Image";

  return (
    <article className="group overflow-hidden rounded-[14px] border border-white/8 bg-[#0E1013] transition hover:border-white/20">
      {/* Thumbnail */}
      <div
        className="relative h-[120px]"
        style={{
          background: `linear-gradient(145deg, ${accent}bb, #0A0A0A)`,
        }}
      >
        <span className="absolute left-3 top-3 rounded-[5px] bg-black/40 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white/70 backdrop-blur-sm">
          {typeLabel}
        </span>
        <span className="absolute right-3 top-3 rounded-[5px] border border-white/20 bg-black/40 px-2 py-0.5 text-[8px] font-black text-white/80 backdrop-blur-sm">
          {version}
        </span>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex -space-x-1.5">
            {[0, 1].map((i) => (
              <span
                key={i}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-black/40 text-[7px] font-bold text-white"
                style={{ background: i === 0 ? accent : "#333" }}
              >
                {author?.name?.charAt(0).toUpperCase() ?? "K"}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3">
        <p className="truncate text-[10px] font-semibold text-white">
          {post.body.slice(0, 48) || "Room update"}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[8px] text-white/45">
            {author?.name ?? "Room member"}
          </span>
          <span className="text-white/25 text-[8px]">·</span>
          <span className="text-[8px] text-white/30">{timeAgo(post.created_at)}</span>
        </div>
      </div>
    </article>
  );
}

function FileCard({ file, index }: { file: RoomFile; index: number }) {
  const accent = POST_ACCENTS[(index + 2) % POST_ACCENTS.length];
  const ext = file.file_name.split(".").pop()?.toUpperCase() ?? "FILE";
  return (
    <article className="group overflow-hidden rounded-[14px] border border-white/8 bg-[#0E1013] transition hover:border-white/20">
      <div
        className="flex h-[120px] items-center justify-center"
        style={{ background: `linear-gradient(160deg, ${accent}22, #0A0A0A)` }}
      >
        <span className="rounded-[8px] border border-white/10 bg-black/40 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white/60">
          {ext}
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-[10px] font-semibold text-white">{file.file_name}</p>
        <p className="mt-1 text-[8px] text-white/35">
          {file.byte_size < 1048576
            ? Math.max(1, Math.round(file.byte_size / 1024)) + " KB"
            : (file.byte_size / 1048576).toFixed(1) + " MB"}
        </p>
      </div>
    </article>
  );
}

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [tab, setTab] = useState<Tab>("overview");
  const [wallFilter, setWallFilter] = useState<WallFilter>("all");
  const [room, setRoom] = useState<Room | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [text, setText] = useState("");
  const [secondary, setSecondary] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomFiles, setRoomFiles] = useState<RoomFile[]>([]);
  const [fileBusy, setFileBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    const res = await fetch("/api/rooms/" + id + "?tab=" + tab, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Could not load room."); return; }
    setRoom(data.room ?? null);
    setPayload(data);
  }, [id, tab]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (tab !== "files" || !id) return;
    void (async () => {
      const res = await fetch("/api/rooms/" + id + "/files", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Could not load room files."); return; }
      setRoomFiles(Array.isArray(data.files) ? data.files : []);
    })();
  }, [id, tab]);

  const profiles = (payload.profiles ?? []) as Profile[];
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  async function createAction() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    let body: Record<string, unknown>;
    if (tab === "wall" || tab === "ideas") body = { action: "post", body: text.trim() };
    else if (tab === "tasks") body = { action: "task", title: text.trim(), body: secondary, dueAt: date ? new Date(date).toISOString() : null };
    else if (tab === "calendar") body = { action: "event", title: text.trim(), body: secondary, startAt: date ? new Date(date).toISOString() : new Date().toISOString() };
    else if (tab === "links") body = { action: "link", label: text.trim(), url: secondary.trim() };
    else if (tab === "decisions") body = { action: "decision", title: text.trim(), detail: secondary };
    else if (tab === "chat") body = { action: "message", body: text.trim() };
    else { setBusy(false); return; }

    const res = await fetch("/api/rooms/" + id, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error || "Could not save."); return; }
    setText(""); setSecondary(""); setDate("");
    await load();
  }

  async function uploadRoomFile(file: File) {
    if (!id || fileBusy) return;
    setFileBusy(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    const res = await fetch("/api/rooms/" + id + "/files", { method: "POST", credentials: "include", body: form });
    const data = await res.json().catch(() => ({}));
    setFileBusy(false);
    if (!res.ok || !data.file) { setError(data.error || "Could not upload file."); return; }
    setRoomFiles((curr) => [data.file, ...curr]);
  }

  async function deleteRoomFile(fileId: string) {
    if (!id) return;
    const prev = roomFiles;
    setRoomFiles((curr) => curr.filter((f) => f.id !== fileId));
    const res = await fetch("/api/rooms/" + id + "/files?fileId=" + encodeURIComponent(fileId), { method: "DELETE", credentials: "include" });
    if (!res.ok) { setRoomFiles(prev); setError("Could not remove file."); }
  }

  function composerLabel() {
    if (tab === "wall" || tab === "ideas") return "Share an update with the room";
    if (tab === "tasks") return "New task";
    if (tab === "calendar") return "New event";
    if (tab === "links") return "Link label";
    if (tab === "decisions") return "Decision";
    if (tab === "chat") return "Message this room";
    return "";
  }

  const items = (payload.items ?? []) as Item[];
  const posts = (payload.posts ?? []) as Post[];
  const links = (payload.links ?? []) as LinkRow[];
  const decisions = (payload.decisions ?? []) as Decision[];
  const members = (payload.members ?? []) as Member[];
  const messages = (payload.messages ?? []) as Message[];

  const doneCount = items.filter((i) => i.status === "done").length;
  const focusPct = items.length ? Math.min(99, Math.round((doneCount / items.length) * 100)) : 0;
  const upcomingEvents = items.filter((i) => i.kind === "event").slice(0, 3);

  return (
    <AppShell title={room?.name ?? "Room"}>
      <div
        className="min-h-[calc(100vh-60px)] text-white"
        style={{ background: "#080A0C" }}
      >
        <div className="mx-auto max-w-[1520px] px-3 pb-8 pt-4 sm:px-5">

          {/* ── Room header ─────────────────────────────────────────── */}
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[8px] text-white/35">
                {room?.room_type ? room.room_type.replace(/_/g, " ") : "Room"}&nbsp;›&nbsp;{room?.name ?? "Loading…"}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <h1
                  className="text-[26px] leading-none tracking-[-.035em]"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  {room?.name ?? "Room"}
                </h1>
                <span className="text-white/25">☆</span>
              </div>
              {room?.description && (
                <p className="mt-1 max-w-xl text-[9px] leading-relaxed text-white/45">
                  {room.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                title="Share — coming soon"
                className="cursor-not-allowed rounded-full border border-white/10 px-3 py-2 text-[8px] font-semibold text-white/30"
              >
                Share
              </button>
              <button
                type="button"
                disabled
                title="Calls — coming soon"
                className="cursor-not-allowed rounded-full border border-white/10 px-4 py-2 text-[8px] font-semibold text-white/30"
              >
                Start a call
              </button>
            </div>
          </div>

          {/* ── Tab nav ─────────────────────────────────────────────── */}
          <nav className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className="shrink-0 rounded-[10px] px-4 py-2 text-[9px] font-semibold transition"
                style={{
                  background: tab === item.id ? "#FFB09A" : "rgba(255,255,255,.06)",
                  color: tab === item.id ? "#1A0806" : "rgba(255,255,255,.55)",
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {error ? (
            <div
              className="mb-4 rounded-xl border px-4 py-3 text-xs"
              style={{
                borderColor: KEBU.status.errorBorder,
                background: KEBU.status.errorBg,
                color: KEBU.status.errorText,
              }}
            >
              {error}
            </div>
          ) : null}

          {/* ── Composer ────────────────────────────────────────────── */}
          {tab !== "overview" && tab !== "people" && tab !== "files" ? (
            <section className="mb-4 rounded-[14px] border border-white/10 bg-[#0D0F11] p-3">
              <div className="grid gap-2 lg:grid-cols-[1fr_1fr_190px_auto]">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={composerLabel()}
                  className="min-h-10 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-bold text-white outline-none placeholder:text-white/25 focus:ring-2"
                  style={{ "--tw-ring-color": KEBU.orange } as React.CSSProperties}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) void createAction(); }}
                />
                {["tasks", "calendar", "links", "decisions"].includes(tab) ? (
                  <input
                    value={secondary}
                    onChange={(e) => setSecondary(e.target.value)}
                    placeholder={tab === "links" ? "https://…" : "Notes / details"}
                    className="min-h-10 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs text-white outline-none placeholder:text-white/25"
                  />
                ) : (
                  <div />
                )}
                {["tasks", "calendar"].includes(tab) ? (
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="min-h-10 rounded-xl border border-white/10 bg-white/[.04] px-2 text-[10px] text-white outline-none"
                  />
                ) : (
                  <div />
                )}
                <button
                  type="button"
                  disabled={!text.trim() || busy}
                  onClick={() => void createAction()}
                  className="rounded-xl bg-black px-4 py-2 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-35"
                >
                  {busy ? "Saving…" : "Add"}
                </button>
              </div>
            </section>
          ) : null}

          {/* ── Tab content ─────────────────────────────────────────── */}

          {/* Overview */}
          {tab === "overview" ? (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_290px]">
              <section className="min-w-0">

                {/* Project Wall header with filter tabs */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[14px] font-semibold">Project Wall</p>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {WALL_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setWallFilter(f.id)}
                        className="shrink-0 rounded-full px-3 py-1.5 text-[8px] font-semibold transition"
                        style={{
                          background: wallFilter === f.id ? "rgba(255,176,154,.18)" : "rgba(255,255,255,.05)",
                          color: wallFilter === f.id ? "#FFB09A" : "rgba(255,255,255,.40)",
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wall grid */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {posts.slice(0, 6).map((post, i) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      author={profileById.get(post.author_id)}
                      index={i}
                    />
                  ))}
                  {roomFiles.slice(0, 2).map((file, i) => (
                    <FileCard key={file.id} file={file} index={i} />
                  ))}
                  {posts.length === 0 && roomFiles.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setTab("wall")}
                      className="col-span-full flex min-h-[140px] flex-col items-center justify-center rounded-[14px] border border-dashed border-white/15 text-white/35 transition hover:border-white/25"
                    >
                      <span className="text-2xl">＋</span>
                      <span className="mt-2 text-[9px]">Post the first update</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTab("wall")}
                    className="flex min-h-[174px] flex-col items-center justify-center rounded-[14px] border border-dashed border-white/10 text-white/30 transition hover:border-white/20"
                  >
                    <span className="text-xl">＋</span>
                    <span className="mt-1.5 text-[9px]">Add to wall</span>
                  </button>
                </div>

                {/* 4 mini widget grid */}
                <div className="mt-3 grid gap-2 lg:grid-cols-4">
                  <div className="rounded-[12px] border border-white/8 bg-[#0D0F11] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold">Tasks</p>
                      <button onClick={() => setTab("tasks")} className="text-[8px] text-white/30 hover:text-white/60">See all →</button>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {items.filter((i) => i.kind === "task").slice(0, 4).map((item) => (
                        <div key={item.id} className="flex gap-2 text-[8px] text-white/55">
                          <span className={item.status === "done" ? "text-[#FFB09A]" : ""}>
                            {item.status === "done" ? "☑" : "□"}
                          </span>
                          <span className="truncate">{item.title}</span>
                        </div>
                      ))}
                      {items.filter((i) => i.kind === "task").length === 0 && (
                        <p className="text-[8px] text-white/25">No tasks yet</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-white/8 bg-[#0D0F11] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold">Upcoming</p>
                      <button onClick={() => setTab("calendar")} className="text-[8px] text-white/30 hover:text-white/60">See all →</button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {upcomingEvents.map((item) => (
                        <div key={item.id} className="text-[8px]">
                          <p className="truncate text-white/60">{item.title}</p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <p className="text-white/30">
                              {item.start_at ? new Date(item.start_at).toLocaleDateString() : ""}
                            </p>
                            <button
                              type="button"
                              disabled
                              title="Video calls — coming soon"
                              className="cursor-not-allowed rounded-full bg-[#FFB09A]/20 px-2 py-0.5 text-[7px] font-semibold text-[#FFB09A]/50"
                            >
                              Join
                            </button>
                          </div>
                        </div>
                      ))}
                      {upcomingEvents.length === 0 && (
                        <p className="text-[8px] text-white/25">No events yet</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-white/8 bg-[#0D0F11] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold">Decisions</p>
                      <button onClick={() => setTab("decisions")} className="text-[8px] text-white/30 hover:text-white/60">See all →</button>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {decisions.slice(0, 3).map((d) => (
                        <div key={d.id} className="truncate text-[8px] text-white/55">{d.title}</div>
                      ))}
                      {decisions.length === 0 && <p className="text-[8px] text-white/25">No decisions yet</p>}
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-white/8 bg-[#0D0F11] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold">Links</p>
                      <button onClick={() => setTab("links")} className="text-[8px] text-white/30 hover:text-white/60">See all →</button>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {links.slice(0, 4).map((l) => (
                        <div key={l.id} className="truncate text-[8px] text-white/55">{l.label}</div>
                      ))}
                      {links.length === 0 && <p className="text-[8px] text-white/25">No links yet</p>}
                    </div>
                  </div>
                </div>
              </section>

              {/* Right sidebar */}
              <aside className="space-y-2">
                {/* Room focus ring */}
                <div className="rounded-[12px] border border-white/8 bg-[#0D0F11] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold">Room focus</p>
                      <p className="mt-0.5 text-[8px] text-white/35">
                        {doneCount} of {items.length} done
                      </p>
                    </div>
                    <span
                      className="flex h-14 w-14 items-center justify-center rounded-full border-[5px] text-[11px] font-black"
                      style={{ borderColor: "#FFB09A" }}
                    >
                      {focusPct}%
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {items.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex gap-2 text-[8px] text-white/50">
                        <span className={item.status === "done" ? "text-[#FFB09A]" : ""}>{item.status === "done" ? "☑" : "□"}</span>
                        <span className="truncate">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Room chat preview */}
                <div className="rounded-[12px] border border-white/8 bg-[#0D0F11] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold">Room chat</p>
                    <button onClick={() => setTab("chat")} className="text-[8px] text-white/35 hover:text-white/60">Open →</button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {messages.slice(0, 3).map((msg) => (
                      <div key={msg.id}>
                        <p className="text-[8px] font-semibold text-white/70">
                          {profileById.get(msg.author_id)?.name ?? "Room member"}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[8px] leading-relaxed text-white/40">
                          {msg.body}
                        </p>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <p className="text-[8px] text-white/25">Open Chat to start the conversation.</p>
                    )}
                  </div>
                </div>

                {/* People */}
                <div className="rounded-[12px] border border-white/8 bg-[#0D0F11] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold">People ({members.length})</p>
                    <button onClick={() => setTab("people")} className="text-[8px] text-white/35 hover:text-white/60">See all →</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {members.slice(0, 8).map((m) => {
                      const p = profileById.get(m.user_id);
                      const name = p?.name ?? p?.email ?? "K";
                      return (
                        <span
                          key={m.user_id}
                          title={name}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[8px] font-semibold"
                        >
                          {name.charAt(0).toUpperCase()}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </aside>
            </div>
          ) : null}

          {/* Wall */}
          {tab === "wall" ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {posts.map((post, i) => (
                <PostCard key={post.id} post={post} author={profileById.get(post.author_id)} index={i} />
              ))}
              {posts.length === 0 && (
                <p className="col-span-full py-12 text-center text-[10px] text-white/30">No wall posts yet. Be the first to share an update.</p>
              )}
            </div>
          ) : null}

          {/* Tasks / Calendar */}
          {tab === "tasks" || tab === "calendar" ? (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-[12px] border border-white/8 bg-[#0D0F11] px-4 py-3">
                  <span className={`text-[12px] ${item.status === "done" ? "text-[#FFB09A]" : "text-white/30"}`}>
                    {item.status === "done" ? "☑" : "□"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold">{item.title}</p>
                    {item.body && <p className="mt-0.5 truncate text-[9px] text-white/40">{item.body}</p>}
                  </div>
                  {(item.kind === "task" ? item.due_at : item.start_at) && (
                    <span className="shrink-0 text-[8px] text-white/35">
                      {new Date((item.kind === "task" ? item.due_at : item.start_at) ?? "").toLocaleDateString()}
                    </span>
                  )}
                  <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[7px] text-white/40">
                    {item.status}
                  </span>
                </div>
              ))}
              {items.length === 0 && <p className="py-12 text-center text-[10px] text-white/30">Nothing here yet.</p>}
            </div>
          ) : null}

          {/* Files */}
          {tab === "files" ? (
            <section className="rounded-[16px] border border-white/10 bg-[#0D0F11] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: "#FFB09A" }}>Room files</p>
                  <h2 className="mt-1 text-[16px] font-black">Shared private files</h2>
                </div>
                <label className="cursor-pointer rounded-full bg-white/10 px-4 py-2.5 text-[9px] font-black uppercase tracking-wide text-white hover:bg-white/15 transition">
                  {fileBusy ? "Uploading…" : "+ Upload file"}
                  <input type="file" className="sr-only" disabled={fileBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadRoomFile(f); e.currentTarget.value = ""; }} />
                </label>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-white/35">
                Stored in Kebu private storage. Download links are short-lived and only available to room members.
              </p>
              <div className="mt-4 divide-y divide-white/[.06]">
                {roomFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/[.05] text-white/50">
                      <KebuIcon name="library" size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold">{file.file_name}</p>
                      <p className="mt-0.5 text-[8px] uppercase tracking-wide text-white/35">
                        {file.mime} · {file.byte_size < 1048576 ? Math.max(1, Math.round(file.byte_size / 1024)) + " KB" : (file.byte_size / 1048576).toFixed(1) + " MB"}
                      </p>
                    </div>
                    {file.downloadUrl ? (
                      <a href={file.downloadUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-2 text-[8px] font-semibold hover:bg-white/10">Open</a>
                    ) : null}
                    <button type="button" onClick={() => void deleteRoomFile(file.id)} className="px-2 py-2 text-[8px] font-semibold text-red-400 hover:text-red-300">Remove</button>
                  </div>
                ))}
                {roomFiles.length === 0 && <p className="py-10 text-center text-[10px] text-white/30">No files in this room yet.</p>}
              </div>
            </section>
          ) : null}

          {/* Links */}
          {tab === "links" ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {links.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="block rounded-[14px] border border-white/10 bg-[#0D0F11] p-4 transition hover:border-white/20">
                  <p className="text-[12px] font-semibold">{link.label}</p>
                  <p className="mt-1 truncate text-[10px]" style={{ color: "#FFB09A" }}>{link.url}</p>
                </a>
              ))}
              {links.length === 0 && <p className="col-span-full py-12 text-center text-[10px] text-white/30">No links yet.</p>}
            </div>
          ) : null}

          {/* Decisions */}
          {tab === "decisions" ? (
            <div className="space-y-2">
              {decisions.map((d) => (
                <article key={d.id} className="rounded-[14px] border border-white/10 bg-[#0D0F11] p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[12px] font-semibold">{d.title}</p>
                    <p className="shrink-0 text-[8px] text-white/35">{new Date(d.decided_at).toLocaleString()}</p>
                  </div>
                  {d.detail && <p className="mt-2 whitespace-pre-wrap text-[10px] leading-relaxed text-white/55">{d.detail}</p>}
                </article>
              ))}
              {decisions.length === 0 && <p className="py-12 text-center text-[10px] text-white/30">No decisions recorded yet.</p>}
            </div>
          ) : null}

          {/* Ideas */}
          {tab === "ideas" ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {posts.map((post, i) => (
                <PostCard key={post.id} post={post} author={profileById.get(post.author_id)} index={i + 3} />
              ))}
              {posts.length === 0 && (
                <p className="col-span-full py-12 text-center text-[10px] text-white/30">No ideas shared yet. Add one above.</p>
              )}
            </div>
          ) : null}

          {/* People */}
          {tab === "people" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => {
                const p = profileById.get(member.user_id);
                const name = p?.name ?? p?.email ?? "Kebu member";
                return (
                  <article key={member.user_id} className="rounded-[16px] border border-white/10 bg-[#0D0F11] p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-black text-white"
                        style={{ background: "linear-gradient(135deg, #FF6A00, #FF1F1F)" }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-[12px] font-semibold">{name}</p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-wide text-white/40">{member.role}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
              {members.length === 0 && <p className="text-[10px] text-white/30">No room members loaded.</p>}
            </div>
          ) : null}

          {/* Chat */}
          {tab === "chat" ? (
            <div className="space-y-2">
              {messages.map((msg) => (
                <article key={msg.id} className="rounded-[14px] border border-white/10 bg-[#0D0F11] p-4">
                  <div className="flex items-baseline gap-3">
                    <p className="text-[10px] font-semibold">{profileById.get(msg.author_id)?.name ?? "Room member"}</p>
                    <p className="text-[8px] text-white/30">{new Date(msg.created_at).toLocaleString()}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[10px] leading-relaxed text-white/60">{msg.body}</p>
                </article>
              ))}
              {messages.length === 0 && <p className="py-12 text-center text-[10px] text-white/30">No messages yet. Start the conversation.</p>}
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
