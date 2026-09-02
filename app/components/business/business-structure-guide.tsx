"use client";

import { useMemo, useState } from "react";
import type { LegalStructure } from "@/lib/kebu-id/countries/types";

type FinderMode = "solo" | "group" | "growing" | "mission";

const FINDER_HINTS: Record<
  FinderMode,
  { title: string; blurb: string; codes: string[] }
> = {
  solo: {
    title: "Just me — solo founder",
    blurb: "You work alone today. Start simple, or pick a one-person company if you want more protection.",
    codes: ["individual_enterprise", "suarl"],
  },
  group: {
    title: "We're a group",
    blurb: "2+ people sharing work, land, tools, or money. Cooperatives and GIEs are built for this.",
    codes: ["gie", "cooperative", "sarl"],
  },
  growing: {
    title: "Growing company with partners",
    blurb: "You want staff, investors, or big clients. SARL / SA are the usual next step.",
    codes: ["sarl", "suarl", "sa"],
  },
  mission: {
    title: "Community or social mission",
    blurb: "Your goal is impact, clubs, or community service — not personal profit.",
    codes: ["association", "cooperative", "gie"],
  },
};

function StructureDetail({ s }: { s: LegalStructure }) {
  return (
    <div className="space-y-3 pt-2 border-t border-[#E8E4DC]">
      {s.simpleAnalogy ? (
        <p className="text-sm leading-relaxed" style={{ color: "#0A0A0A" }}>
          <strong>Think of it like:</strong> {s.simpleAnalogy}
        </p>
      ) : null}
      {s.bestWhen ? (
        <p className="text-xs leading-relaxed" style={{ color: "#5C5348" }}>
          <strong>Choose this when:</strong> {s.bestWhen}
        </p>
      ) : null}
      {s.examples?.length ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#6B5B45" }}>
            Examples
          </p>
          <ul className="text-xs space-y-1 list-disc pl-4" style={{ color: "#5C5348" }}>
            {s.examples.map((ex) => (
              <li key={ex}>{ex}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {s.pros?.length ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#1B6B3A" }}>
            Advantages
          </p>
          <ul className="text-xs space-y-1 list-disc pl-4" style={{ color: "#5C5348" }}>
            {s.pros.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {s.cons?.length ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#8B6914" }}>
            Watch out for
          </p>
          <ul className="text-xs space-y-1 list-disc pl-4" style={{ color: "#5C5348" }}>
            {s.cons.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** First-time founder lesson — teach each structure, then let them choose. */
export function BusinessStructureGuide({
  structures,
  selectedCode,
  onSelect,
  disabled,
  countryName,
}: {
  structures: LegalStructure[];
  selectedCode: string;
  onSelect: (code: string) => void;
  disabled?: boolean;
  countryName: string;
}) {
  const [finder, setFinder] = useState<FinderMode | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(true);

  const recommendedCodes = useMemo(
    () => (finder ? new Set(FINDER_HINTS[finder].codes) : null),
    [finder],
  );

  const sortedStructures = useMemo(() => {
    if (!recommendedCodes) return structures;
    return [...structures].sort((a, b) => {
      const ar = recommendedCodes.has(a.code) ? 0 : 1;
      const br = recommendedCodes.has(b.code) ? 0 : 1;
      return ar - br;
    });
  }, [structures, recommendedCodes]);

  return (
    <div className="space-y-5">
      {/* Lesson intro */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: "#FFF8F2", border: "1px solid rgba(255,85,0,0.22)" }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#FF5500" }}>
          First time? We&apos;ll teach you
        </p>
        <h3 className="text-base font-bold leading-snug">What is a business structure?</h3>
        <p className="text-sm leading-relaxed" style={{ color: "#5C5348" }}>
          It is how the government <strong>labels</strong> your business. That label decides who is responsible if
          something goes wrong, how you pay taxes, whether you can have partners, and which loans or programs you can
          access in {countryName}.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "#5C5348" }}>
          You are not stuck forever — many founders start simple and upgrade later. Kebu helps you pick what fits{" "}
          <strong>today</strong>, then prepare documents for registration.
        </p>
      </div>

      {/* Quick fit finder */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider">Which sounds like you?</p>
        <p className="text-[11px] leading-relaxed" style={{ color: "#8A8578" }}>
          Tap one — we&apos;ll highlight structures that usually fit. You can still read every option below.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {(Object.keys(FINDER_HINTS) as FinderMode[]).map((key) => {
            const hint = FINDER_HINTS[key];
            const active = finder === key;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => setFinder(active ? null : key)}
                className="text-left rounded-xl px-4 py-3 transition-all disabled:opacity-50"
                style={{
                  border: `2px solid ${active ? "#FF5500" : "rgba(10,10,10,0.1)"}`,
                  background: active ? "rgba(255,85,0,0.08)" : "#fff",
                }}
              >
                <span className="block text-sm font-bold">{hint.title}</span>
                <span className="block text-[11px] mt-1 leading-relaxed" style={{ color: "#6B5B45" }}>
                  {hint.blurb}
                </span>
              </button>
            );
          })}
        </div>
        {finder ? (
          <p className="text-xs rounded-lg px-3 py-2" style={{ background: "#F4F2EC", color: "#5C5348" }}>
            Showing <strong>{FINDER_HINTS[finder].title}</strong> picks first. Expand any card to learn more before you
            choose.
          </p>
        ) : null}
      </div>

      {/* Quick compare */}
      <div>
        <button
          type="button"
          className="text-xs font-semibold underline"
          style={{ color: "#FF5500" }}
          onClick={() => setShowCompare((v) => !v)}
        >
          {showCompare ? "Hide" : "Show"} quick comparison (4 most common)
        </button>
        {showCompare ? (
          <div
            className="mt-2 overflow-x-auto rounded-xl text-[11px]"
            style={{ border: "1px solid #E8E4DC" }}
          >
            <table className="w-full min-w-[520px]">
              <thead style={{ background: "#F4F2EC" }}>
                <tr>
                  <th className="text-left p-2 font-bold">Structure</th>
                  <th className="text-left p-2 font-bold">Who</th>
                  <th className="text-left p-2 font-bold">In one line</th>
                </tr>
              </thead>
              <tbody>
                {["individual_enterprise", "gie", "suarl", "sarl"]
                  .map((code) => structures.find((s) => s.code === code))
                  .filter(Boolean)
                  .map((s) => (
                    <tr key={s!.code} style={{ borderTop: "1px solid #E8E4DC" }}>
                      <td className="p-2 font-semibold whitespace-nowrap">{s!.label}</td>
                      <td className="p-2" style={{ color: "#6B5B45" }}>
                        {s!.whoItsFor?.split(".")[0] ?? "—"}
                      </td>
                      <td className="p-2" style={{ color: "#5C5348" }}>
                        {s!.summary ?? "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Structure cards — learn then choose */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider">Explore each structure</p>
        {sortedStructures.map((s) => {
          const isSelected = selectedCode === s.code;
          const isExpanded = expanded === s.code;
          const isRecommended = recommendedCodes?.has(s.code);

          return (
            <article
              key={s.code}
              className="rounded-2xl overflow-hidden transition-shadow"
              style={{
                border: `2px solid ${isSelected ? "#FF5500" : isRecommended ? "rgba(255,85,0,0.35)" : "rgba(10,10,10,0.1)"}`,
                background: isSelected ? "rgba(255,85,0,0.05)" : "#fff",
                boxShadow: isSelected ? "0 4px 20px rgba(255,85,0,0.12)" : "none",
              }}
            >
              <div className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold">{s.label}</h4>
                      {isRecommended ? (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: "#FF5500", color: "#fff" }}
                        >
                          Good match
                        </span>
                      ) : null}
                      {isSelected ? (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: "#0A0A0A", color: "#fff" }}
                        >
                          Your choice
                        </span>
                      ) : null}
                    </div>
                    {s.description ? (
                      <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: "#8A8074" }}>
                        {s.description}
                      </p>
                    ) : null}
                    {s.summary ? (
                      <p className="text-xs mt-2 leading-relaxed" style={{ color: "#5C5348" }}>
                        {s.summary}
                      </p>
                    ) : null}
                    {s.whoItsFor && !isExpanded ? (
                      <p className="text-[11px] mt-2" style={{ color: "#6B5B45" }}>
                        <strong>Good for:</strong> {s.whoItsFor}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setExpanded(isExpanded ? null : s.code)}
                      className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: "#F4F2EC", color: "#0A0A0A" }}
                    >
                      {isExpanded ? "Less detail" : "Learn more"}
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelect(s.code)}
                      className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                      style={{
                        background: isSelected ? "#0A0A0A" : "#FF5500",
                        color: "#fff",
                      }}
                    >
                      {isSelected ? "Selected" : "Choose"}
                    </button>
                  </div>
                </div>
                {isExpanded ? <StructureDetail s={s} /> : null}
              </div>
            </article>
          );
        })}
      </div>

      {selectedCode ? (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#E8F5EC", border: "1px solid #B8DFC8" }}>
          You chose{" "}
          <strong>{structures.find((s) => s.code === selectedCode)?.label ?? selectedCode}</strong>. You can change
          this anytime before government submission.
        </div>
      ) : (
        <p className="text-xs text-center py-2" style={{ color: "#8A8578" }}>
          Read the cards above, then tap <strong>Choose</strong> on the structure that fits you.
        </p>
      )}
    </div>
  );
}
