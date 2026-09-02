"use client";

import Link from "next/link";
import { useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import type { MeAfriqueIdSummary } from "@/lib/account/user-profile";

type Props = {
  afriqueId: MeAfriqueIdSummary;
  displayName: string;
  onRefresh: () => void;
};

export function AfriqueIdCard({ afriqueId, displayName, onRefresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verified = afriqueId.eligibilityStatus === "verified";
  const canRequest = afriqueId.eligibilityStatus === "unverified" || afriqueId.eligibilityStatus === "rejected";

  async function requestVerification() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/me/afrique-id", { method: "POST", credentials: "include" });
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not submit request.");
      return;
    }
    setMessage(data.message ?? "Submitted for review.");
    onRefresh();
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(afriqueId.publicId);
      setMessage("Copied Afrique ID.");
    } catch {
      setError("Could not copy — select and copy manually.");
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-5 mb-6" style={{ borderColor: KEBU.border }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: KEBU.orange }}>
            Afrique ID · You on Kebu
          </p>
          <p className="text-sm" style={{ color: KEBU.muted }}>
            Your personal identity — separate from your business Kebu ID. People can recognize you by this ID.
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
          style={{
            background: verified ? "rgba(34,139,34,0.12)" : "rgba(0,0,0,0.05)",
            color: verified ? "#1B6B1B" : KEBU.muted,
          }}
        >
          {afriqueId.eligibilityLabel}
        </span>
      </div>

      <div
        className="rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3"
        style={{ background: "rgba(255,106,0,0.06)", border: `1px solid ${KEBU.border}` }}
      >
        <div>
          <p className="text-xs font-semibold mb-0.5">{displayName}</p>
          <p className="font-mono text-sm font-bold" style={{ color: KEBU.orange }}>
            {afriqueId.publicId}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copyId()}
          className="text-[11px] font-bold underline"
          style={{ color: KEBU.black }}
        >
          Copy ID
        </button>
      </div>

      {verified ? (
        <Link
          href={afriqueId.publicProfilePath}
          className="inline-flex text-xs font-bold underline"
          style={{ color: KEBU.orange }}
        >
          View your public identity card →
        </Link>
      ) : canRequest ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void requestVerification()}
          className="rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
          style={{ background: KEBU.orange }}
        >
          {busy ? "Submitting…" : "Request verification"}
        </button>
      ) : (
        <p className="text-xs" style={{ color: KEBU.muted }}>
          Verification status: {afriqueId.eligibilityLabel}. You cannot set verified yourself — Kebu reviews requests.
        </p>
      )}

      {message ? <p className="text-xs text-green-700 mt-3">{message}</p> : null}
      {error ? <p className="text-xs text-red-600 mt-3">{error}</p> : null}
    </section>
  );
}
