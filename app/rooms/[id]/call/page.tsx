"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gridColumns, DEFAULT_MESH_PARTICIPANTS, MESH_PARTICIPANT_OPTIONS } from "@/lib/rooms/call-mesh";
import { useMeshCall } from "@/app/components/rooms/use-mesh-call";

type Person = { id: string; name: string | null };
type HistoryCall = {
  id: string; started_by: string; started_at: string; ended_at: string | null;
  participants: { user_id: string; joined_at: string; left_at: string | null }[];
};

function RemoteVideo({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return <video ref={ref} autoPlay playsInline className="aspect-video w-full object-contain" />;
}

export default function RoomCallPage() {
  const { id } = useParams<{ id: string }>();
  const [people, setPeople] = useState<Person[]>([]);
  const [history, setHistory] = useState<HistoryCall[]>([]);
  const local = useRef<HTMLVideoElement>(null);
  const call = useMeshCall(id);
  const [groupSize, setGroupSize] = useState(DEFAULT_MESH_PARTICIPANTS);

  useEffect(() => {
    const abort = new AbortController();
    void fetch(`/api/rooms/${encodeURIComponent(id)}?tab=people`, { signal: abort.signal })
      .then((r) => r.json()).then((d) => setPeople(d.profiles ?? [])).catch(() => {});
    void fetch(`/api/rooms/${encodeURIComponent(id)}/call`, { signal: abort.signal })
      .then((r) => r.json()).then((d) => setHistory(d.calls ?? [])).catch(() => {});
    return () => abort.abort();
  }, [id, call.phase]);

  const nameFor = (uid: string) => people.find((p) => p.id === uid)?.name || (uid === call.selfId ? "You" : "Teammate");
  const tileCount = 1 + call.peers.length;
  const button = "rounded-xl border border-zinc-600 px-4 py-2 text-sm disabled:opacity-50";

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-5 bg-zinc-950 p-5 text-white sm:p-8">
      <Link href={`/rooms/${id}`} className="text-sm text-zinc-300 underline">Back to room</Link>
      <h1 className="text-2xl font-semibold">Room call</h1>
      {call.error && <p role="alert" className="rounded-xl bg-red-950 p-3">{call.error}</p>}

      {call.phase === "idle" && (
        <div className="space-y-2">
          <label className="block text-sm text-zinc-300" htmlFor="call-group-size">
            Group size if you're starting a new call (joining one already in progress keeps its own limit)
          </label>
          <select
            id="call-group-size"
            className="rounded-xl border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm"
            value={groupSize}
            onChange={(e) => setGroupSize(Number(e.target.value))}
          >
            {MESH_PARTICIPANT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div>
            <button className={button} onClick={() => void call.join(groupSize)}>Join with camera and mic</button>
          </div>
        </div>
      )}
      {call.phase === "joining" && <p role="status">Connecting…</p>}
      {call.phase === "ended" && <p role="status">You left the call.</p>}

      {call.phase === "in-call" && (
        <>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${gridColumns(tileCount)}, minmax(0, 1fr))` }}
          >
            <div className="overflow-hidden rounded-xl bg-zinc-900">
              <video ref={(el) => { local.current = el; if (el) el.srcObject = call.localStream; }} muted autoPlay playsInline className="aspect-video w-full object-contain" />
              <p className="p-2 text-sm">{call.sharing ? "Your shared screen" : "You"}</p>
            </div>
            {call.peers.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl bg-zinc-900">
                <RemoteVideo stream={p.stream} />
                <p role="status" className="p-2 text-sm">
                  {nameFor(p.id)} — {p.state === "connected" ? "Connected" : p.state === "failed" ? "Connection failed" : "Connecting…"}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={call.toggleMute}>{call.muted ? "Unmute" : "Mute"}</button>
            <button className={button} onClick={call.toggleCamera}>{call.cameraOff ? "Turn camera on" : "Turn camera off"}</button>
            {typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getDisplayMedia === "function" && (
              <button className={button} onClick={() => void call.toggleShare()}>{call.sharing ? "Stop sharing" : "Share screen"}</button>
            )}
            <button className={button} onClick={() => void call.leave()}>Leave call</button>
          </div>
        </>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-300">Past calls</h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="rounded-xl border border-zinc-700 p-3 text-sm">
                <p>{new Date(h.started_at).toLocaleString()} — {nameFor(h.started_by)} started</p>
                <p className="text-xs text-zinc-400">
                  {h.participants.length} participant{h.participants.length === 1 ? "" : "s"} ·{" "}
                  {h.ended_at ? `ended ${new Date(h.ended_at).toLocaleTimeString()}` : "in progress"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
