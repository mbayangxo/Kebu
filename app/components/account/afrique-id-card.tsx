"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import type { MeAfriqueIdSummary } from "@/lib/account/user-profile";
import { AfriqueIdVerificationForm } from "./afrique-id-verification-form";
import type { HeritageNotes } from "@/app/api/me/afrique-id/route";

type Props = {
  afriqueId: MeAfriqueIdSummary;
  displayName: string;
  onRefresh: () => void;
};

export function AfriqueIdCard({ afriqueId, displayName, onRefresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [identityType, setIdentityType] = useState<"indigenous" | "visitor">(
    afriqueId.identityType ?? "visitor",
  );
  const [showVerificationForm, setShowVerificationForm] = useState(false);

  useEffect(() => {
    setIdentityType(afriqueId.identityType ?? "visitor");
  }, [afriqueId.identityType]);

  const verified = afriqueId.eligibilityStatus === "verified";
  const canRequest =
    afriqueId.eligibilityStatus === "unverified" ||
    afriqueId.eligibilityStatus === "rejected" ||
    afriqueId.eligibilityStatus === "expired";

  async function saveIdentityType(next: "indigenous" | "visitor") {
    setIdentityType(next);
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/me/afrique-id", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identityType: next }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save ID type.");
      setIdentityType(afriqueId.identityType ?? "visitor");
      return;
    }
    setMessage(data.message ?? "Saved.");
    onRefresh();
  }

  async function requestVerification(heritageNotes: HeritageNotes) {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/me/afrique-id", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heritageNotes }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not submit request.");
      return;
    }
    setShowVerificationForm(false);
    setMessage(data.message ?? "Submitted for review.");
    onRefresh();
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(afriqueId.publicId);
      setMessage("Copied African ID (AID).");
    } catch {
      setError("Could not copy — select and copy manually.");
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-5 mb-6" style={{ borderColor: KEBU.border }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: KEBU.orange }}>
            African ID (AID) · You on Kebu
          </p>
          <p className="text-sm" style={{ color: KEBU.muted }}>
            Your personal identity — separate from your business Kebu ID. Choose whether you are an Indigenous
            African person or a Visitor.
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

      <fieldset className="mb-4 space-y-2" disabled={busy}>
        <legend className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: KEBU.faint }}>
          ID type
        </legend>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="aid-type"
            checked={identityType === "indigenous"}
            onChange={() => void saveIdentityType("indigenous")}
            className="mt-0.5"
          />
          <span>
            <strong>Indigenous African</strong>
            <span className="block text-xs" style={{ color: KEBU.muted }}>
              You identify as an Indigenous African person on Kebu.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="aid-type"
            checked={identityType === "visitor"}
            onChange={() => void saveIdentityType("visitor")}
            className="mt-0.5"
          />
          <span>
            <strong>Visitor</strong>
            <span className="block text-xs" style={{ color: KEBU.muted }}>
              You are visiting or using Kebu from outside that identity — still welcome to build and explore.
            </span>
          </span>
        </label>
      </fieldset>

      <div
        className="rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3"
        style={{ background: "rgba(255,106,0,0.06)", border: `1px solid ${KEBU.border}` }}
      >
        <div>
          <p className="text-xs font-semibold mb-0.5">{displayName}</p>
          <p className="font-mono text-sm font-bold" style={{ color: KEBU.orange }}>
            {afriqueId.publicId}
          </p>
          {afriqueId.identityTypeLabel ? (
            <p className="text-[10px] mt-1 uppercase tracking-wider" style={{ color: KEBU.muted }}>
              {afriqueId.identityTypeLabel}
            </p>
          ) : null}
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
        showVerificationForm ? (
          <div
            className="rounded-2xl p-4 mt-2"
            style={{ background: "rgba(255,85,0,0.04)", border: `1px solid rgba(255,85,0,0.15)` }}
          >
            <p
              className="text-xs font-bold uppercase tracking-wider mb-4"
              style={{ color: KEBU.orange }}
            >
              African Identity Verification
            </p>
            <AfriqueIdVerificationForm
              identityType={identityType}
              onSubmit={(notes) => requestVerification(notes)}
              onCancel={() => setShowVerificationForm(false)}
              busy={busy}
            />
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowVerificationForm(true)}
            className="rounded-full px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
            style={{ background: KEBU.orange }}
          >
            Request verification
          </button>
        )
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
