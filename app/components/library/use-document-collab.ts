"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { createClient } from "@/lib/supabase/client";
import { createYjsSupabaseProvider, type CollabConnectionStatus } from "@/lib/realtime-collab/yjs-supabase-provider";
import { liveCursorColorForUser } from "@/lib/studio/live-cursors";

export const COLLAB_YJS_FIELD = "default";

export type DocumentCollabState = {
  status: CollabConnectionStatus | "disabled";
  doc: Y.Doc | null;
  awareness: Awareness | null;
  peerCount: number;
  label: string;
  color: string;
};

/**
 * Authorizes, creates, and wires a Yjs document + Supabase Realtime
 * transport for one workspace item (kind="doc"). `doc`/`awareness` are null
 * whenever status isn't "connected" — callers must fall back to today's
 * plain-content editing path (DocumentEditor's non-collab mode) rather than
 * block on this, since collaboration is additive, not a replacement for the
 * existing autosave/offline/conflict-detection flow.
 */
export function useDocumentCollab(itemId: string | null): DocumentCollabState {
  const [status, setStatus] = useState<DocumentCollabState["status"]>("disabled");
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const [peerCount, setPeerCount] = useState(0);
  const [label, setLabel] = useState("Collaborator");
  const [color, setColor] = useState("#E05A2B");


  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting collab state for the new itemId before the (re)connect sequence below starts is the point of this effect.
    setDoc(null);
    setAwareness(null);
    setPeerCount(0);
    if (!itemId) {
      setStatus("disabled");
      return;
    }
    let cancelled = false;
    setStatus("connecting");
    const supabase = createClient();
    let providerHandle: ReturnType<typeof createYjsSupabaseProvider> | null = null;
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      try {
        const authRes = await fetch(`/api/work/items/${encodeURIComponent(itemId)}/collab`, { method: "POST", credentials: "include" });
        const authData = await authRes.json().catch(() => ({}));
        if (cancelled) return;
        if (!authRes.ok || (typeof authData.userId !== "string" || typeof authData.state !== "string" || typeof authData.epoch !== "string")) {
          setStatus("disabled");
          return;
        }
        // The server (same route) hands back the already-authenticated
        // user's id/label — this must not instead be fetched client-side
        // via supabase.auth.getUser(), which calls a *different* origin
        // than this app's own and is blocked by this app's CSP connect-src
        // for anything other than https: (fine for a real Supabase project,
        // not for an http: local fixture; see the route's own comment).
        const self: string = authData.userId;
        const selfLabel: string = typeof authData.label === "string" && authData.label ? authData.label : "Collaborator";
        const selfColor = liveCursorColorForUser(self);
        setLabel(selfLabel);
        setColor(selfColor);

        // All peers start from the same persisted Yjs history, including simultaneous first joins.
        const nextDoc = new Y.Doc();
        Y.applyUpdate(nextDoc, Uint8Array.from(atob(authData.state), c => c.charCodeAt(0)));
        const nextAwareness = new Awareness(nextDoc);
        nextAwareness.setLocalStateField("user", { name: selfLabel, color: selfColor });

        providerHandle = createYjsSupabaseProvider({
          supabase,
          doc: nextDoc,
          awareness: nextAwareness,
          selfId: self,
          channelName: `doc-collab:${itemId}:${authData.epoch}`,
          onStatusChange: (next) => {
            if (!cancelled) setStatus(next);
          },
        });

        // A separate, lightweight presence channel purely for a human-
        // readable "N collaborators online" count — kept apart from the
        // Yjs/awareness wire protocol so a peer-count UI bug can never
        // corrupt document sync.
        presenceChannel = supabase.channel(`doc-presence:${itemId}:${authData.epoch}`, { config: { private: true, presence: { key: self } } });
        presenceChannel
          .on("presence", { event: "sync" }, () => {
            if (cancelled || !presenceChannel) return;
            const state = presenceChannel.presenceState() as Record<string, unknown[]>;
            const others = Object.keys(state).filter((key) => key !== self && (state[key]?.length ?? 0) > 0);
            setPeerCount(others.length);
          })
          .subscribe((subscribeStatus: string) => {
            if (subscribeStatus === "SUBSCRIBED" && presenceChannel) void presenceChannel.track({ userId: self });
          });

        if (!cancelled) {
          setDoc(nextDoc);
          setAwareness(nextAwareness);
        } else {
          nextDoc.destroy();
        }
      } catch {
        if (!cancelled) setStatus("disabled");
      }
    })();

    return () => {
      cancelled = true;
      providerHandle?.destroy();
      if (presenceChannel) void supabase.removeChannel(presenceChannel);
    };
  }, [itemId]);

  useEffect(() => () => doc?.destroy(), [doc]);

  return { status, doc, awareness, peerCount, label, color };
}
