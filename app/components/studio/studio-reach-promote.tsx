"use client";

import { useState } from "react";
import Link from "next/link";

/** Studio → Reach handoff: create a tracked promote link for this design. */
export function StudioReachPromote({
  designId,
  designTitle,
  projects,
}: {
  designId: string;
  designTitle: string;
  projects: { id: string; title: string }[];
}) {
  const [destinationUrl, setDestinationUrl] = useState("");
  const [projectId, setProjectId] = useState("");
  const [budgetNote, setBudgetNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPath, setCreatedPath] = useState<string | null>(null);

  async function promote(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreatedPath(null);
    try {
      let dest = destinationUrl.trim();
      if (!dest && projectId) {
        dest = `/shop/${projectId}`;
      }
      if (!dest) {
        setError("Add a destination URL or pick a shop.");
        return;
      }
      const res = await fetch("/api/reach/campaigns", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: designTitle.slice(0, 120) || "Studio promote",
          destinationUrl: dest,
          designId,
          projectId: projectId || null,
          budgetNote: budgetNote.trim() || null,
          creativeNote: "Created from Kebu Studio",
          activate: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create Reach link.");
        return;
      }
      setCreatedPath(data.campaign?.promotePath ?? null);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!createdPath || typeof window === "undefined") return;
    const absolute = `${window.location.origin}${createdPath}`;
    try {
      await navigator.clipboard.writeText(absolute);
    } catch {
      setError("Copy failed — open Reach and copy from there.");
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-[#FFF8F0] px-4 py-3 space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Promote with Reach</p>
        <p className="text-xs opacity-60 mt-1 leading-relaxed">
          Creates a tracked <code className="font-mono">/r/…</code> link. Share it anywhere — Kebu counts
          real opens and clicks. Paid ads / creator marketplace not live yet.
        </p>
      </div>

      <form onSubmit={(e) => void promote(e)} className="space-y-2">
        {projects.length ? (
          <label className="block text-xs font-semibold">
            Shop destination (optional)
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm bg-white"
            >
              <option value="">None — use URL below</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block text-xs font-semibold">
          Destination URL
          <input
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://… or /shop/…"
            className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm bg-white"
          />
        </label>
        <label className="block text-xs font-semibold">
          Budget note (optional — not charged)
          <input
            value={budgetNote}
            onChange={(e) => setBudgetNote(e.target.value)}
            placeholder="e.g. 2,000 XOF WhatsApp boost this week"
            className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm bg-white"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: "#0F0D33" }}
        >
          {busy ? "Creating…" : "Create tracked link"}
        </button>
      </form>

      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {createdPath ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs space-y-2">
          <p className="font-semibold text-emerald-900">Link ready</p>
          <p className="font-mono break-all">{createdPath}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="underline font-semibold" onClick={() => void copy()}>
              Copy
            </button>
            <Link href="/reach" className="underline font-semibold">
              Open Reach
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
