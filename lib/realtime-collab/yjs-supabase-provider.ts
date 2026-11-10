"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import { decodeMessageData, encodeAwarenessMessage, encodeUpdateMessage, parseCollabMessage } from "./codec";

export type CollabConnectionStatus = "connecting" | "connected" | "disconnected";

export type YjsSupabaseProvider = {
  readonly status: CollabConnectionStatus;
  destroy: () => void;
};

type RealtimeChannel = ReturnType<SupabaseClient["channel"]>;

/**
 * A from-scratch Yjs sync provider over Supabase Realtime broadcast +
 * presence — there is no dedicated y-websocket server deployed (and this
 * sandbox can't deploy one), so this reuses the exact transport already
 * proven for Calls' WebRTC signaling (app/components/rooms/use-mesh-call.ts)
 * and Studio's live cursors (app/components/studio/studio-live-cursors.tsx):
 * one Realtime channel, broadcast events for payload exchange, presence for
 * membership. Update/awareness bytes are base64-encoded (see ./codec) since
 * Realtime broadcast payloads are JSON.
 *
 * Catch-up strategy: on every presence "sync" (including a peer's own first
 * sync, i.e. just after joining), every already-connected client re-sends
 * its current full Yjs state and current awareness state. This is more
 * bytes than a proper diff/request-response handshake would use, but Yjs
 * updates and awareness merges are both idempotent and commutative, so it's
 * simple and correct: a late joiner is guaranteed to receive a full catch-up
 * from someone, and an already-synced peer merging a redundant full state is
 * a no-op.
 */
export function createYjsSupabaseProvider(opts: {
  supabase: SupabaseClient;
  channelName: string;
  doc: Y.Doc;
  awareness: Awareness;
  selfId: string;
  onStatusChange?: (status: CollabConnectionStatus) => void;
}): YjsSupabaseProvider {
  const { supabase, channelName, doc, awareness, selfId, onStatusChange } = opts;
  let destroyed = false;
  let status: CollabConnectionStatus = "connecting";
  const setStatus = (next: CollabConnectionStatus) => {
    if (status === next) return;
    status = next;
    onStatusChange?.(next);
  };

  const channel: RealtimeChannel = supabase.channel(channelName, { config: { presence: { key: selfId } } });

  const broadcastUpdate = (update: Uint8Array) => {
    void channel.send({ type: "broadcast", event: "collab", payload: encodeUpdateMessage(selfId, update) });
  };
  const broadcastAwareness = (changedClients: number[]) => {
    if (!changedClients.length) return;
    void channel.send({
      type: "broadcast",
      event: "collab",
      payload: encodeAwarenessMessage(selfId, encodeAwarenessUpdate(awareness, changedClients)),
    });
  };

  const onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (destroyed || origin === "remote") return;
    broadcastUpdate(update);
  };
  const onAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (destroyed || origin === "remote") return;
    broadcastAwareness([...added, ...updated, ...removed]);
  };

  doc.on("update", onDocUpdate);
  awareness.on("update", onAwarenessUpdate);

  channel
    .on("broadcast", { event: "collab" }, ({ payload }: { payload: unknown }) => {
      const message = parseCollabMessage(payload);
      if (!message || message.from === selfId) return;
      const bytes = decodeMessageData(message);
      if (message.type === "update") Y.applyUpdate(doc, bytes, "remote");
      else applyAwarenessUpdate(awareness, bytes, "remote");
    })
    .on("presence", { event: "sync" }, () => {
      // A newly-visible peer (self included, on first sync) needs the
      // current full state and awareness — see the catch-up note above.
      if (destroyed) return;
      broadcastUpdate(Y.encodeStateAsUpdate(doc));
      if (awareness.getLocalState()) broadcastAwareness([doc.clientID]);
    })
    .subscribe((subscribeStatus: string) => {
      if (destroyed) return;
      if (subscribeStatus === "SUBSCRIBED") {
        setStatus("connected");
        void channel.track({ userId: selfId });
      } else if (subscribeStatus === "CHANNEL_ERROR" || subscribeStatus === "TIMED_OUT" || subscribeStatus === "CLOSED") {
        setStatus("disconnected");
      }
    });

  return {
    get status() {
      return status;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      doc.off("update", onDocUpdate);
      awareness.off("update", onAwarenessUpdate);
      removeAwarenessStates(awareness, [doc.clientID], "local-destroy");
      void supabase.removeChannel(channel);
    },
  };
}
