"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import type { Opportunity } from "@/lib/types";

type FilterState = {
  type: string;
  sector: string;
  country: string;
  diaspora: boolean;
  q: string;
};

const TYPE_LABELS: Record<string, string> = {
  grant: "Grant",
  loan: "Loan",
  equity: "Equity",
  prize: "Prize",
  accelerator: "Accelerator",
  incubator: "Incubator",
  fellowship: "Fellowship",
  scholarship: "Scholarship",
  training: "Training",
  other: "Other",
};

const SECTOR_OPTIONS = [
  "Agriculture", "Technology", "Health", "Education", "Finance",
  "Energy", "Manufacturing", "Media", "Tourism", "Real Estate",
];

function formatAmount(opp: Opportunity): string {
  if (!opp.amount) return "";
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: opp.currency ?? "USD", maximumFractionDigits: 0 });
  const lo = fmt.format(opp.amount);
  if (opp.amount_max && opp.amount_max !== opp.amount) return `${lo} – ${fmt.format(opp.amount_max)}`;
  return lo;
}

function deadlineColor(deadline: string | undefined): string {
  if (!deadline) return KEBU.muted;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0) return KEBU.faint;
  if (days <= 14) return KEBU.red;
  if (days <= 30) return "#D97706";
  return KEBU.muted;
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const amount = formatAmount(opp);
  const typeLabel = TYPE_LABELS[opp.type] ?? opp.type;
  const dColor = deadlineColor(opp.deadline);
  const deadlineDays = opp.deadline
    ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <article
      className="rounded-[18px] border bg-white p-4 flex flex-col gap-3 transition hover:-translate-y-0.5"
      style={{ borderColor: KEBU.borders.default, boxShadow: KEBU.shadow.card }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide"
              style={{ background: "rgba(255,85,0,0.08)", color: KEBU.orange }}
            >
              {typeLabel}
            </span>
            <span className="text-[9px]" style={{ color: KEBU.faint }}>{opp.country}</span>
          </div>
          <h3 className="text-[13px] font-bold leading-snug" style={{ color: KEBU.black }}>
            {opp.title}
          </h3>
        </div>
        {opp.diaspora_allowed && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wide"
            style={{ background: "rgba(255,85,0,0.06)", color: KEBU.orange }}
          >
            Diaspora
          </span>
        )}
      </div>

      <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: KEBU.muted }}>
        {opp.summary}
      </p>

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-3 flex-wrap">
          {amount && (
            <span className="text-[11px] font-bold" style={{ color: KEBU.black }}>{amount}</span>
          )}
          {opp.deadline && (
            <span className="text-[10px] font-semibold" style={{ color: dColor }}>
              {deadlineDays !== null && deadlineDays < 0
                ? "Closed"
                : deadlineDays !== null && deadlineDays <= 30
                ? `${deadlineDays}d left`
                : new Date(opp.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>
        <a
          href={opp.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full px-3 py-1.5 text-[10px] font-bold text-white shrink-0"
          style={{ background: KEBU.orange }}
        >
          Apply →
        </a>
      </div>

      {opp.source_name && (
        <p className="text-[9px]" style={{ color: KEBU.faint }}>via {opp.source_name}</p>
      )}
    </article>
  );
}

function EntitlementGate() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-[22px]"
        style={{ background: KEBU.surface.invert }}
      >
        <KebuIcon name="opportunity" size={34} style={{ color: KEBU.orange }} />
      </div>
      <h2
        className="text-3xl font-black tracking-tight"
        style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
      >
        Verified African Opportunity Access
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: KEBU.muted }}>
        Opportunity OS is a curated database of verified grants, loans, fellowships,
        and programs for African entrepreneurs and diaspora founders.
        Access requires identity verification.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          href="/account"
          className="rounded-full px-6 py-3 text-sm font-bold text-white"
          style={{ background: KEBU.orange }}
        >
          Verify identity to unlock
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border px-6 py-3 text-sm font-bold"
          style={{ borderColor: KEBU.borders.default, color: KEBU.black }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default function OpportunityPage() {
  const [listings, setListings] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsEntitlement, setNeedsEntitlement] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    type: "", sector: "", country: "", diaspora: false, q: "",
  });

  const load = useCallback(async (f: FilterState) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (f.type) params.set("type", f.type);
    if (f.sector) params.set("sector", f.sector);
    if (f.country) params.set("country", f.country);
    if (f.diaspora) params.set("diaspora", "true");
    if (f.q) params.set("q", f.q);
    const res = await fetch(`/api/opportunity/listings?${params}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      setError("Please log in to view opportunities.");
    } else if (res.status === 403 && data.needsEntitlement) {
      setNeedsEntitlement(true);
    } else if (!res.ok) {
      setError(data.error ?? "Could not load opportunities.");
    } else {
      setListings(data.listings ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(filters); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilter(patch: Partial<FilterState>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    void load(next);
  }

  if (!loading && needsEntitlement) {
    return (
      <AppShell title="Opportunity OS">
        <EntitlementGate />
      </AppShell>
    );
  }

  const byType = filters.type
    ? listings
    : listings;

  return (
    <AppShell title="Opportunity OS">
      <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-7">

        <header className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>
            Opportunity OS
          </p>
          <h1
            className="mt-1 text-3xl font-black tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
          >
            Find your funding.
          </h1>
          <p className="mt-1 text-sm" style={{ color: KEBU.muted }}>
            Verified grants, loans, fellowships and accelerators for African and diaspora founders.
          </p>
        </header>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="Search opportunities…"
            value={filters.q}
            onChange={(e) => applyFilter({ q: e.target.value })}
            className="h-9 rounded-xl border bg-white px-3 text-[12px] font-semibold outline-none focus:ring-2 focus:ring-[#FF5500] w-full sm:w-60"
            style={{ borderColor: KEBU.borders.default, color: KEBU.black }}
          />
          <select
            value={filters.type}
            onChange={(e) => applyFilter({ type: e.target.value })}
            className="h-9 rounded-xl border bg-white px-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-[#FF5500] appearance-none pr-7"
            style={{ borderColor: KEBU.borders.default, color: filters.type ? KEBU.black : KEBU.muted }}
          >
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select
            value={filters.sector}
            onChange={(e) => applyFilter({ sector: e.target.value })}
            className="h-9 rounded-xl border bg-white px-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-[#FF5500] appearance-none pr-7"
            style={{ borderColor: KEBU.borders.default, color: filters.sector ? KEBU.black : KEBU.muted }}
          >
            <option value="">All sectors</option>
            {SECTOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 text-[11px] font-bold select-none"
            style={{ borderColor: filters.diaspora ? KEBU.borders.orangeStrong : KEBU.borders.default, color: filters.diaspora ? KEBU.orange : KEBU.muted }}>
            <input
              type="checkbox"
              checked={filters.diaspora}
              onChange={(e) => applyFilter({ diaspora: e.target.checked })}
              className="accent-[#FF5500]"
            />
            Diaspora-eligible
          </label>
          {(filters.type || filters.sector || filters.country || filters.diaspora || filters.q) && (
            <button
              type="button"
              onClick={() => applyFilter({ type: "", sector: "", country: "", diaspora: false, q: "" })}
              className="h-9 rounded-xl border px-3 text-[11px] font-bold transition"
              style={{ borderColor: KEBU.borders.default, color: KEBU.muted }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-[18px] border bg-white p-4 animate-pulse h-44"
                style={{ borderColor: KEBU.borders.default }} />
            ))}
          </div>
        ) : error ? (
          <div
            className="rounded-[18px] border p-8 text-center"
            style={{ borderColor: KEBU.borders.default, background: KEBU.errorBg }}
          >
            <p className="text-sm font-semibold" style={{ color: KEBU.errorText }}>{error}</p>
          </div>
        ) : byType.length === 0 ? (
          <div className="py-20 text-center">
            <KebuIcon name="search" size={36} className="mx-auto mb-4" style={{ color: KEBU.faint }} />
            <p className="text-sm font-semibold" style={{ color: KEBU.muted }}>No opportunities match your filters.</p>
            <button
              type="button"
              onClick={() => applyFilter({ type: "", sector: "", country: "", diaspora: false, q: "" })}
              className="mt-4 text-sm font-bold"
              style={{ color: KEBU.orange }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-[10px] font-semibold" style={{ color: KEBU.faint }}>
              {byType.length} opportunit{byType.length === 1 ? "y" : "ies"} — verify deadlines and eligibility at the official source before applying.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {byType.map((opp) => <OpportunityCard key={opp.id} opp={opp} />)}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
