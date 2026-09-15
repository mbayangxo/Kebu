"use client";

import { useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

/**
 * Offline detection banner — shows when connection drops, disappears when back.
 * Africa has frequent connectivity gaps — never let the user think it's a bug.
 */
export function KebuOfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [showingBack, setShowingBack] = useState(false);

  useEffect(() => {
    function handleOffline() {
      setOffline(true);
      setShowingBack(false);
    }
    function handleOnline() {
      setShowingBack(true);
      // Show "back online" briefly then hide
      setTimeout(() => {
        setOffline(false);
        setShowingBack(false);
      }, 2400);
    }

    // Check initial state (in case already offline when component mounts)
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline) return null;

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
        background: showingBack ? "#16a34a" : KEBU.black,
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
          background: showingBack ? "#86efac" : "#ef4444",
          flexShrink: 0,
          display: "inline-block",
        }}
      />
      {showingBack
        ? "Back online"
        : "No connection — check your network. Changes may not save."}
    </div>
  );
}
