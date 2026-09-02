"use client";

import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";

export type ReadinessSummary = {
  score_value: number;
  score_band: string;
  confidence_level: string;
  explanation: { summary?: string; note?: string };
  missing_items: string[];
  helping_factors: string[];
  limiting_factors: string[];
};

export function BusinessReadinessCard({
  readiness,
  businessId,
  compact = false,
}: {
  readiness: ReadinessSummary;
  businessId: string;
  compact?: boolean;
}) {
  return (
    <div
      id="readiness"
      className={`rounded-2xl bg-white ${compact ? "p-5" : "p-8"}`}
      style={{ border: `1px solid ${KEBU.border}`, boxShadow: compact ? "none" : "0 12px 32px rgba(255,85,0,0.08)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: KEBU.orange }}>
        Kebu Score · Business Readiness
      </p>
      <p className={`font-bold mb-1 ${compact ? "text-4xl" : "text-6xl"}`} style={{ fontFamily: "var(--font-fraunces)", color: KEBU.orange }}>
        {readiness.score_value}
      </p>
      <p className="text-xs uppercase tracking-wider mb-3" style={{ color: KEBU.orange }}>
        {readiness.score_band.replace(/_/g, " ")} · {readiness.confidence_level} confidence
      </p>
      {readiness.explanation?.summary ? (
        <p className="text-sm mb-3" style={{ color: KEBU.muted }}>
          {readiness.explanation.summary}
        </p>
      ) : null}
      {!compact && readiness.helping_factors?.length > 0 ? (
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: KEBU.faint }}>
            Helping
          </p>
          <ul className="text-sm space-y-0.5" style={{ color: KEBU.muted }}>
            {readiness.helping_factors.slice(0, 5).map((f) => (
              <li key={f}>+ {f}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {readiness.missing_items?.length > 0 ? (
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: KEBU.faint }}>
            Next actions
          </p>
          <ul className="text-sm space-y-0.5" style={{ color: KEBU.muted }}>
            {readiness.missing_items.slice(0, compact ? 3 : 6).map((f) => (
              <li key={f}>→ {f}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link href={`/business/${businessId}`} className="text-sm font-semibold underline" style={{ color: KEBU.orange }}>
        Open full business dashboard →
      </Link>
    </div>
  );
}
