"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Call = { id: string; host: boolean; ended: boolean; offer: string | null; answer: string | null; iceServers: RTCIceServer[] };
type Person = { id: string; name: string | null };
type Session = { pc: RTCPeerConnection; stream: MediaStream; screen?: MediaStream; stop: AbortController };

function close(session: Session | null) {
  if (!session) return;
  session.stop.abort();
  session.pc.close();
  for (const stream of [session.stream, session.screen]) stream?.getTracks().forEach(track => track.stop());
}

function wait(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function gather(pc: RTCPeerConnection, signal: AbortSignal) {
  for (let i = 0; i < 100 && !signal.aborted; i++) {
    if (pc.iceGatheringState === "complete" && pc.localDescription?.sdp) return pc.localDescription.sdp;
    await wait(100);
  }
  throw new Error("Could not prepare the media connection. Start a new call and try again.");
}

export default function PrivateCallPage() {
  const { id } = useParams<{ id: string }>();
  const [mode, setMode] = useState<"loading" | "invite" | "create">("loading");
  const [call, setCall] = useState<Call | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [guest, setGuest] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"ready" | "connecting" | "connected" | "ended">("ready");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const session = useRef<Session | null>(null);
  const mounted = useRef(false);
  const local = useRef<HTMLVideoElement>(null);
  const remote = useRef<HTMLVideoElement>(null);
  const endpoint = `/api/rooms/${encodeURIComponent(id)}/call`;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; close(session.current); session.current = null; };
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    void (async () => {
      try {
        const invite = new URLSearchParams(location.search).get("call");
        const response = invite
          ? await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "read", call: invite }), signal: abort.signal })
          : await fetch(`/api/rooms/${encodeURIComponent(id)}?tab=people`, { signal: abort.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load this call.");
        setMode(invite ? "invite" : "create");
        if (invite) { setCall(data); if (data.ended) setPhase("ended"); }
        else setPeople(data.profiles ?? []);
      } catch (e) {
        if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Could not load this call.");
      }
    })();
    return () => abort.abort();
  }, [endpoint, id]);

  async function exchange(action: string, fields: object, signal?: AbortSignal): Promise<Call> {
    const res = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...fields }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    });
    const value = await res.json();
    if (!res.ok) throw new Error(value.error || "Could not reach the call.");
    return value;
  }

  async function create() {
    setBusy(true); setError("");
    try {
      const next = await exchange("create", { guest });
      setCall(next);
      history.replaceState(null, "", `${location.pathname}?call=${next.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create the call."); }
    finally { setBusy(false); }
  }

  async function join() {
    if (!call || session.current || busy) return;
    setError(""); setBusy(true);
    let active: Session | null = null;
    try {
      const current = await exchange("read", { call: call.id });
      if (current.ended) { setPhase("ended"); return; }
      if ((current.host && current.offer) || (!current.host && current.answer)) {
        throw new Error("This seat has already joined. End this call and start a new one.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!mounted.current) { stream.getTracks().forEach(track => track.stop()); return; }
      let pc: RTCPeerConnection;
      try { pc = new RTCPeerConnection({ iceServers: current.iceServers }); }
      catch (e) { stream.getTracks().forEach(track => track.stop()); throw e; }
      active = { pc, stream, stop: new AbortController() };
      session.current = active;
      const signal = active.stop.signal;
      if (local.current) local.current.srcObject = stream;
      setPhase("connecting");
      pc.ontrack = event => { if (remote.current && event.streams[0]) remote.current.srcObject = event.streams[0]; };
      pc.onconnectionstatechange = () => {
        if (!signal.aborted && pc.connectionState === "connected") setPhase("connected");
        if (!signal.aborted && pc.connectionState === "failed") {
          setError("Media could not connect on this network. End the call and try another network.");
          close(active); session.current = null; setPhase("ended");
        }
      };
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      if (current.host) {
        await pc.setLocalDescription(await pc.createOffer());
        await exchange("offer", { call: call.id, sdp: await gather(pc, signal) }, signal);
      }
      for (let attempt = 0; !signal.aborted; attempt++) {
        const state = await exchange("read", { call: call.id }, signal);
        if (state.ended) { close(active); session.current = null; setPhase("ended"); break; }
        if (!pc.remoteDescription && (current.host ? state.answer : state.offer)) {
          await pc.setRemoteDescription(current.host ? { type: "answer", sdp: state.answer! } : { type: "offer", sdp: state.offer! });
          if (!current.host) {
            await pc.setLocalDescription(await pc.createAnswer());
            await exchange("answer", { call: call.id, sdp: await gather(pc, signal) }, signal);
          }
        }
        if (attempt >= 60 && !pc.remoteDescription) throw new Error("No teammate joined. End the call and send a fresh link.");
        await wait(pc.connectionState === "connected" ? 3000 : 1000);
      }
    } catch (e) {
      if (!active?.stop.signal.aborted && mounted.current) {
        setError(e instanceof Error ? e.message : "Could not join the call.");
        setPhase(active ? "ended" : "ready");
      }
      close(active);
      if (session.current === active) session.current = null;
    } finally { if (mounted.current) setBusy(false); }
  }

  async function end() {
    if (!call) return;
    close(session.current); session.current = null; setPhase("ended");
    try { await exchange("end", { call: call.id }); }
    catch { setError("Your camera and microphone are off. The server could not confirm the call ended; retry End call."); }
  }

  function toggle(kind: "audio" | "video") {
    const tracks = session.current?.stream.getTracks().filter(track => track.kind === kind);
    if (!tracks?.length) return;
    const enabled = !tracks[0].enabled;
    tracks.forEach(track => { track.enabled = enabled; });
    if (kind === "audio") setMuted(!enabled); else setCameraOff(!enabled);
  }

  async function share() {
    const active = session.current;
    if (!active || sharing) return;
    let screen: MediaStream | undefined;
    try {
      screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      if (session.current !== active || active.stop.signal.aborted || active.screen) {
        screen.getTracks().forEach(track => track.stop()); return;
      }
      const track = screen.getVideoTracks()[0];
      const sender = active.pc.getSenders().find(item => item.track?.kind === "video");
      if (!sender || !track) throw new Error("Screen sharing is unavailable.");
      await sender.replaceTrack(track);
      if (session.current !== active) { screen.getTracks().forEach(item => item.stop()); return; }
      active.screen = screen;
      if (local.current) local.current.srcObject = screen;
      setSharing(true);
      track.onended = () => {
        screen?.getTracks().forEach(item => item.stop());
        if (session.current !== active) return;
        active.screen = undefined;
        if (local.current) local.current.srcObject = active.stream;
        setSharing(false);
        void sender.replaceTrack(active.stream.getVideoTracks()[0] ?? null)
          .catch(() => setError("Could not restore your camera. End the call and rejoin."));
      };
    } catch (e) {
      screen?.getTracks().forEach(track => track.stop());
      setError(e instanceof Error ? e.message : "Could not share your screen.");
    }
  }

  const button = "rounded-xl border border-zinc-600 px-4 py-2 text-sm disabled:opacity-50";
  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-5 bg-zinc-950 p-5 text-white sm:p-8">
      <Link href={`/rooms/${id}`} className="text-sm text-zinc-300 underline">Back to room</Link>
      <h1 className="text-2xl font-semibold">Private project call</h1>
      {mode === "loading" && !error && <p role="status">Loading room access…</p>}
      {error && <p role="alert" className="rounded-xl bg-red-950 p-3">{error}</p>}
      {!call && mode === "create" && people.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">Invite a room teammate
            <select value={guest} onChange={e => setGuest(e.target.value)} className="rounded-lg bg-zinc-800 p-2">
              <option value="">Choose teammate</option>
              {people.map(person => <option key={person.id} value={person.id}>{person.name || person.id}</option>)}
            </select>
          </label>
          <button className={button} disabled={!guest || busy} onClick={() => void create()}>Create call</button>
        </div>
      )}
      {!call && mode === "create" && !people.length && !error && <p className="text-sm text-zinc-300">Choose a room with teammates to start a call.</p>}
      {call?.host && phase !== "ended" && (
        <label className="grid gap-1 text-sm">Private invitation link
          <input readOnly value={typeof window === "undefined" ? "" : `${location.origin}${location.pathname}?call=${call.id}`}
            onFocus={e => e.currentTarget.select()} className="rounded-lg bg-zinc-800 p-2" />
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="overflow-hidden rounded-xl bg-zinc-900"><video ref={local} muted autoPlay playsInline className="aspect-video w-full object-contain" /><p className="p-2 text-sm">{sharing ? "Your shared screen" : "You"}</p></div>
        <div className="overflow-hidden rounded-xl bg-zinc-900"><video ref={remote} autoPlay playsInline controls className="aspect-video w-full object-contain" /><p className="p-2 text-sm">Teammate</p></div>
      </div>
      <p role="status" className="text-sm text-zinc-300">
        {phase === "connected" ? "Connected" : phase === "connecting" ? "Connecting to your teammate…" : phase === "ended" ? "Call ended on this device" : "Your camera and microphone are off."}
      </p>
      {call && <div className="flex flex-wrap gap-2">
        {phase === "ready" && <button className={button} disabled={busy} onClick={() => void join()}>Join with camera and mic</button>}
        {(phase === "connected" || phase === "connecting") && <>
          <button className={button} onClick={() => toggle("audio")}>{muted ? "Unmute" : "Mute"}</button>
          <button className={button} onClick={() => toggle("video")}>{cameraOff ? "Turn camera on" : "Turn camera off"}</button>
        </>}
        {phase === "connected" && typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
          <button className={button} onClick={() => {
            const track = session.current?.screen?.getVideoTracks()[0];
            if (track) { track.stop(); track.dispatchEvent(new Event("ended")); } else void share();
          }}>{sharing ? "Stop sharing" : "Share screen"}</button>}
        <button className={button} onClick={() => void end()}>End call</button>
      </div>}
    </main>
  );
}
