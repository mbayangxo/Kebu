"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createClient } from "@/lib/supabase/client";
import { liveCursorColorForUser } from "@/lib/studio/live-cursors";

export type LiveCursorPeer = {
  userId: string;
  label: string;
  color: string;
  x: number;
  y: number;
  updatedAt: number;
};

type PresenceMeta = {
  userId: string;
  label: string;
  color: string;
  x: number;
  y: number;
  updatedAt: number;
};

/**
 * S9b — live collaborator cursors via Supabase Realtime Presence.
 * Coordinates are normalized 0–1 relative to the artboard container.
 */
export function StudioLiveCursors({
  designId,
  userId,
  label,
  enabled,
  containerRef,
}: {
  designId: string;
  userId: string | null;
  label: string;
  enabled: boolean;
  containerRef: RefObject<HTMLElement | null>;
}) {
  const [peers, setPeers] = useState<LiveCursorPeer[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const myColor = useMemo(() => (userId ? liveCursorColorForUser(userId) : "#E05A2B"), [userId]);

  const syncPeers = useCallback(
    (state: Record<string, PresenceMeta[]>) => {
      if (!userId) return;
      const next: LiveCursorPeer[] = [];
      for (const key of Object.keys(state)) {
        for (const m of state[key] ?? []) {
          if (!m?.userId || m.userId === userId) continue;
          next.push({
            userId: m.userId,
            label: m.label || "Collaborator",
            color: m.color || liveCursorColorForUser(m.userId),
            x: typeof m.x === "number" ? m.x : 0.5,
            y: typeof m.y === "number" ? m.y : 0.5,
            updatedAt: typeof m.updatedAt === "number" ? m.updatedAt : Date.now(),
          });
        }
      }
      setPeers(next);
    },
    [userId],
  );

  useEffect(() => {
    if (!enabled || !userId || !designId) return;

    const supabase = createClient();
    const channel = supabase.channel(`studio-design-cursors:${designId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        syncPeers(channel.presenceState() as Record<string, PresenceMeta[]>);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId,
            label: label || "You",
            color: myColor,
            x: 0.5,
            y: 0.5,
            updatedAt: Date.now(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
      setPeers([]);
    };
  }, [designId, userId, label, enabled, myColor, syncPeers]);

  useEffect(() => {
    if (!enabled || !userId) return;
    const el = containerRef.current;
    if (!el) return;

    let lastSent = 0;
    const onMove = (e: PointerEvent) => {
      const channel = channelRef.current;
      if (!channel) return;
      const now = Date.now();
      if (now - lastSent < 40) return;
      lastSent = now;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      void channel.track({
        userId,
        label: label || "You",
        color: myColor,
        x,
        y,
        updatedAt: now,
      });
    };

    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [enabled, userId, label, myColor, containerRef]);

  if (!enabled || peers.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
      {peers.map((p) => (
        <div
          key={p.userId}
          className="absolute transition-transform duration-75 ease-out"
          style={{
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            transform: "translate(-2px, -2px)",
          }}
        >
          <svg width="16" height="20" viewBox="0 0 16 20" fill={p.color}>
            <path d="M1 1 L1 17 L5.5 13.5 L9 19 L11 18 L7.5 12.5 L14 12 Z" />
          </svg>
          <span
            className="ml-3 -mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap"
            style={{ background: p.color }}
          >
            {p.label}
          </span>
        </div>
      ))}
    </div>
  );
}
