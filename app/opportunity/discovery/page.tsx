"use client";

import { useCallback, useEffect, useState } from "react";
import { OpportunityOsShell } from "@/app/components/opportunity/opportunity-os-shell";
import { TrustLabelBadge } from "@/app/components/opportunity/trust-label-badge";
import { Skeleton } from "@/app/components/kebu-skeleton";
import { KEBU } from "@/lib/kebu-brand";
import type { DiscoveryHypothesisDetail } from "@/lib/opportunity/explore-engines-schema";

export default function DiscoveryPage() {
  const [hypotheses, setHypotheses] = useState<DiscoveryHypothesisDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trustNote, setTrustNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/opportunity/discovery");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load hypotheses.");
        setHypotheses([]);
        return;
      }
      setHypotheses(Array.isArray(data.hypotheses) ? data.hypotheses : []);
      setTrustNote(data.trust?.note ?? null);
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
      title="Discovery"
      eyebrow="Opportunity OS · Discovery"
      headline="Hypotheses reasoned from real signals — never invented."
      subhead="Each hypothesis names the exact curated signals it's built on and is marked exploratory, not proven."
    >
      <div className="space-y-6">
        {trustNote ? (
          <p className="text-[11px] uppercase tracking-wide" style={{ color: KEBU.muted }}>
            {trustNote}
          </p>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} height={160} radius={16} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border p-6 text-sm" style={{ borderColor: KEBU.border, color: KEBU.muted }}>
            {error}
          </div>
        ) : hypotheses.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center" style={{ borderColor: KEBU.border }}>
            <p className="font-semibold">No discovery hypotheses published yet.</p>
            <p className="mt-2 text-sm" style={{ color: KEBU.muted }}>
              Hypotheses here are reasoned only from Kebu's own curated signals — more publish as more countries are curated.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {hypotheses.map((h) => (
              <article key={h.slug} className="rounded-2xl border bg-white p-6" style={{ borderColor: KEBU.border }}>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
                    style={{ background: `${KEBU.orange}18`, color: KEBU.orange }}
                  >
                    {h.countryCode}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                    {h.confidence === "exploratory" ? "Exploratory" : h.confidence === "high" ? "High confidence" : "Medium confidence"}
                  </span>
                  <TrustLabelBadge trustLabel={h.trustLabel} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {h.title}
                </h3>
                <p className="text-sm leading-relaxed mb-3">{h.hypothesis}</p>
                <p className="text-sm leading-relaxed mb-3" style={{ color: KEBU.muted }}>
                  <span className="font-bold">Reasoning: </span>
                  {h.reasoning}
                </p>
                {h.signalBasis.length > 0 ? (
                  <p className="text-[10px]" style={{ color: KEBU.faint }}>
                    Signals used: {h.signalBasis.join(" · ")}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </OpportunityOsShell>
  );
}
