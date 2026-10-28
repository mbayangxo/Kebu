"use client";

import { useCallback, useEffect, useState } from "react";
import { OpportunityOsShell } from "@/app/components/opportunity/opportunity-os-shell";
import { TrustLabelBadge } from "@/app/components/opportunity/trust-label-badge";
import { Skeleton } from "@/app/components/kebu-skeleton";
import { KEBU } from "@/lib/kebu-brand";
import type { ImportReplacementDetail } from "@/lib/opportunity/explore-engines-schema";

function verdictLabel(verdict: string): string {
  if (verdict === "promising") return "Promising";
  if (verdict === "unlikely") return "Unlikely";
  return "Mixed";
}

export default function ImportReplacementPage() {
  const [analyses, setAnalyses] = useState<ImportReplacementDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trustNote, setTrustNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/opportunity/import-replacement");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load analyses.");
        setAnalyses([]);
        return;
      }
      setAnalyses(Array.isArray(data.analyses) ? data.analyses : []);
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
      title="Import Replacement"
      eyebrow="Opportunity OS · Import replacement"
      headline="Could this be produced here instead of imported?"
      subhead="Each analysis names why or why not — this is not a claim that every import should be replaced."
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
        ) : analyses.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center" style={{ borderColor: KEBU.border }}>
            <p className="font-semibold">No import-replacement analyses published yet.</p>
            <p className="mt-2 text-sm" style={{ color: KEBU.muted }}>
              Real analyses here are grounded in Kebu's own curated country data — not invented. More will publish as more countries are curated.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map((a) => (
              <article key={a.slug} className="rounded-2xl border bg-white p-6" style={{ borderColor: KEBU.border }}>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
                    style={{ background: `${KEBU.orange}18`, color: KEBU.orange }}
                  >
                    {a.countryCode}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                    {a.confidence === "exploratory" ? "Exploratory" : a.confidence === "high" ? "High confidence" : "Medium confidence"}
                  </span>
                  <TrustLabelBadge trustLabel={a.trustLabel} />
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
                    style={{
                      background: a.verdict === "promising" ? KEBU.status.successBg : a.verdict === "unlikely" ? KEBU.status.errorBg : KEBU.cream,
                      color: a.verdict === "promising" ? KEBU.status.successText : a.verdict === "unlikely" ? KEBU.status.errorText : KEBU.black,
                    }}
                  >
                    {verdictLabel(a.verdict)}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {a.productCategory}
                </h3>
                <p className="text-sm leading-relaxed mb-3" style={{ color: KEBU.muted }}>
                  {a.importDependencyNote}
                </p>
                <p className="text-sm leading-relaxed mb-3">
                  <span className="font-bold">Local production today: </span>
                  {a.localProductionStatus}
                </p>
                <p className="text-sm leading-relaxed mb-3">
                  <span className="font-bold">Why this verdict: </span>
                  {a.verdictReasoning}
                </p>
                {a.sources.length > 0 ? (
                  <p className="text-[10px]" style={{ color: KEBU.faint }}>
                    Source: {a.sources.map((s) => s.title || s.note).filter(Boolean).join(" · ")}
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
