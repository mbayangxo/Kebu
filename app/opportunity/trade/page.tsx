"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OpportunityOsShell } from "@/app/components/opportunity/opportunity-os-shell";
import { KEBU } from "@/lib/kebu-brand";

type TradeGap = {
  slug: string;
  origin_country_code: string;
  destination_country_code: string;
  product_category: string;
  confidence: string;
  trust_label: string;
};

export default function TradePage() {
  const [gaps, setGaps] = useState<TradeGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/opportunity/trade");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load trade analyses.");
        setGaps([]);
        return;
      }
      setGaps(Array.isArray(data.gaps) ? data.gaps : []);
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <OpportunityOsShell
      title="African Trade"
      eyebrow="Opportunity OS · Trade"
      headline="What one African country could sell to another."
      subhead="Real queries like 'products Senegal could sell to Nigeria' — once two countries have real curated data to compare."
    >
      <div className="space-y-6">
        {loading ? (
          <div className="h-40 rounded-2xl animate-pulse" style={{ background: KEBU.cream }} />
        ) : error ? (
          <div className="rounded-2xl border p-6 text-sm" style={{ borderColor: KEBU.border, color: KEBU.muted }}>
            {error}
          </div>
        ) : gaps.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center" style={{ borderColor: KEBU.border }}>
            <p className="font-semibold">Trade-gap analysis isn't published yet — honestly.</p>
            <p className="mt-2 text-sm" style={{ color: KEBU.muted }}>
              A real "Country A could sell X to Country B" claim needs genuinely curated supply/demand data for
              <strong> both</strong> countries. Today only Senegal has a real{" "}
              <Link href="/opportunity/countries" className="underline" style={{ color: KEBU.orange }}>
                curated country profile
              </Link>{" "}
              — nothing has been invented to fill this page. This appears the moment a second country is genuinely curated.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {gaps.map((g) => (
              <article key={g.slug} className="rounded-2xl border bg-white p-6" style={{ borderColor: KEBU.border }}>
                <p className="text-sm font-bold">
                  {g.origin_country_code} → {g.destination_country_code}: {g.product_category}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: KEBU.muted }}>
                  {g.confidence === "exploratory" ? "Exploratory" : g.confidence}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </OpportunityOsShell>
  );
}
