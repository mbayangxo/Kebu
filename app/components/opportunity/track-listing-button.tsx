"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { KEBU } from "@/lib/kebu-brand";

export function TrackListingButton({
  opportunityId,
  initialSaved = false,
}: {
  opportunityId: string;
  initialSaved?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      if (saved) {
        const res = await fetch(
          `/api/opportunity/saved?opportunityId=${encodeURIComponent(opportunityId)}`,
          { method: "DELETE", credentials: "include" },
        );
        if (res.status === 401) {
          router.push(`/login?next=/opportunity/${opportunityId}`);
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(typeof data.error === "string" ? data.error : "Could not remove.");
          return;
        }
        setSaved(false);
        return;
      }

      const res = await fetch("/api/opportunity/saved", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, status: "saved" }),
      });
      if (res.status === 401) {
        router.push(`/login?next=/opportunity/${opportunityId}`);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Could not save.");
        return;
      }
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }, [opportunityId, router, saved]);

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        className="rounded-xl py-4 text-sm font-bold text-center transition-colors disabled:opacity-60"
        style={
          saved
            ? { background: "#E8F5E9", color: "#2E7D32", border: "1.5px solid #4CAF50" }
            : { background: KEBU.cream, color: KEBU.black, border: `1.5px solid ${KEBU.border}` }
        }
      >
        {busy ? "Saving…" : saved ? "✓ Saved — click to untrack" : "Track this listing"}
      </button>
      {error && (
        <p className="text-xs text-center" style={{ color: KEBU.red }}>
          {error}
        </p>
      )}
    </div>
  );
}
