"use client";

import { useCallback, useEffect, useState } from "react";
import { OpportunityOsShell } from "@/app/components/opportunity/opportunity-os-shell";
import { OpportunityCardTile } from "@/app/components/opportunity/opportunity-card-view";
import { Skeleton } from "@/app/components/kebu-skeleton";
import { KEBU } from "@/lib/kebu-brand";
import type { OpportunityCardListItem } from "@/lib/opportunity/opportunity-card-schema";

export default function OpportunityCardsPage() {
  const [cards, setCards] = useState<OpportunityCardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trustNote, setTrustNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/opportunity/cards");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load cards.");
        setCards([]);
        return;
      }
      setCards(Array.isArray(data.cards) ? data.cards : []);
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
      title="Opportunity Cards"
      eyebrow="Opportunity OS · Cards"
      headline="Evidence-linked opportunities — not guesses."
      subhead="Each card shows problem, evidence, sources, and confidence. Validate before you invest."
      heroVisual={
        <div
          className="rounded-3xl h-full min-h-[200px] flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${KEBU.orange}22, ${KEBU.cream})`,
            border: `1px solid ${KEBU.border}`,
          }}
        >
          <div className="text-center px-6">
            <p className="text-5xl font-bold" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.orange }}>
              {loading ? "…" : cards.length}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: KEBU.muted }}>
              Published cards
            </p>
          </div>
        </div>
      }
    >
      {trustNote ? (
        <p className="text-xs mb-6 max-w-2xl" style={{ color: KEBU.muted }}>
          {trustNote}
        </p>
      ) : null}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl p-5" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
              <Skeleton height={11} width="40%" style={{ marginBottom: 10 }} />
              <Skeleton height={20} width="75%" style={{ marginBottom: 8 }} />
              <Skeleton height={12} width="100%" style={{ marginBottom: 5 }} />
              <Skeleton height={12} width="80%" style={{ marginBottom: 14 }} />
              <div className="flex gap-2">
                <Skeleton height={22} width={60} radius={11} />
                <Skeleton height={22} width={80} radius={11} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div>
          <p className="text-sm mb-4" style={{ color: KEBU.red }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: KEBU.orange }}
          >
            Retry
          </button>
        </div>
      ) : cards.length === 0 ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          No published cards yet. Apply migration 063 and seed curated cards.
        </p>
      ) : (
        <ul className="grid md:grid-cols-2 gap-5">
          {cards.map((card) => (
            <li key={card.slug}>
              <OpportunityCardTile card={card} />
            </li>
          ))}
        </ul>
      )}
    </OpportunityOsShell>
  );
}
