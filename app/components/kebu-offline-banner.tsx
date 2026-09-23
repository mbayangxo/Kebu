"use client";

import { useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { flushOfflineQueue, listOfflineQueue } from "@/lib/create/offline-queue";

/**
 * Offline detection banner — shows when connection drops, disappears when back.
 * Africa has frequent connectivity gaps — never let the user think it's a bug.
 */
export function KebuOfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [showingBack, setShowingBack] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);

  useEffect(() => {
    function handleOffline() {
      setOffline(true);
      setShowingBack(false);
    }
    async function syncQueuedWork() {
      if (listOfflineQueue().length === 0) return;
      setSyncing(true);
      setSyncFailed(false);
      try {
        const result = await flushOfflineQueue();
        setSyncFailed(result.failed > 0 || result.remaining > 0);
      } finally {
        setSyncing(false);
        try {
          window.dispatchEvent(new Event("kebu-offline-queue-flushed"));
        } catch {
          /* ignore */
        }
      }
    }

    function handleOnline() {
      setShowingBack(true);
      void syncQueuedWork();
    }

    // Check initial state (in case already offline when component mounts)
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true);
    } else if (typeof navigator !== "undefined") {
      // Recover durable work left by a previous offline/crashed session.
      void syncQueuedWork();
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline && !showingBack) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: showingBack && !syncFailed ? "#16a34a" : KEBU.black,
        color: "#fff",
        fontSize: "0.8rem",
        fontWeight: 600,
        textAlign: "center",
        padding: "7px 16px",
        letterSpacing: "0.02em",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "background 0.3s ease",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: showingBack && !syncFailed ? "#86efac" : "#ef4444",
          flexShrink: 0,
          display: "inline-block",
        }}
      />
      {showingBack
        ? syncing
          ? "Back online — syncing queued changes…"
          : syncFailed
            ? "Back online — some changes still need syncing. Kebu will retry."
            : "Back online — queued changes synced."
        : "No connection — your supported changes are kept locally until reconnect."}
    </div>
  );
}
