/**
 * Pure signaling logic for a full-mesh group call: every participant holds
 * one RTCPeerConnection per other participant. Kept free of DOM/RTCPeerConnection
 * types so it's unit-testable; app/components/rooms/call-room.tsx wires it to
 * real peer connections and a Supabase Realtime broadcast channel.
 */

// Kept in sync with max_participants' check constraint in
// supabase/migrations/20261108020000_room_calls_mesh.sql — a full mesh's
// connection count grows as n*(n-1)/2, which is why this stays small; a
// larger room needs a media server (SFU), out of scope for this slice.
export const MAX_MESH_PARTICIPANTS = 8;

// Full mesh has no shared/relay path: each participant uploads one video
// stream per *other* participant, so going from 4 to 8 doesn't add capacity
// gracefully, it roughly doubles every phone's simultaneous upload load.
// Kebu's users are mobile-first on mid/low-end Android over African mobile
// networks where uplink is usually the scarce resource, so a call defaults
// small; whoever starts it can still opt into a larger one from
// MESH_PARTICIPANT_OPTIONS. Kept in sync with room_calls.max_participants'
// column default in supabase/migrations/20261109020000_room_call_default_cap.sql.
export const DEFAULT_MESH_PARTICIPANTS = 4;

export const MESH_PARTICIPANT_OPTIONS: { value: number; label: string }[] = [
  { value: 4, label: "Small call (up to 4) — recommended" },
  { value: 6, label: "Medium call (up to 6) — needs a steady connection" },
  { value: MAX_MESH_PARTICIPANTS, label: "Large call (up to 8) — may struggle on slower connections" },
];

export type SignalMessage =
  | { type: "offer"; from: string; to: string; sdp: string }
  | { type: "answer"; from: string; to: string; sdp: string }
  | { type: "candidate"; from: string; to: string; candidate: RTCIceCandidateInitLike };

export type RTCIceCandidateInitLike = {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
};

/**
 * Deterministic, order-independent tie-break for who offers to whom: the
 * lexicographically smaller id always initiates. Both sides compute this the
 * same way, so exactly one side offers per pair — no glare, no clock/join-order
 * dependency.
 */
export function shouldInitiateOffer(selfId: string, peerId: string): boolean {
  return selfId < peerId;
}

/** Validates an incoming broadcast payload before touching any peer connection. */
export function parseSignalMessage(raw: unknown): SignalMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.from !== "string" || !r.from || typeof r.to !== "string" || !r.to) return null;
  if (r.type === "offer" || r.type === "answer") {
    if (typeof r.sdp !== "string" || !r.sdp) return null;
    return { type: r.type, from: r.from, to: r.to, sdp: r.sdp };
  }
  if (r.type === "candidate") {
    if (!r.candidate || typeof r.candidate !== "object") return null;
    const c = r.candidate as Record<string, unknown>;
    if (c.candidate !== undefined && typeof c.candidate !== "string") return null;
    return {
      type: "candidate",
      from: r.from,
      to: r.to,
      candidate: {
        candidate: typeof c.candidate === "string" ? c.candidate : undefined,
        sdpMid: typeof c.sdpMid === "string" ? c.sdpMid : null,
        sdpMLineIndex: typeof c.sdpMLineIndex === "number" ? c.sdpMLineIndex : null,
        usernameFragment: typeof c.usernameFragment === "string" ? c.usernameFragment : null,
      },
    };
  }
  return null;
}

/** Presence state (as returned by `channel.presenceState()`) -> live peer ids, self excluded. */
export function activePeerIds(state: Record<string, Array<{ userId?: unknown }>>, selfId: string): string[] {
  const ids = new Set<string>();
  for (const entries of Object.values(state)) {
    for (const entry of entries) {
      if (typeof entry.userId === "string" && entry.userId && entry.userId !== selfId) ids.add(entry.userId);
    }
  }
  return [...ids];
}

/** A video grid's column count for a given live tile count (self + remotes). */
export function gridColumns(tileCount: number): number {
  if (tileCount <= 1) return 1;
  if (tileCount <= 4) return 2;
  if (tileCount <= 6) return 3;
  return 4;
}

export type PeerConnectionState = "connecting" | "connected" | "failed" | "closed";
