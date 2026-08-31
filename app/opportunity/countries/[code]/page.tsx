"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { KebuMark } from "@/app/components/kebu-mark";
import { KEBU } from "@/lib/kebu-brand";
import type { CountryAiAnalysisRow, CountryProfileRow } from "@/lib/opportunity/country-schema";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-5 mb-4" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
      <h2 className="text-sm font-bold uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] | null | undefined }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm" style={{ color: "#8A8578" }}>
        Not yet curated.
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="text-xs px-2.5 py-1 rounded-full"
          style={{ background: "#F4F2EC", color: "#0F0D33" }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function CountryDetailPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [verified, setVerified] = useState<CountryProfileRow | null>(null);
  const [analyses, setAnalyses] = useState<CountryAiAnalysisRow[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunity/countries/${code}`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setError("Country not found.");
        setVerified(null);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load country.");
        return;
      }
      setVerified(data.verified);
      setAnalyses(Array.isArray(data.aiAnalyses) ? data.aiAnalyses : []);
      setLabels(data.labels ?? {});
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function generateAi() {
    if (aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/opportunity/countries/${code}/ai-analysis`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/opportunity/countries/${code}`);
        return;
      }
      if (!res.ok) {
        setAiError(typeof data.error === "string" ? data.error : "AI analysis failed.");
        return;
      }
      await load();
    } catch {
      setAiError("Network error while generating analysis.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: KEBU.bright, color: KEBU.black }}>
      <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: "rgba(255,251,247,0.92)" }}>
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }} />
        <div
          className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${KEBU.border}` }}
        >
          <Link href="/opportunity/countries" className="flex items-center gap-2 text-sm" style={{ color: KEBU.black }}>
            <KebuMark size={28} />
            <span className="font-bold tracking-[0.12em]">← Countries</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        {loading ? (
          <p className="text-sm" style={{ color: "#6B5B45" }}>
            Loading…
          </p>
        ) : error || !verified ? (
          <div role="alert" className="rounded-xl p-4" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
            {error ?? "Unavailable"}{" "}
            <button type="button" className="underline font-semibold" onClick={() => void load()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: KEBU.orange }}>
              {labels.verified ?? "Verified / curated"}
            </p>
            <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
              {verified.country}
            </h1>
            <p className="text-sm mb-6" style={{ color: "#6B5B45" }}>
              {verified.country_code}
              {verified.capital ? ` · Capital ${verified.capital}` : ""}
              {verified.population ? ` · Pop. ${(verified.population / 1_000_000).toFixed(1)}M` : ""}
              {verified.gdp ? ` · GDP ${verified.gdp}` : ""}
              {verified.data_confidence ? ` · ${verified.data_confidence} confidence` : ""}
            </p>

            <Section title="Overview">
              <p className="text-sm leading-relaxed" style={{ color: "#6B5B45" }}>
                {verified.overview || verified.cultural_notes || "Overview not yet curated."}
              </p>
            </Section>

            <Section title="Economy overview">
              <p className="text-sm leading-relaxed" style={{ color: "#6B5B45" }}>
                {verified.economy_overview || "Not yet curated."}
              </p>
            </Section>

            <Section title="Major industries">
              <List items={verified.industries} />
            </Section>

            <div className="grid sm:grid-cols-2 gap-4">
              <Section title="Major exports">
                <List items={verified.major_exports} />
              </Section>
              <Section title="Major imports">
                <List items={verified.major_imports} />
              </Section>
            </div>

            <Section title="Agricultural products">
              <List items={verified.agricultural_products} />
            </Section>

            <Section title="Manufacturing sectors">
              <List items={verified.manufacturing_sectors} />
            </Section>

            <Section title="Technology ecosystem">
              <p className="text-sm leading-relaxed" style={{ color: "#6B5B45" }}>
                {verified.technology_ecosystem || verified.startup_notes || "Not yet curated."}
              </p>
            </Section>

            <Section title="Infrastructure & logistics">
              <p className="text-sm mb-2" style={{ color: "#6B5B45" }}>
                {verified.infrastructure || "Infrastructure notes not yet curated."}
              </p>
              <p className="text-sm" style={{ color: "#6B5B45" }}>
                {verified.logistics || "Logistics notes not yet curated."}
              </p>
            </Section>

            <Section title="Trade agreements">
              <List items={verified.trade_agreements} />
            </Section>

            <Section title="Public entrepreneurship programs">
              <List items={verified.public_entrepreneurship_programs?.length ? verified.public_entrepreneurship_programs : verified.youth_programs} />
            </Section>

            <Section title="Startup ecosystem">
              <p className="text-sm leading-relaxed" style={{ color: "#6B5B45" }}>
                {verified.startup_ecosystem || verified.startup_notes || "Not yet curated."}
              </p>
            </Section>

            <Section title="Universities">
              <List items={verified.universities} />
            </Section>

            <Section title="Industrial zones">
              <List items={verified.industrial_zones} />
            </Section>

            <Section title="Business registration guidance">
              <p className="text-sm leading-relaxed" style={{ color: "#6B5B45" }}>
                {verified.business_registration_guidance ||
                  "Confirm current registration procedures with official sources before filing."}
              </p>
            </Section>

            {/* AI — clearly separated */}
            <div
              className="rounded-2xl p-5 mt-8 bg-white"
              style={{ border: `1px solid ${KEBU.border}`, boxShadow: "0 12px 32px rgba(255,85,0,0.06)" }}
            >
              <p className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: KEBU.orange }}>
                {labels.ai_generated ?? "AI-generated"}
              </p>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
                Opportunity AI analysis
              </h2>
              <p className="text-sm mb-4" style={{ color: KEBU.muted }}>
                Optional. Not verified public data. Do not treat as official statistics or guaranteed opportunities.
              </p>
              <button
                type="button"
                onClick={() => void generateAi()}
                disabled={aiBusy}
                className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                {aiBusy ? "Generating…" : analyses.length ? "Generate new analysis" : "Generate AI analysis"}
              </button>
              {aiError && (
                <p role="alert" className="text-sm mt-3 text-red-300">
                  {aiError}
                </p>
              )}
            </div>

            {analyses.map((a) => (
              <section
                key={a.id}
                className="rounded-2xl p-5 mt-4"
                style={{ background: "#FFF8E8", border: "1px solid #F0E0B8" }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#8A6A00" }}>
                  {a.label.replace(/_/g, " ")} · {a.confidence} confidence · {new Date(a.created_at).toLocaleString()}
                </p>
                <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "#6B5B45" }}>
                  {a.analysis_markdown}
                </div>
              </section>
            ))}

            <p className="text-xs mt-8" style={{ color: "#8A8578" }}>
              Industry, resource, import/export explorers and Build This Business are later Opportunity OS slices.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
