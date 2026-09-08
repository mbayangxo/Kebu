"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { OpportunityOsShell } from "@/app/components/opportunity/opportunity-os-shell";
import { OpportunityCardDetailView } from "@/app/components/opportunity/opportunity-card-view";
import { KEBU } from "@/lib/kebu-brand";
import type { OpportunityCardDetail } from "@/lib/opportunity/opportunity-card-schema";

export default function OpportunityCardDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug.toLowerCase() : "";
  const [card, setCard] = useState<OpportunityCardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunity/cards/${encodeURIComponent(slug)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load card.");
        setCard(null);
        return;
      }
      setCard(data.card ?? null);
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <OpportunityOsShell title="Opportunity Card" headline="Loading…" subhead="">
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Loading card…
        </p>
      </OpportunityOsShell>
    );
  }

  if (error || !card) {
    return (
      <OpportunityOsShell title="Opportunity Card" headline="Card not found" subhead="">
        <p className="text-sm mb-4" style={{ color: KEBU.red }}>
          {error ?? "This opportunity card is not published."}
        </p>
        <Link href="/opportunity/cards" className="text-xs font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
          ← All cards
        </Link>
      </OpportunityOsShell>
    );
  }

  return (
    <OpportunityOsShell
      title={card.title}
      eyebrow="Opportunity OS · Card"
      headline={card.title}
      subhead={card.opportunitySummary}
    >
      <Link
        href="/opportunity/cards"
        className="inline-block mb-8 text-xs font-bold uppercase tracking-wider"
        style={{ color: KEBU.orange }}
      >
        ← All opportunity cards
      </Link>
      <OpportunityCardDetailView card={card} />
    </OpportunityOsShell>
  );
}
