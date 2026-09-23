"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";

type Tab = "overview" | "wall" | "tasks" | "calendar" | "files" | "links" | "decisions" | "people" | "chat";
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
  { id: "overview", label: "Home" }, { id: "wall", label: "Wall" }, { id: "tasks", label: "Tasks" },
  { id: "calendar", label: "Calendar" }, { id: "files", label: "Files" }, { id: "links", label: "Links" }, { id: "people", label: "People" },
  { id: "decisions", label: "Decisions" }, { id: "chat", label: "Chat" },
];

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [tab, setTab] = useState<Tab>("overview");
  const [room, setRoom] = useState<Room | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [tabLoading, setTabLoading] = useState(true);
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
    setTabLoading(true);
    const res = await fetch("/api/rooms/" + id + "?tab=" + tab, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setTabLoading(false);
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
  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);

  async function createAction() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    let body: Record<string, unknown>;
    if (tab === "wall") body = { action: "post", body: text.trim() };
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
    setRoomFiles((current) => [data.file, ...current]);
  }

  async function deleteRoomFile(fileId: string) {
    if (!id) return;
    const previous = roomFiles;
    setRoomFiles((current) => current.filter((file) => file.id !== fileId));
    const res = await fetch("/api/rooms/" + id + "/files?fileId=" + encodeURIComponent(fileId), { method: "DELETE", credentials: "include" });
    if (!res.ok) { setRoomFiles(previous); setError("Could not remove file."); }
  }

  function composerLabel() {
    if (tab === "wall") return "Share an update with the room";
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

  return (
    <AppShell title={room?.name ?? "Room"}>
      <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5">
        <header className="overflow-hidden rounded-[24px] bg-black text-white">
          <div className="grid min-h-[190px] lg:grid-cols-[1fr_420px]">
            <div className="p-5 sm:p-7">
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FF6A00]">Room · {room?.room_type ?? "project"}</p>
              <h1 className="mt-3 text-4xl font-black leading-[.95] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>{room?.name ?? "Loading…"}</h1>
              <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-white/55">{room?.description || "A shared place for this work."}</p>
            </div>
            <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#FF6A00,#FF1F1F)" }}>
              <div className="absolute -right-14 -top-10 h-56 w-56 rotate-[30deg] rounded-[52px] border-[28px] border-black/60" />
              <div className="absolute bottom-6 left-7 text-[10px] font-black uppercase tracking-[.16em] text-black/55">Wall · Tasks · Time<br />Links · People · Decisions · Chat</div>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-2">
            {TABS.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className="shrink-0 rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-wide" style={{ background: tab === item.id ? KEBU.orange : "rgba(255,255,255,.06)", color: tab === item.id ? "white" : "rgba(255,255,255,.55)" }}>{item.label}</button>)}
          </nav>
        </header>

        {error ? <div className="mt-4 rounded-xl border px-4 py-3 text-xs" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>{error}</div> : null}

        {tab !== "overview" && tab !== "people" && tab !== "files" ? (
          <section className="mt-4 rounded-[20px] border bg-white p-3.5" style={{ borderColor: KEBU.borders.default }}>
            <div className="grid gap-2 lg:grid-cols-[1fr_1fr_190px_auto]">
              <input value={text} onChange={(event) => setText(event.target.value)} placeholder={composerLabel()} className="min-h-10 rounded-xl border px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} />
              {["tasks","calendar","links","decisions"].includes(tab) ? <input value={secondary} onChange={(event) => setSecondary(event.target.value)} placeholder={tab === "links" ? "https://…" : "Notes / details"} className="min-h-10 rounded-xl border px-3 text-xs outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} /> : <div />}
              {["tasks","calendar"].includes(tab) ? <input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className="min-h-10 rounded-xl border px-2 text-[10px] outline-none" style={{ borderColor: KEBU.borders.default }} /> : <div />}
              <button type="button" disabled={!text.trim() || busy} onClick={() => void createAction()} className="rounded-xl bg-black px-4 py-2 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-35">{busy ? "Saving…" : "Add"}</button>
            </div>
          </section>
        ) : null}

        <div className="mt-4">
          {tabLoading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-[18px]" style={{ background: "rgba(0,0,0,0.04)" }} />)}
            </div>
          ) : (
            <>
              {tab === "overview" ? (
                <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
                  <section className="rounded-[22px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
                    <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>Room focus</p>
                    <h2 className="mt-1 text-lg font-black">What is moving right now</h2>
                    <div className="mt-4 space-y-2">
                      {items.slice(0, 8).map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-black/[.025] px-3 py-3"><KebuIcon name={item.kind === "event" ? "calendar" : "work"} size={16} style={{ color: KEBU.orange }} /><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold">{item.title}</span><span className="text-[9px]" style={{ color: KEBU.muted }}>{item.kind}{item.due_at || item.start_at ? " · " + new Date(item.due_at || item.start_at || "").toLocaleString() : ""}</span></span></div>)}
                      {!items.length ? <p className="text-[10px]" style={{ color: KEBU.muted }}>No tasks or events yet.</p> : null}
                    </div>
                  </section>
                  <div className="space-y-4">
                    <section className="rounded-[22px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}><p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>Wall</p>{posts.slice(0, 3).map((post) => <p key={post.id} className="mt-3 border-t pt-3 text-[11px] leading-relaxed" style={{ borderColor: KEBU.borders.subtle }}>{post.body}</p>)}{!posts.length ? <p className="mt-2 text-[10px]" style={{ color: KEBU.muted }}>No updates yet.</p> : null}</section>
                    <section className="rounded-[22px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}><p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>Decisions</p>{decisions.slice(0, 3).map((decision) => <div key={decision.id} className="mt-3"><p className="text-[11px] font-bold">{decision.title}</p><p className="text-[9px]" style={{ color: KEBU.muted }}>{decision.detail}</p></div>)}{!decisions.length ? <p className="mt-2 text-[10px]" style={{ color: KEBU.muted }}>Nothing recorded yet.</p> : null}</section>
                  </div>
                </div>
              ) : null}

              {tab === "wall" ? (
                posts.length ? <List>{posts.map((post) => <Card key={post.id} title={profileById.get(post.author_id)?.name || "Room member"} meta={new Date(post.created_at).toLocaleString()} body={post.body} />)}</List>
                : <TabEmpty icon="people" message="Nothing on the wall yet." hint="Post an update above to share with the room." />
              ) : null}
              {tab === "tasks" || tab === "calendar" ? (
                items.length ? <List>{items.map((item) => <Card key={item.id} title={item.title} meta={(item.kind === "task" ? item.due_at : item.start_at) ? new Date((item.kind === "task" ? item.due_at : item.start_at) || "").toLocaleString() : item.status} body={item.body} />)}</List>
                : <TabEmpty icon="calendar" message={tab === "tasks" ? "No tasks yet." : "No events yet."} hint="Add one using the form above." />
              ) : null}
              {tab === "files" ? (
                <section className="rounded-[22px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>Room files</p><h2 className="mt-1 text-lg font-black">Shared private files</h2></div>
                    <label className="cursor-pointer rounded-full bg-black px-4 py-2.5 text-[9px] font-black uppercase tracking-wide text-white">
                      {fileBusy ? "Uploading…" : "Upload file"}
                      <input type="file" className="sr-only" disabled={fileBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadRoomFile(file); event.currentTarget.value = ""; }} />
                    </label>
                  </div>
                  <p className="mt-1 text-[9px] leading-relaxed" style={{ color: KEBU.muted }}>Stored in Kebu private storage. Download links are short-lived and only generated for room members.</p>
                  <div className="mt-4 divide-y" style={{ borderColor: KEBU.borders.subtle }}>
                    {roomFiles.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: KEBU.cream, color: KEBU.orange }}><KebuIcon name="library" size={17} /></span>
                        <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black">{file.file_name}</p><p className="mt-0.5 text-[8px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{file.mime} · {file.byte_size < 1048576 ? Math.max(1, Math.round(file.byte_size / 1024)) + " KB" : (file.byte_size / 1048576).toFixed(1) + " MB"}</p></div>
                        {file.downloadUrl ? <a href={file.downloadUrl} target="_blank" rel="noreferrer" className="rounded-full border px-3 py-2 text-[8px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.borders.default }}>Open</a> : null}
                        <button type="button" onClick={() => void deleteRoomFile(file.id)} className="px-2 py-2 text-[8px] font-black uppercase tracking-wide text-red-600">Remove</button>
                      </div>
                    ))}
                    {!roomFiles.length ? <p className="py-8 text-center text-[10px]" style={{ color: KEBU.muted }}>No files in this room yet.</p> : null}
                  </div>
                </section>
              ) : null}
              {tab === "links" ? (
                links.length ? <List>{links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="block rounded-[18px] border bg-white p-4 hover:-translate-y-0.5 transition" style={{ borderColor: KEBU.borders.default }}><p className="text-[12px] font-black">{link.label}</p><p className="mt-1 truncate text-[10px]" style={{ color: KEBU.orange }}>{link.url}</p></a>)}</List>
                : <TabEmpty icon="arrowRight" message="No links saved yet." hint="Add a label and URL using the form above." />
              ) : null}
              {tab === "decisions" ? (
                decisions.length ? <List>{decisions.map((decision) => <Card key={decision.id} title={decision.title} meta={new Date(decision.decided_at).toLocaleString()} body={decision.detail} />)}</List>
                : <TabEmpty icon="universe" message="No decisions recorded yet." hint="Log a decision above so the team has a clear record." />
              ) : null}
              {tab === "people" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((member) => { const p = profileById.get(member.user_id); const name = p?.name || p?.email || "Kebu member"; return <article key={member.user_id} className="rounded-[20px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-black text-white" style={{ background: "linear-gradient(135deg,#FF6A00,#FF1F1F)" }}>{name.charAt(0).toUpperCase()}</span><div><p className="text-[12px] font-black">{name}</p><p className="text-[9px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{member.role}</p></div></div></article>; })}
                  {!members.length ? <p className="col-span-full text-[10px]" style={{ color: KEBU.muted }}>No room members loaded.</p> : null}
                </div>
              ) : null}
              {tab === "chat" ? (
                messages.length ? <List>{messages.map((message) => <Card key={message.id} title={profileById.get(message.author_id)?.name || "Room member"} meta={new Date(message.created_at).toLocaleString()} body={message.body} />)}</List>
                : <TabEmpty icon="message" message="No messages yet." hint="Send the first message using the field above." />
              ) : null}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 lg:grid-cols-2">{children}</div>;
}
function Card({ title, meta, body }: { title: string; meta: string; body: string }) {
  return <article className="rounded-[18px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}><div className="flex items-baseline justify-between gap-3"><p className="text-[12px] font-black">{title}</p><p className="shrink-0 text-[8px]" style={{ color: KEBU.faint }}>{meta}</p></div>{body ? <p className="mt-3 whitespace-pre-wrap text-[11px] leading-relaxed text-black/75">{body}</p> : null}</article>;
}
function TabEmpty({ icon, message, hint }: { icon: import("@/app/components/kebu/kebu-icon").KebuIconName; message: string; hint: string }) {
  return (
    <div className="rounded-[22px] border border-dashed bg-white p-10 text-center" style={{ borderColor: KEBU.borders.default }}>
      <KebuIcon name={icon} size={26} className="mx-auto mb-3" style={{ color: KEBU.faint }} />
      <p className="text-sm font-black">{message}</p>
      <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>{hint}</p>
    </div>
  );
}
