"use client";

import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";
import type { OpportunityCardListItem } from "@/lib/opportunity/opportunity-card-schema";

function confidenceLabel(confidence: string): string {
  if (confidence === "high") return "High confidence";
  if (confidence === "exploratory") return "Exploratory";
  return "Medium confidence";
}

export function OpportunityCardTile({ card }: { card: OpportunityCardListItem }) {
  return (
    <Link
      href={`/opportunity/cards/${card.slug}`}
      className="block rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        background: KEBU.white,
        border: `1px solid ${KEBU.border}`,
        boxShadow: "0 12px 40px rgba(10,10,10,0.06)",
      }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
          style={{ background: `${KEBU.orange}18`, color: KEBU.orange }}
        >
          {card.countryCode}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
          {confidenceLabel(card.confidence)}
        </span>
      </div>
      <h3 className="text-lg font-bold mb-2 leading-snug" style={{ fontFamily: "var(--font-fraunces)" }}>
        {card.title}
      </h3>
      <p className="text-sm leading-relaxed line-clamp-3" style={{ color: KEBU.muted }}>
        {card.opportunitySummary}
      </p>
      {card.locationLabel ? (
        <p className="mt-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.black }}>
          {card.locationLabel}
        </p>
      ) : null}
      <span className="inline-block mt-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.red }}>
        Open card →
      </span>
    </Link>
  );
}

export function OpportunityCardDetailView({
  card,
}: {
  card: import("@/lib/opportunity/opportunity-card-schema").OpportunityCardDetail;
}) {
  return (
    <article className="space-y-10">
      <header>
        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className="text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1"
            style={{ background: KEBU.orange, color: "#fff" }}
          >
            {card.trustLabel}
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1"
            style={{ background: KEBU.cream, color: KEBU.black }}
          >
            {confidenceLabel(card.confidence)}
          </span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>
          {card.title}
        </h1>
        <p className="text-base leading-relaxed max-w-3xl" style={{ color: KEBU.muted }}>
          {card.opportunitySummary}
        </p>
        {card.locationLabel ? (
          <p className="mt-3 text-xs font-bold uppercase tracking-wider">{card.locationLabel}</p>
        ) : null}
      </header>

      <Section title="Problem">{card.problem}</Section>
      <Section title="Evidence">{card.evidence}</Section>
      {card.whyNow ? <Section title="Why now">{card.whyNow}</Section> : null}
      {card.customerSegment ? <Section title="Customer">{card.customerSegment}</Section> : null}
      {card.importDependency ? <Section title="Import dependency">{card.importDependency}</Section> : null}
      {card.localResources.length > 0 ? (
        <Section title="Local resources">
          <ul className="list-disc pl-5 space-y-1">
            {card.localResources.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Section>
      ) : null}
      {card.requiredCapabilities.length > 0 ? (
        <Section title="Required capabilities">
          <ul className="list-disc pl-5 space-y-1">
            {card.requiredCapabilities.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Section>
      ) : null}
      {card.businessModels.length > 0 ? (
        <Section title="Business models">
          <ul className="list-disc pl-5 space-y-1">
            {card.businessModels.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {card.sources.length > 0 ? (
        <section>
          <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>
            Sources
          </h2>
          <ul className="space-y-2 text-sm">
            {card.sources.map((s, i) => (
              <li key={`${s.title ?? s.url ?? i}`}>
                {s.url ? (
                  <a href={s.url} className="font-semibold underline" style={{ color: KEBU.orange }} target="_blank" rel="noreferrer">
                    {s.title ?? s.url}
                  </a>
                ) : (
                  <span className="font-semibold">{s.title ?? "Source"}</span>
                )}
                {s.note ? <span style={{ color: KEBU.muted }}> — {s.note}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div
        className="rounded-3xl p-8"
        style={{ background: `linear-gradient(120deg, ${KEBU.black}, ${KEBU.orange})`, color: "#fff" }}
      >
        <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          Build this with Kebu
        </h2>
        <p className="text-sm opacity-90 mb-5 max-w-xl">
          Turn research into a draft business, site, or store — you confirm before anything publishes.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/business/register"
            className="rounded-full bg-white text-black px-6 py-3 text-xs font-bold uppercase tracking-wider"
          >
            Start Kebu ID
          </Link>
          <Link
            href="/create"
            className="rounded-full border-2 border-white px-6 py-3 text-xs font-bold uppercase tracking-wider"
          >
            Open Builder
          </Link>
        </div>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed" style={{ color: KEBU.muted }}>
        {children}
      </div>
    </section>
  );
}
