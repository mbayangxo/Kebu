"use client";

import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";

export type StoryCardData = {
  id: string;
  slug: string;
  title: string;
  person_name: string;
  country_code: string | null;
  era: string;
  summary: string;
  lesson: string;
  trust_label: string;
  source_url: string | null;
};

const ERA_LABEL: Record<string, string> = {
  contemporary: "Contemporary leader",
  historical: "History",
  ancestral_legacy: "Heritage & ancestors",
};

const TRUST_LABEL: Record<string, string> = {
  verified_public: "Verified public source",
  estimated: "Estimated",
  ai_generated: "AI-generated",
  requires_validation: "Requires validation",
};

export function HopeStoryCard({ story }: { story: StoryCardData }) {
  return (
    <article
      className="relative rounded-3xl overflow-hidden min-h-[280px] flex flex-col justify-end p-6 text-white"
      style={{
        background: `linear-gradient(160deg, ${KEBU.black} 0%, ${KEBU.orange}88 100%)`,
        boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
      }}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-80 mb-2">
        {ERA_LABEL[story.era] ?? story.era} · {TRUST_LABEL[story.trust_label] ?? story.trust_label}
      </p>
      <h3 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
        {story.title}
      </h3>
      <p className="text-sm opacity-90 mb-3">{story.person_name}</p>
      <p className="text-sm leading-relaxed opacity-95 line-clamp-4">{story.summary}</p>
      {story.lesson ? (
        <p className="text-xs mt-4 pt-4 border-t border-white/20 italic opacity-90">{story.lesson}</p>
      ) : null}
      {story.source_url ? (
        <a
          href={story.source_url}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-bold uppercase tracking-wider mt-3 underline opacity-80"
        >
          Source →
        </a>
      ) : null}
    </article>
  );
}

export function PersonalizedPlanCard({
  headline,
  summary,
  startSteps,
  resourceHints,
}: {
  headline: string;
  summary: string;
  startSteps: string[];
  resourceHints: { label: string; detail: string }[];
}) {
  return (
    <div
      className="rounded-3xl p-8 mb-10"
      style={{
        background: `linear-gradient(135deg, ${KEBU.cream} 0%, ${KEBU.white} 60%)`,
        border: `1px solid ${KEBU.border}`,
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: KEBU.orange }}>
        Your plan · based on your answers
      </p>
      <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
        {headline}
      </h2>
      <p className="text-sm mb-6" style={{ color: KEBU.muted }}>
        {summary}
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: KEBU.faint }}>
            Start here
          </p>
          <ol className="space-y-2">
            {startSteps.map((s, i) => (
              <li key={s} className="flex gap-3 text-sm">
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: KEBU.orange }}
                >
                  {i + 1}
                </span>
                <span style={{ color: KEBU.muted }}>{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: KEBU.faint }}>
            Resources for you
          </p>
          <ul className="space-y-3">
            {resourceHints.map((h) => (
              <li key={h.label} className="text-sm">
                <span className="font-bold">{h.label}</span>
                <span style={{ color: KEBU.muted }}> — {h.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Link
        href="/opportunity/intake"
        className="inline-block mt-6 text-xs font-bold uppercase tracking-wider underline"
        style={{ color: KEBU.orange }}
      >
        Update my answers
      </Link>
    </div>
  );
}
