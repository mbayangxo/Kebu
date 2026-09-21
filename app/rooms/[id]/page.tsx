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
      <div className="min-h-[calc(100vh-60px)] bg-[#080A0C] px-3 py-4 text-white sm:px-5">
        <div className="mx-auto max-w-[1520px]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[8px] text-white/35">DKLN&nbsp; › &nbsp;Rooms&nbsp; › &nbsp;{room?.name ?? "Room"}</p>
              <div className="mt-1 flex items-center gap-2"><h1 className="text-[27px] leading-none tracking-[-.035em]" style={{fontFamily:"var(--font-fraunces)"}}>{room?.name ?? "Loading…"}</h1><span className="text-white/30">☆</span></div>
            </div>
            <div className="flex items-center gap-2"><button type="button" className="rounded-full border border-white/15 px-3 py-2 text-[8px] font-semibold text-white/75">Share</button><button type="button" className="rounded-full bg-[#FFB09A] px-4 py-2 text-[8px] font-semibold text-[#210B07]">Start a call</button></div>
          </div>

          <nav className="mb-3 flex gap-2 overflow-x-auto">
            {TABS.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className="shrink-0 rounded-[10px] px-4 py-2.5 text-[8px] font-semibold" style={{ background: tab === item.id ? "#FFB09A" : "rgba(255,255,255,.055)", color: tab === item.id ? "#1A0806" : "rgba(255,255,255,.62)" }}>{item.label}</button>)}
          </nav>

          <section className="relative min-h-[205px] overflow-hidden rounded-[16px] border border-white/5">
            <div className="absolute inset-0" style={{background:"radial-gradient(circle at 28% 45%,rgba(255,106,0,.5),transparent 24%),radial-gradient(circle at 78% 30%,rgba(255,176,154,.22),transparent 18%),linear-gradient(110deg,#170b09,#6f2519 50%,#121417)"}} />
            <div className="absolute inset-0 opacity-25" style={{backgroundImage:"linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)",backgroundSize:"48px 48px"}} />
            <div className="relative grid min-h-[205px] items-center lg:grid-cols-[1fr_330px]">
              <div className="p-6 sm:p-8">
                <p className="text-[8px] font-semibold uppercase tracking-[.16em] text-[#FFB09A]">{room?.room_type ?? "Creative room"}</p>
                <h2 className="mt-2 text-[42px] leading-[.92] tracking-[-.045em] sm:text-[58px]" style={{fontFamily:"var(--font-fraunces)"}}>{room?.name ?? "Room"}</h2>
                <p className="mt-3 max-w-xl text-[10px] leading-relaxed text-white/55">{room?.description || "Create, collaborate and make it real."}</p>
              </div>
              <div className="border-l border-white/10 p-5"><p className="text-[28px] leading-[1.02] text-white/80" style={{fontFamily:"var(--font-fraunces)"}}>Create.<br/>Collaborate.<br/><span className="italic text-[#FFB09A]">Make it real.</span></p></div>
            </div>
          </section>
        </div>
        {error ? <div className="mx-auto mt-4 max-w-[1520px] rounded-xl border px-4 py-3 text-xs" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>{error}</div> : null}

        {tab !== "overview" && tab !== "people" && tab !== "files" ? (
          <section className="mx-auto mt-4 max-w-[1520px] rounded-[16px] border border-white/10 bg-[#0D0F11] p-3.5">
            <div className="grid gap-2 lg:grid-cols-[1fr_1fr_190px_auto]">
              <input value={text} onChange={(event) => setText(event.target.value)} placeholder={composerLabel()} className="min-h-10 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-bold text-white outline-none placeholder:text-white/25 focus:ring-2 focus:ring-[#FF6A00]" />
              {["tasks","calendar","links","decisions"].includes(tab) ? <input value={secondary} onChange={(event) => setSecondary(event.target.value)} placeholder={tab === "links" ? "https://…" : "Notes / details"} className="min-h-10 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs text-white outline-none placeholder:text-white/25 focus:ring-2 focus:ring-[#FF6A00]" /> : <div />}
              {["tasks","calendar"].includes(tab) ? <input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className="min-h-10 rounded-xl border border-white/10 bg-white/[.04] px-2 text-[10px] text-white outline-none" /> : <div />}
              <button type="button" disabled={!text.trim() || busy} onClick={() => void createAction()} className="rounded-xl bg-black px-4 py-2 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-35">{busy ? "Saving…" : "Add"}</button>
            </div>
          </section>
        ) : null}

        <div className="mx-auto mt-4 max-w-[1520px]">
          {tab === "overview" ? (
            <div className="mx-auto grid max-w-[1520px] gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
              <section className="min-w-0">
                <div className="flex items-center justify-between py-2"><p className="text-[15px] font-semibold">Project Wall</p><div className="flex gap-2"><span className="rounded-full bg-white/[.06] px-3 py-1.5 text-[8px] text-white/55">All</span><span className="rounded-full bg-white/[.04] px-3 py-1.5 text-[8px] text-white/35">Design</span><span className="rounded-full bg-white/[.04] px-3 py-1.5 text-[8px] text-white/35">Files</span></div></div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {posts.slice(0,4).map((post,index)=><article key={post.id} className="overflow-hidden rounded-[12px] border border-white/10 bg-[#111315]"><div className="h-[120px]" style={{background:index%2?"linear-gradient(135deg,#35110d,#ff6a00)":"linear-gradient(135deg,#17191c,#87483c)"}}/><div className="p-3"><p className="truncate text-[10px] font-semibold">{post.body.slice(0,42) || "Room update"}</p><p className="mt-1 text-[8px] text-white/35">{profileById.get(post.author_id)?.name || "Room member"} · {new Date(post.created_at).toLocaleDateString()}</p></div></article>)}
                  {roomFiles.slice(0,3).map((file,index)=><article key={file.id} className="overflow-hidden rounded-[12px] border border-white/10 bg-[#111315]"><div className="flex h-[120px] items-center justify-center" style={{background:index%2?"#1b1515":"#15181b"}}><KebuIcon name="library" size={28} style={{color:"#FFB09A"}}/></div><div className="p-3"><p className="truncate text-[10px] font-semibold">{file.file_name}</p><p className="mt-1 text-[8px] text-white/35">{file.mime}</p></div></article>)}
                  <button type="button" onClick={()=>setTab("files")} className="flex min-h-[174px] flex-col items-center justify-center rounded-[12px] border border-dashed border-white/15 text-white/40"><span className="text-2xl">＋</span><span className="mt-2 text-[9px]">Add to wall</span></button>
                </div>

                <div className="mt-3 grid gap-2 lg:grid-cols-4">
                  <div className="rounded-[12px] border border-white/10 bg-[#0D0F11] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold">Tasks</p><button onClick={()=>setTab("tasks")} className="text-[8px] text-white/30">See all →</button></div><div className="mt-2 space-y-2">{items.filter((i)=>i.kind==="task").slice(0,4).map((item)=><div key={item.id} className="flex gap-2 text-[8px] text-white/60"><span>□</span><span className="truncate">{item.title}</span></div>)}</div></div>
                  <div className="rounded-[12px] border border-white/10 bg-[#0D0F11] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold">Upcoming</p><button onClick={()=>setTab("calendar")} className="text-[8px] text-white/30">See all →</button></div><div className="mt-2 space-y-2">{items.filter((i)=>i.kind==="event").slice(0,4).map((item)=><div key={item.id} className="text-[8px] text-white/60"><p className="truncate">{item.title}</p><p className="text-white/30">{item.start_at?new Date(item.start_at).toLocaleString():""}</p></div>)}</div></div>
                  <div className="rounded-[12px] border border-white/10 bg-[#0D0F11] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold">Decisions</p><button onClick={()=>setTab("decisions")} className="text-[8px] text-white/30">See all →</button></div><div className="mt-2 space-y-2">{decisions.slice(0,4).map((item)=><div key={item.id} className="text-[8px] text-white/60"><p className="truncate">{item.title}</p></div>)}</div></div>
                  <div className="rounded-[12px] border border-white/10 bg-[#0D0F11] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold">Links</p><button onClick={()=>setTab("links")} className="text-[8px] text-white/30">See all →</button></div><div className="mt-2 space-y-2">{links.slice(0,4).map((item)=><div key={item.id} className="truncate text-[8px] text-white/60">{item.label}</div>)}</div></div>
                </div>
              </section>

              <aside className="space-y-2">
                <div className="rounded-[12px] border border-white/10 bg-[#0D0F11] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold">Room focus</p><span className="flex h-12 w-12 items-center justify-center rounded-full border-[6px] border-[#FFB09A] text-[10px]">{items.length ? Math.min(99, Math.round((items.filter((i)=>i.status==="done").length / items.length)*100)) : 0}%</span></div><div className="mt-2 space-y-2">{items.slice(0,4).map((item)=><div key={item.id} className="flex gap-2 text-[8px] text-white/55"><span>{item.status==="done"?"☑":"□"}</span><span className="truncate">{item.title}</span></div>)}</div></div>
                <div className="rounded-[12px] border border-white/10 bg-[#0D0F11] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold">Room chat</p><button onClick={()=>setTab("chat")} className="text-[8px] text-white/30">Open →</button></div><div className="mt-2 space-y-3">{messages.slice(0,4).map((message)=><div key={message.id}><p className="text-[8px] font-semibold">{profileById.get(message.author_id)?.name || "Room member"}</p><p className="mt-0.5 line-clamp-2 text-[8px] leading-relaxed text-white/45">{message.body}</p></div>)}{!messages.length?<p className="text-[8px] text-white/30">Open Chat to start the conversation.</p>:null}</div></div>
                <div className="rounded-[12px] border border-white/10 bg-[#0D0F11] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold">People in room ({members.length})</p><button onClick={()=>setTab("people")} className="text-[8px] text-white/30">See all →</button></div><div className="mt-3 flex flex-wrap gap-2">{members.slice(0,8).map((member)=>{const p=profileById.get(member.user_id);const name=p?.name||p?.email||"K";return <span key={member.user_id} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[8px] font-semibold" title={name}>{name.slice(0,1).toUpperCase()}</span>})}</div></div>
              </aside>
            </div>
          ) : null}
          {tab === "wall" ? <List>{posts.map((post) => <Card key={post.id} title={profileById.get(post.author_id)?.name || "Room member"} meta={new Date(post.created_at).toLocaleString()} body={post.body} />)}</List> : null}
          {tab === "tasks" || tab === "calendar" ? <List>{items.map((item) => <Card key={item.id} title={item.title} meta={(item.kind === "task" ? item.due_at : item.start_at) ? new Date((item.kind === "task" ? item.due_at : item.start_at) || "").toLocaleString() : item.status} body={item.body} />)}</List> : null}
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
          {tab === "links" ? <List>{links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="block rounded-[18px] border bg-white p-4 hover:-translate-y-0.5 transition" style={{ borderColor: KEBU.borders.default }}><p className="text-[12px] font-black">{link.label}</p><p className="mt-1 truncate text-[10px]" style={{ color: KEBU.orange }}>{link.url}</p></a>)}</List> : null}
          {tab === "decisions" ? <List>{decisions.map((decision) => <Card key={decision.id} title={decision.title} meta={new Date(decision.decided_at).toLocaleString()} body={decision.detail} />)}</List> : null}
          {tab === "people" ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{members.map((member) => { const p = profileById.get(member.user_id); const name = p?.name || p?.email || "Kebu member"; return <article key={member.user_id} className="rounded-[20px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-black text-white" style={{ background: "linear-gradient(135deg,#FF6A00,#FF1F1F)" }}>{name.charAt(0).toUpperCase()}</span><div><p className="text-[12px] font-black">{name}</p><p className="text-[9px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{member.role}</p></div></div></article>; })}{!members.length ? <p className="text-[10px]" style={{ color: KEBU.muted }}>No room members loaded.</p> : null}</div> : null}
          {tab === "chat" ? <List>{messages.map((message) => <Card key={message.id} title={profileById.get(message.author_id)?.name || "Room member"} meta={new Date(message.created_at).toLocaleString()} body={message.body} />)}</List> : null}
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
