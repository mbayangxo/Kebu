"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";

type Broadcast = { id: string; title: string; expires_at: string };
const control = "inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a93600] disabled:opacity-45";
const button = control + " bg-[#ff5500] text-[#0a0a0a] hover:bg-[#ff7733]";
const secondary = control + " border border-black/15 bg-white text-[#0a0a0a] hover:bg-[#fff8f2]";
const input = "min-h-11 w-full min-w-0 rounded-xl border border-black/20 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-[#a93600]";
const heading = { fontFamily: "var(--font-fraunces)" };

function LiveMark() {
  return <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M8 8a5.66 5.66 0 0 0 0 8m8-8a5.66 5.66 0 0 1 0 8M5 5a9.9 9.9 0 0 0 0 14M19 5a9.9 9.9 0 0 1 0 14" /></svg>;
}
async function api<T>(body?: object): Promise<T> {
  const result = await fetch("/api/public-live", body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : { cache: "no-store" });
  const data = await result.json();
  if (!result.ok) throw new Error(data.error ?? "Could not reach Live Rooms.");
  return data as T;
}

export function LiveRooms() {
  const [setup, setSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roomError, setRoomError] = useState("");
  const [videoReady, setVideoReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [rooms, setRooms] = useState<Broadcast[]>([]);
  const [selected, setSelected] = useState<Broadcast>();
  const [host, setHost] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [personId, setPersonId] = useState("");
  const [person, setPerson] = useState<string>();
  const media = useRef<HTMLDivElement>(null);
  const connection = useRef<Room>(null);
  const tracks = useRef(new Map<RemoteTrack, HTMLMediaElement>());
  const locked = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setRooms((await api<{ rooms: Broadcast[] }>()).rooms);
      setRoomError("");
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : "Could not load rooms.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    return () => { void connection.current?.disconnect(); };
  }, [refresh]);

  async function run(fn: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setNotice("");
    try { await fn(); } catch (error) { setNotice(error instanceof Error ? error.message : "Please try again."); }
    finally { locked.current = false; setBusy(false); }
  }
  async function enter(broadcast: Broadcast) {
    const grant = await api<{ url: string; token: string; host: boolean }>({ action: "join", id: broadcast.id });
    const room = new Room({ adaptiveStream: true, dynacast: true });
    connection.current = room;
    setHost(grant.host);
    setSelected(broadcast);
    setConnecting(true);
    setVideoReady(false);
    function attach(track: RemoteTrack) {
      if (tracks.current.has(track)) return;
      const node = track.attach();
      node.className = track.kind === Track.Kind.Video ? "h-full w-full object-contain" : "hidden";
      if (track.kind === Track.Kind.Video) setVideoReady(true);
      tracks.current.set(track, node);
      media.current?.appendChild(node);
    }
    room.on(RoomEvent.TrackSubscribed, attach);
    room.on(RoomEvent.TrackUnsubscribed, track => {
      tracks.current.get(track)?.remove(); track.detach(); tracks.current.delete(track);
      if (track.kind === Track.Kind.Video) setVideoReady([...tracks.current.keys()].some(item => item.kind === Track.Kind.Video));
    });
    room.on(RoomEvent.Disconnected, () => {
      if (connection.current !== room) return;
      for (const [track, node] of tracks.current) { track.detach(); node.remove(); }
      tracks.current.clear();
      connection.current = null;
      media.current?.replaceChildren();
      setSelected(undefined);
    });
    try {
      await room.connect(grant.url, grant.token);
      await room.startAudio();
      if (grant.host) {
        await room.localParticipant.enableCameraAndMicrophone();
        const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
        if (track && media.current) {
          const preview = track.attach();
          preview.muted = true;
          preview.className = "h-full w-full object-contain";
          setVideoReady(true);
          media.current.append(preview);
        }
      }
    } catch (error) {
      await room.disconnect();
      setSelected(undefined);
      throw error;
    } finally { setConnecting(false); }
  }

  async function findPerson(event: FormEvent) {
    event.preventDefault(); setPerson(undefined);
    await run(async () => {
      const result = await fetch("/api/people/find?q=" + encodeURIComponent(personId.trim()), { cache: "no-store" });
      if (!result.ok) throw new Error("Could not search KEBU people.");
      const data = await result.json();
      setPerson(data.person ? (data.person.name || data.person.public_kebu_id) : "No account matched that username or public KEBU ID.");
    });
  }

  return <div className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4 rounded-[28px] border border-[#ff5500]/15 bg-[#fff8f2] p-5 sm:p-8">
      <div className="min-w-0">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8c3000]"><LiveMark /> KEBU Live</p>
        <h1 className="break-words text-4xl tracking-tight sm:text-5xl" style={heading}>{selected ? selected.title : "Live Rooms"}</h1>
        <p className="mt-2 text-sm text-[#5c5348]">{selected ? (connecting ? "Connecting to the broadcast…" : host ? "You’re hosting this public broadcast." : "You’re watching a public broadcast.") : "See what’s happening live, or start a broadcast of your own."}</p>
      </div>
      {!selected && <div className="flex flex-wrap gap-2">
        <button className={button} type="button" aria-expanded={setup} aria-controls="broadcast-setup" onClick={() => setSetup(value => !value)}>{setup ? "Close setup" : "Go live"}</button>
        <a className={secondary} href="#live-find-people">Find people</a>
      </div>}
    </header>
    {notice && <p role="status" className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm">{notice}</p>}
    <div className={selected ? "relative isolate aspect-video max-h-[68vh] overflow-hidden rounded-[20px] bg-[#0a0a0a]" : "hidden"}>
      <div ref={media} className="absolute inset-0" />
      {selected && !videoReady && <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center px-4 text-center text-sm text-white/80">{connecting ? "Connecting…" : host ? "Camera preview unavailable" : "Waiting for the host’s video"}</p>}
    </div>
    {selected ? <section aria-label="Broadcast controls" className="sticky bottom-2 z-10 flex flex-wrap gap-2 rounded-[20px] border border-black/10 bg-white p-3 shadow-sm">
      {!host && <button type="button" className={secondary} disabled={busy} onClick={() => void run(async () => { await connection.current?.startAudio(); })}>Enable audio</button>}
      <button className={host ? control + " bg-[#8b1e1e] text-white hover:bg-[#701717]" : button} disabled={busy} onClick={() => void run(async () => {
        if (host) await api({ action: "end", id: selected.id });
        await connection.current?.disconnect();
        setSelected(undefined);
        await refresh();
      })}>{host ? "End broadcast" : "Leave room"}</button>
      {!host && <button className={secondary} disabled={busy} onClick={() => void run(async () => {
        await api({ action: "report", id: selected.id, reason: "other" });
        setNotice("Report submitted.");
      })}>Report broadcast</button>}
    </section> : <>
      <div id="broadcast-setup" hidden={!setup}>
        {setup && <form className="space-y-3 rounded-[20px] border border-black/10 bg-white p-5" onSubmit={event => {
          event.preventDefault();
          void run(async () => {
            const { room } = await api<{ room: Broadcast }>({ action: "start", title: title.trim() });
            await enter(room);
            setSetup(false);
          });
        }}>
          <h2 className="text-2xl" style={heading}>Set up your broadcast</h2>
          <p className="text-sm text-[#5c5348]">Starting turns on your camera and microphone after you grant permission. Your room is public.</p>
          <label className="grid max-w-lg gap-1 text-sm font-medium">Broadcast title<input className={input} value={title} required minLength={3} maxLength={80} onChange={event => setTitle(event.target.value)} /></label>
          <button className={button} disabled={busy || title.trim().length < 3}>{busy ? "Please wait…" : "Start public broadcast"}</button>
        </form>}
      </div>
      <section aria-labelledby="live-now" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="live-now" className="text-3xl" style={heading}>Live now</h2>
          <button className={secondary} disabled={busy || loading} onClick={() => void run(refresh)}>Refresh</button>
        </div>
        {loading ? <p role="status" className="text-sm text-[#5c5348]">Finding live broadcasts…</p>
        : roomError ? <p role="alert" className="rounded-xl border border-red-200 bg-white p-4 text-sm">{roomError} Try refreshing.</p>
        : rooms.length ? <div className="grid gap-3 sm:grid-cols-2">{rooms.map(room => <article className="flex min-w-0 flex-col items-start gap-3 rounded-[20px] border border-black/10 bg-white p-5" key={room.id}>
          <span className="rounded-full bg-[#fff0e6] px-2.5 py-1 text-xs font-bold text-[#8c3000]">Public broadcast</span>
          <h3 className="w-full break-words text-lg font-semibold">{room.title}</h3>
          <button className={button + " mt-auto"} aria-label={`Watch ${room.title}`} disabled={busy} onClick={() => void run(() => enter(room))}>Watch room</button>
        </article>)}</div> : <div className="rounded-[20px] border border-dashed border-black/20 bg-white px-5 py-8 text-center">
          <div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-[#fff0e6] text-[#8c3000]"><LiveMark /></div>
          <h3 className="text-lg font-semibold">Nobody’s live right now</h3>
          <p className="mt-1 text-sm text-[#5c5348]">Check back soon, or start a public broadcast.</p>
        </div>}
      </section>
    </>}
    <section id="live-find-people" className="scroll-mt-6 space-y-3 rounded-[20px] border border-black/10 bg-white p-5">
      <h2 className="text-2xl" style={heading}>Find people</h2>
      <form className="flex flex-wrap items-end gap-3" onSubmit={findPerson}>
        <label className="grid min-w-0 flex-auto gap-1 text-sm font-medium sm:flex-none">Username or public KEBU ID<input className={input} value={personId} maxLength={25} onChange={event => setPersonId(event.target.value)} /></label>
        <button className={secondary} disabled={busy || !personId.trim()}>Find person</button>
      </form>
      {person && <p role="status">{person}</p>}
      <Link className="text-sm font-medium text-[#8c3000] underline underline-offset-4" href="/friends">Manage connections in Friends</Link>
    </section>
  </div>;
}
