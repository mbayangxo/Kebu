"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OpportunityOsShell } from "@/app/components/opportunity/opportunity-os-shell";
import { OpportunityCard } from "@/app/components/opportunity-card";
import { KEBU } from "@/lib/kebu-brand";
import type { FundingType, Opportunity, Sector } from "@/lib/types";

const TYPES: FundingType[] = [
  "Grant",
  "Loan",
  "Accelerator",
  "Fellowship",
  "Investment",
  "Tender",
  "Government contract",
  "Training",
  "Procurement",
];

export default function OpportunityListingsPage() {
  const [listings, setListings] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<string>("");
  const [country, setCountry] = useState("");
  const [q, setQ] = useState("");
  const [diasporaOnly, setDiasporaOnly] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (type) p.set("type", type);
    if (country.trim()) p.set("country", country.trim());
    if (q.trim()) p.set("q", q.trim());
    if (diasporaOnly) p.set("diaspora", "true");
    return p.toString();
  }, [type, country, q, diasporaOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/opportunity/listings${query ? `?${query}` : ""}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load listings.");
      setListings([]);
      setLoading(false);
      return;
    }
    setListings(Array.isArray(data.listings) ? data.listings : []);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <OpportunityOsShell
      title="Programs & listings"
      headline="Grants, loans, tenders, and programs"
      subhead="Real listings stored in Opportunity OS — always verify at the official source before you apply."
    >
      <div className="mb-8 flex flex-wrap gap-3 items-end">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: KEBU.muted }}>
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 block rounded-lg border border-border px-3 py-2 text-sm bg-white min-w-[140px]"
          >
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: KEBU.muted }}>
          Country
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Senegal, Ghana…"
            className="mt-1 block rounded-lg border border-border px-3 py-2 text-sm bg-white min-w-[160px]"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider flex-1 min-w-[200px]" style={{ color: KEBU.muted }}>
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title or keyword"
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm bg-white"
          />
        </label>
        <label className="flex items-center gap-2 text-sm pb-2" style={{ color: KEBU.muted }}>
          <input
            type="checkbox"
            checked={diasporaOnly}
            onChange={(e) => setDiasporaOnly(e.target.checked)}
          />
          Diaspora eligible
        </label>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Loading listings…
        </p>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
          <p className="font-semibold mb-2">{error}</p>
          <p className="text-xs opacity-80">
            Apply migration <code className="font-mono">001_alkebulan_schema.sql</code> and seed curated listings:{" "}
            <code className="font-mono">POST /api/opportunity/listings/seed</code> with admin password.
          </p>
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <p className="font-semibold mb-2">No listings yet</p>
          <p className="text-sm mb-4" style={{ color: KEBU.muted }}>
            Seed curated programs to Supabase, or adjust filters.
          </p>
          <Link href="/opportunity/countries" className="text-sm font-bold" style={{ color: KEBU.orange }}>
            Explore countries →
          </Link>
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-5">
          {listings.map((opp) => (
            <li key={opp.id}>
              <OpportunityCard opportunity={opp} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-xs text-center" style={{ color: KEBU.muted }}>
        <Link href="/opportunity" className="font-semibold underline">
          ← Back to For you
        </Link>
        {" · "}
        <Link href="/opportunity/countries" className="font-semibold underline">
          Country Explorer
        </Link>
      </p>
    </OpportunityOsShell>
  );
}
