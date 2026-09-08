"use client";

import { useEffect, useState } from "react";
import { reachStatusLabel, type ReachCampaignStatus } from "@/lib/reach/campaigns";

type Campaign = {
  id: string;
  title: string;
  status: ReachCampaignStatus;
  public_slug: string;
  destination_url: string;
  promotePath: string;
  budget_note: string | null;
  board_enabled?: boolean;
  bid_cpc_cauris?: number;
  budget_cap_cauris?: number;
  spent_cauris?: number;
  creative_headline?: string | null;
  stats: {
    opens: number;
    clicks: number;
    shares: number;
    impressions?: number;
    boardClicks?: number;
  };
  updated_at: string;
};

/** Owner Reach home — links + paid board controls (S10b). */
export function ReachCampaignsPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [bid, setBid] = useState(1);
  const [cap, setCap] = useState(20);
  const [headline, setHeadline] = useState("");

  async function load() {
    const res = await fetch("/api/reach/campaigns", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load Reach.");
      return;
    }
    setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/reach/campaigns/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Update failed.");
        return;
      }
      setEditId(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function copyLink(path: string) {
    const absolute =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(path);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy — select the link manually.");
    }
  }

  if (error && !campaigns.length) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (!campaigns.length) {
    return (
      <div className="rounded-3xl border border-dashed border-black/15 bg-white p-10 text-center">
        <p className="text-lg font-semibold">No Reach campaigns yet</p>
        <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
          From Studio, open Share → <strong>Promote with Reach</strong> to create a tracked link. Then
          fund your wallet, set a CPC bid, and enable the Reach Board for paid placement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      <ul className="space-y-3">
        {campaigns.map((c) => (
          <li key={c.id} className="rounded-2xl border border-black/10 bg-white p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
              <div className="min-w-0">
                <p className="font-semibold truncate">{c.title}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700 mt-1">
                  {reachStatusLabel(c.status)}
                  {c.board_enabled ? " · Board on" : ""}
                </p>
                <p className="text-xs opacity-60 mt-1 truncate">{c.destination_url}</p>
                <p className="text-[11px] mt-2 font-semibold">
                  Link opens {c.stats.opens} · Link clicks {c.stats.clicks}
                  {" · "}
                  Board views {c.stats.impressions ?? 0} · Board clicks {c.stats.boardClicks ?? 0}
                </p>
                <p className="text-[11px] opacity-60 mt-1">
                  Bid {Number(c.bid_cpc_cauris ?? 0)} Cauris CPC · Spent{" "}
                  {Number(c.spent_cauris ?? 0)} / {Number(c.budget_cap_cauris ?? 0)} cap
                </p>
                <p className="text-[10px] opacity-50 mt-1">
                  Views = real ≥50% visible impressions only — never estimated.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-xs font-bold border border-black/10"
                  onClick={() => void copyLink(c.promotePath)}
                >
                  {copied === c.promotePath ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-xs font-bold border border-black/10"
                  onClick={() => {
                    setEditId(editId === c.id ? null : c.id);
                    setBid(Number(c.bid_cpc_cauris) || 1);
                    setCap(Number(c.budget_cap_cauris) || 20);
                    setHeadline(c.creative_headline ?? c.title);
                  }}
                >
                  Bid / board
                </button>
                {c.status === "active" ? (
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    className="rounded-full px-3 py-1.5 text-xs font-bold border border-black/10 disabled:opacity-50"
                    onClick={() => void patch(c.id, { status: "paused" })}
                  >
                    Pause
                  </button>
                ) : c.status === "paused" || c.status === "draft" ? (
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    className="rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: "#0F0D33" }}
                    onClick={() => void patch(c.id, { status: "active" })}
                  >
                    Activate
                  </button>
                ) : null}
              </div>
            </div>

            {editId === c.id ? (
              <div className="border-t border-black/5 pt-3 flex flex-wrap gap-3 items-end">
                <label className="text-xs font-semibold">
                  Headline
                  <input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="mt-1 block w-48 rounded-lg border border-black/10 px-2 py-1.5"
                    maxLength={120}
                  />
                </label>
                <label className="text-xs font-semibold">
                  CPC bid (Cauris)
                  <input
                    type="number"
                    min={0.1}
                    max={100}
                    step={0.1}
                    value={bid}
                    onChange={(e) => setBid(Number(e.target.value) || 0.1)}
                    className="mt-1 block w-28 rounded-lg border border-black/10 px-2 py-1.5"
                  />
                </label>
                <label className="text-xs font-semibold">
                  Budget cap
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    step={1}
                    value={cap}
                    onChange={(e) => setCap(Number(e.target.value) || 0)}
                    className="mt-1 block w-28 rounded-lg border border-black/10 px-2 py-1.5"
                  />
                </label>
                <button
                  type="button"
                  disabled={busyId === c.id}
                  className="rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: "#E05A2B" }}
                  onClick={() =>
                    void patch(c.id, {
                      boardEnabled: true,
                      bidCpcCauris: bid,
                      budgetCapCauris: cap,
                      creativeHeadline: headline,
                      status: "active",
                    })
                  }
                >
                  Enable on board
                </button>
                {c.board_enabled ? (
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    className="rounded-full px-3 py-1.5 text-xs font-bold border border-black/10 disabled:opacity-50"
                    onClick={() => void patch(c.id, { boardEnabled: false })}
                  >
                    Disable board
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
