"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  activePeerIds,
  parseSignalMessage,
  shouldInitiateOffer,
  type PeerConnectionState,
  type SignalMessage,
} from "@/lib/rooms/call-mesh";

type PresenceMeta = { userId: string };

type PeerEntry = {
  pc: RTCPeerConnection;
  stream: MediaStream | null;
  screenStream: MediaStream | null;
  screenActive: boolean;
  screenSender: RTCRtpSender | null;
  state: PeerConnectionState;
  pendingCandidates: RTCIceCandidateInit[];
};

export type PeerView = { id: string; stream: MediaStream | null; screenStream: MediaStream | null; state: PeerConnectionState };

type Phase = "idle" | "joining" | "in-call" | "ended";

type SupabaseChannel = ReturnType<ReturnType<typeof createClient>["channel"]>;

async function waitForDevices(audioOnly = false): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ video: !audioOnly, audio: true });
}

/**
 * Drives one full-mesh group call: owns the Supabase Realtime signaling
 * channel, local media, and one RTCPeerConnection per other participant.
 * Pure coordination logic lives in lib/rooms/call-mesh.ts; this hook is the
 * DOM/WebRTC-facing half, verified via real-browser tests rather than unit
 * tests (RTCPeerConnection has no meaningful jsdom polyfill).
 */
