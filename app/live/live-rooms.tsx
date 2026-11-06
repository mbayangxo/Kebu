"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";

type Broadcast = { id: string; title: string; expires_at: string };
const button = "rounded-full bg-black px-4 py-2 font-semibold text-white disabled:opacity-40";
async function api<T>(body?: object): Promise<T> {
  const result = await fetch("/api/public-live", body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : { cache: "no-store" });
  const data = await result.json();
  if (!result.ok) throw new Error(data.error ?? "Could not reach Live Rooms.");
  return data as T;
}

export function LiveRooms() {
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

  const refresh = useCallback(async () => setRooms((await api<{ rooms: Broadcast[] }>()).rooms), []);
  useEffect(() => {
    void refresh().catch((error: Error) => setNotice(error.message));
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
    function attach(track: RemoteTrack) {
      if (tracks.current.has(track)) return;
      const node = track.attach();
      node.className = "max-h-[60vh] w-full rounded-2xl";
      tracks.current.set(track, node);
      media.current?.appendChild(node);
    }
    room.on(RoomEvent.TrackSubscribed, attach);
    room.on(RoomEvent.TrackUnsubscribed, track => {
      tracks.current.get(track)?.remove(); track.detach(); tracks.current.delete(track);
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
          preview.className = "max-h-[60vh] w-full rounded-2xl";
          media.current.append(preview);
        }
      }
    } catch (error) {
      await room.disconnect();
      throw error;
    }
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

  return <div className="space-y-6">
    {notice && <p role="status">{notice}</p>}
    <div ref={media} className={selected ? "min-h-24 rounded-2xl bg-black" : "hidden"} />
    {selected ? <section className="space-y-3">
      <h2 className="text-xl font-bold">{selected.title}</h2>
      {!host && <button className="underline" onClick={() => void connection.current?.startAudio()}>Enable audio</button>}
      <div className="flex flex-wrap gap-3">
        <button className={button} disabled={busy} onClick={() => void run(async () => {
          if (host) await api({ action: "end", id: selected.id });
          await connection.current?.disconnect();
          setSelected(undefined);
          await refresh();
        })}>{host ? "End broadcast" : "Leave room"}</button>
        {!host && <button className={button} disabled={busy} onClick={() => void run(async () => {
          await api({ action: "report", id: selected.id, reason: "other" });
          setNotice("Report submitted.");
        })}>Report broadcast</button>}
      </div>
    </section> : <>
      <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
        event.preventDefault();
        void run(async () => {
          const { room } = await api<{ room: Broadcast }>({ action: "start", title: title.trim() });
          await enter(room);
        });
      }}>
        <label className="grid gap-1">Broadcast title<input className="rounded border p-2" value={title} maxLength={80} onChange={event => setTitle(event.target.value)} /></label>
        <button className={button} disabled={busy || title.trim().length < 3}>Start public broadcast</button>
      </form>
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Public broadcasts</h2>
          <button className="underline" disabled={busy} onClick={() => void run(refresh)}>Refresh</button></div>
        {rooms.length ? rooms.map(room => <div className="flex items-center justify-between gap-3 rounded-xl border p-4" key={room.id}>
          <span className="font-semibold">{room.title}</span><button className={button} disabled={busy} onClick={() => void run(() => enter(room))}>Enter room</button>
        </div>) : <p>No broadcasts are listed right now.</p>}
      </section>
    </>}
    <section className="space-y-3 rounded-2xl border p-5">
      <h2 className="text-xl font-bold">Find people</h2>
      <form className="flex flex-wrap items-end gap-3" onSubmit={findPerson}>
        <label className="grid gap-1">Username or public KEBU ID<input className="rounded border p-2" value={personId} maxLength={25} onChange={event => setPersonId(event.target.value)} /></label>
        <button className={button} disabled={busy || !personId.trim()}>Find person</button>
      </form>
      {person && <p role="status">{person}</p>}
      <Link className="underline" href="/friends">Open Friends to manage connections</Link>
    </section>
  </div>;
}
