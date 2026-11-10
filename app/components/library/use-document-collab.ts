"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";
import { createClient } from "@/lib/supabase/client";
import { createYjsSupabaseProvider, type CollabConnectionStatus } from "@/lib/realtime-collab/yjs-supabase-provider";
import { liveCursorColorForUser } from "@/lib/studio/live-cursors";
import type { RichDocument } from "@/lib/work/rich-text";

// Must match DocumentEditor's SCHEMA_EXTENSIONS (StarterKit with history off
// + Link) exactly — this schema is only used to hydrate the initial Yjs
// XmlFragment from persisted JSON, not to render anything, but a mismatched
// schema would silently drop or misinterpret nodes/marks on hydration.
const SCHEMA_EXTENSIONS = [StarterKit.configure({ history: false }), Link];
export const COLLAB_YJS_FIELD = "default";

// How long a freshly-connected client waits to see whether an existing
// collaborator's catch-up broadcast fills in this document's content
// before concluding it's the first/only live session and seeding the
// (still-empty) Yjs doc from the persisted copy itself. See the hydration
// race note below for why this exists and its real, bounded limitation.
const HYDRATION_GRACE_PERIOD_MS = 400;

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
export function useDocumentCollab(itemId: string | null, initialContent: RichDocument): DocumentCollabState {
  const [status, setStatus] = useState<DocumentCollabState["status"]>("disabled");
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const [peerCount, setPeerCount] = useState(0);
  const [label, setLabel] = useState("Collaborator");
  const [color, setColor] = useState("#E05A2B");
  const initialContentRef = useRef(initialContent);
  useEffect(() => {
    initialContentRef.current = initialContent;
  }, [initialContent]);

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
    // Captured once, right now — not re-read later. Once this session's own
    // collab editor mounts (bound to the still-empty Y.Doc, before
    // hydration below has run), its own first onUpdate writes an empty
    // document back into this same item's draft, which flows back into
    // initialContentRef via the effect above. Reading the ref again later
    // (e.g. from inside the hydration timer) would pick up that corrupted
    // feedback instead of the real persisted content; a local const can't
    // be clobbered by it.
    const seedContent = initialContentRef.current;

    const supabase = createClient();
    let providerHandle: ReturnType<typeof createYjsSupabaseProvider> | null = null;
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;
    let hydrationTimer: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      try {
        const authRes = await fetch(`/api/work/items/${encodeURIComponent(itemId)}/collab`, { credentials: "include" });
        const authData = await authRes.json().catch(() => ({}));
        if (cancelled) return;
        if (!authRes.ok || typeof authData.userId !== "string") {
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

        // Start empty, not pre-hydrated: two clients independently seeding
        // the SAME persisted content into two independently-constructed
        // Y.Docs (each with its own random internal ids) would duplicate
        // that content on merge, since Yjs has no way to know two separate
        // insert histories describe "the same" text. Only the client that
        // turns out to be first/alone should seed from persisted content —
        // see the grace-period hydration below.
        const nextDoc = new Y.Doc();
        const nextAwareness = new Awareness(nextDoc);
        nextAwareness.setLocalStateField("user", { name: selfLabel, color: selfColor });

        providerHandle = createYjsSupabaseProvider({
          supabase,
          doc: nextDoc,
          awareness: nextAwareness,
          selfId: self,
          channelName: `doc-collab:${itemId}`,
          onStatusChange: (next) => {
            if (!cancelled) setStatus(next);
          },
        });

        // If nothing has filled the doc in by the grace period, this client
        // is (as far as it can tell) first/alone — seed it from the
        // persisted copy so there's something to show and to catch later
        // joiners up with. A genuinely simultaneous first-join by two
        // clients, within this window, before either's presence/catch-up
        // reaches the other, would still duplicate content — a real,
        // bounded limitation of having no dedicated Yjs server in this
        // sandbox to own hydration instead (see the report for this task).
        hydrationTimer = setTimeout(() => {
          if (cancelled || nextDoc.getXmlFragment(COLLAB_YJS_FIELD).length > 0) return;
          const schema = getSchema(SCHEMA_EXTENSIONS);
          nextDoc.transact(() => {
            prosemirrorJSONToYXmlFragment(schema, seedContent, nextDoc.getXmlFragment(COLLAB_YJS_FIELD));
          });
        }, HYDRATION_GRACE_PERIOD_MS);

        // A separate, lightweight presence channel purely for a human-
        // readable "N collaborators online" count — kept apart from the
        // Yjs/awareness wire protocol so a peer-count UI bug can never
        // corrupt document sync.
        presenceChannel = supabase.channel(`doc-presence:${itemId}`, { config: { presence: { key: self } } });
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
      clearTimeout(hydrationTimer);
      providerHandle?.destroy();
      if (presenceChannel) void supabase.removeChannel(presenceChannel);
    };
    // initialContent is read via initialContentRef (kept fresh by the effect
    // above) only at the moment this effect starts; itemId is the only real
    // dependency — including initialContent here would retrigger this
    // effect on every keystroke, tearing down and recreating the whole
    // collaboration session.
  }, [itemId]);

  useEffect(() => () => doc?.destroy(), [doc]);

  return { status, doc, awareness, peerCount, label, color };
}