export function useMeshCall(roomId: string) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [callId, setCallId] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [peers, setPeers] = useState<PeerView[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [sharing, setSharing] = useState(false);

  const peerMap = useRef<Map<string, PeerEntry>>(new Map());
  const channelRef = useRef<SupabaseChannel | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const leaveRef = useRef<() => Promise<void>>(async () => {});

  const renderPeers = useCallback(() => {
    setPeers([...peerMap.current.entries()].map(([id, e]) => ({ id, stream: e.stream, screenStream: e.screenActive ? e.screenStream : null, state: e.state })));
  }, []);

  const broadcast = useCallback((message: SignalMessage) => {
    void channelRef.current?.send({ type: "broadcast", event: "signal", payload: message });
  }, []);

  const closePeer = useCallback((peerId: string) => {
    const entry = peerMap.current.get(peerId);
    if (!entry) return;
    entry.pc.close();
    peerMap.current.delete(peerId);
    renderPeers();
  }, [renderPeers]);

  const currentVideoTrack = useCallback(() => {
    return localStreamRef.current?.getVideoTracks()[0] ?? null;
  }, []);

  const ensurePeer = useCallback((peerId: string, self: string): PeerEntry => {
    const existing = peerMap.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    const entry: PeerEntry = { pc, stream: null, screenStream: null, screenActive: false, screenSender: null, state: "connecting", pendingCandidates: [] };
    peerMap.current.set(peerId, entry);

    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) pc.addTrack(audioTrack, localStreamRef.current!);
    const videoTrack = currentVideoTrack();
    if (videoTrack) pc.addTrack(videoTrack, localStreamRef.current!);
    // Only the offerer creates extra m-lines. The answerer binds its screen
    // sender to the incoming screen m-line after setRemoteDescription.
    if (shouldInitiateOffer(self, peerId)) {
      if (!videoTrack) pc.addTransceiver("video", { direction: "sendrecv", streams: localStreamRef.current ? [localStreamRef.current] : [] });
      const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
      entry.screenSender = pc.addTransceiver(screenTrack ?? "video", { direction: "sendrecv", streams: [screenStreamRef.current ?? new MediaStream()] }).sender;
    }

    pc.ontrack = (event) => {
      const entryNow = peerMap.current.get(peerId);
      if (!entryNow) return;
      if (event.transceiver.mid === "2") {
        entryNow.screenStream = event.streams[0] ?? new MediaStream([event.track]);
      } else entryNow.stream = event.streams[0] ?? entryNow.stream;
      renderPeers();
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) broadcast({ type: "candidate", from: self, to: peerId, candidate: event.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      const entryNow = peerMap.current.get(peerId);
      if (!entryNow) return;
      const state = pc.connectionState;
      entryNow.state = state === "connected" ? "connected" : state === "failed" || state === "closed" ? "failed" : "connecting";
      renderPeers();
    };

    renderPeers();
    return entry;
  }, [broadcast, currentVideoTrack, renderPeers]);

  const initiateTo = useCallback(async (peerId: string, self: string) => {
    const entry = ensurePeer(peerId, self);
    const offer = await entry.pc.createOffer();
    await entry.pc.setLocalDescription(offer);
    broadcast({ type: "offer", from: self, to: peerId, sdp: offer.sdp!, screenSharing: Boolean(screenStreamRef.current) });
  }, [broadcast, ensurePeer]);

  const handleSignal = useCallback(async (raw: unknown, self: string) => {
    const msg = parseSignalMessage(raw);
    if (!msg || msg.to !== self) return;
    if (msg.type === "screen") {
      const entry = peerMap.current.get(msg.from);
      if (entry) { entry.screenActive = msg.enabled; renderPeers(); }
      return;
    }
    if (msg.type === "offer") {
      const entry = ensurePeer(msg.from, self);
      entry.screenActive = msg.screenSharing ?? false;
      await entry.pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
      const screenTransceiver = entry.pc.getTransceivers().find(t => t.mid === "2");
      if (screenTransceiver) {
        screenTransceiver.direction = "sendrecv";
        entry.screenSender = screenTransceiver.sender;
        entry.screenSender.setStreams(screenStreamRef.current ?? new MediaStream());
        await entry.screenSender.replaceTrack(screenStreamRef.current?.getVideoTracks()[0] ?? null);
      }
      for (const c of entry.pendingCandidates) await entry.pc.addIceCandidate(c).catch(() => {});
      entry.pendingCandidates = [];
      const answer = await entry.pc.createAnswer();
      await entry.pc.setLocalDescription(answer);
      broadcast({ type: "answer", from: self, to: msg.from, sdp: answer.sdp!, screenSharing: Boolean(screenStreamRef.current) });
    } else if (msg.type === "answer") {
      const entry = peerMap.current.get(msg.from);
      if (!entry || entry.pc.remoteDescription) return;
      entry.screenActive = msg.screenSharing ?? false;
      await entry.pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
      for (const c of entry.pendingCandidates) await entry.pc.addIceCandidate(c).catch(() => {});
      entry.pendingCandidates = [];
    } else if (msg.type === "candidate") {
      const entry = peerMap.current.get(msg.from);
      if (!entry) return;
      if (entry.pc.remoteDescription) await entry.pc.addIceCandidate(msg.candidate).catch(() => {});
      else entry.pendingCandidates.push(msg.candidate);
    }
  }, [broadcast, ensurePeer, renderPeers]);

  const join = useCallback(async (maxParticipants?: number, audioOnly = false) => {
    if (phase === "joining" || phase === "in-call") return;
    setError("");
    setPhase("joining");
    try {
      // Get media permission before telling the server we've joined — a
      // denied/missing camera must not leave an orphaned "joined" participant
      // row behind (capacity and history are no-leave-call-needed clean).
      const stream = await waitForDevices(audioOnly);
      setCameraOff(audioOnly);
      setMuted(false);
      if (!mounted.current) { stream.getTracks().forEach((t) => t.stop()); return; }

      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/call`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        // Only takes effect if this join actually starts a new call; joining
        // one already in progress keeps whatever cap it started with.
        body: JSON.stringify({ action: "join", ...(maxParticipants ? { maxParticipants } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) { stream.getTracks().forEach((t) => t.stop()); throw new Error(data.error || "Could not join the call."); }
      const self: string = data.userId;
      iceServersRef.current = data.iceServers ?? [];

      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallId(data.id);
      setSelfId(self);

      const supabase = createClient();
      const channel = supabase.channel(`room-call:${data.id}`, { config: { private: true, presence: { key: self } } });
      channelRef.current = channel;
      channel
        .on("broadcast", { event: "signal" }, ({ payload }: { payload: unknown }) => void handleSignal(payload, self))
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState() as Record<string, PresenceMeta[]>;
          const live = new Set(activePeerIds(state, self));
          for (const existingId of [...peerMap.current.keys()]) if (!live.has(existingId)) closePeer(existingId);
          for (const peerId of live) if (shouldInitiateOffer(self, peerId) && !peerMap.current.has(peerId)) void initiateTo(peerId, self);
        })
        .subscribe(async (status: string) => {
          if (status === "SUBSCRIBED") await channel.track({ userId: self });
          else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status) && channelRef.current === channel) {
            setError("Could not connect to the secure call channel. Please rejoin.");
            void leaveRef.current();
          }
        });

      setPhase("in-call");
    } catch (e) {
      if (mounted.current) { setError(e instanceof Error ? e.message : "Could not join the call."); setPhase("idle"); }
    }
  }, [roomId, phase, closePeer, handleSignal, initiateTo]);

  const leave = useCallback(async () => {
    // Nothing was ever joined (also guards React Strict Mode's dev-only
    // synthetic mount -> cleanup -> remount, which reuses this same hook
    // instance's state rather than resetting it, so an unguarded leave()
    // here would permanently flip phase to "ended" before any real join).
    if (!channelRef.current && !localStreamRef.current) return;
    const id = callId;
    for (const peerId of [...peerMap.current.keys()]) closePeer(peerId);
    if (channelRef.current) { const channel = channelRef.current; channelRef.current = null; const supabase = createClient(); void supabase.removeChannel(channel); }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null; screenStreamRef.current = null;
    setScreenStream(null); setLocalStream(null); setPeers([]); setPhase("ended"); setSharing(false);
    if (id) {
      try {
        await fetch(`/api/rooms/${encodeURIComponent(roomId)}/call`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "leave", call: id }),
        });
      } catch { /* best-effort; the call still ends locally */ }
    }
  }, [callId, closePeer, roomId]);

  useEffect(() => { leaveRef.current = leave; }, [leave]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; void leaveRef.current(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime signaling isn't re-authorized per exchange the way the old
  // RPC-polling design was, so a membership revoked mid-call wouldn't
  // otherwise be noticed until someone leaves. This heartbeat re-runs the
  // same authorization check the join did and leaves if it now fails.
  useEffect(() => {
    if (phase !== "in-call" || !callId) return;
    const interval = setInterval(() => {
      void fetch(`/api/rooms/${encodeURIComponent(roomId)}/call`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join" }),
      }).then((res) => { if (!res.ok && mounted.current) void leave(); });
    }, 30_000);
    return () => clearInterval(interval);
  }, [phase, callId, roomId, leave]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOff(!track.enabled);
  }, []);

  const stopSharing = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    for (const [peerId, entry] of peerMap.current) {
      try { await entry.screenSender?.replaceTrack(null); }
      catch { if (entry.pc.signalingState !== "closed") setError("A screen connection could not be cleared. Leave and rejoin if needed."); }
      if (selfId) broadcast({ type: "screen", from: selfId, to: peerId, enabled: false });
    }
    setSharing(false);
  }, [broadcast, selfId]);

  const toggleShare = useCallback(async () => {
    if (sharing) { await stopSharing(); return; }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = screen.getVideoTracks()[0];
      if (!track) return;
      screenStreamRef.current = screen;
      setScreenStream(screen);
      for (const [peerId, entry] of peerMap.current) {
        await entry.screenSender?.replaceTrack(track);
        if (selfId) broadcast({ type: "screen", from: selfId, to: peerId, enabled: true });
      }
      setSharing(true);
      track.onended = () => void stopSharing();
    } catch (e) {
      await stopSharing();
      setError(e instanceof Error ? e.message : "Could not share your screen.");
    }
  }, [sharing, stopSharing, broadcast, selfId]);

  return { screenStream, phase, error, callId, selfId, peers, localStream, muted, cameraOff, sharing, join, leave, toggleMute, toggleCamera, toggleShare };
}
