"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import type { SearchResult } from "@/lib/search/types";

type SearchMode = "all" | "sites" | "business" | "designs" | "opportunities" | "people";
type Payload = { results: SearchResult[]; pages: SearchResult[]; mode?: SearchMode; opportunityAccess?: boolean };

const PILL_MODE: Record<string, SearchMode> = {
  "All": "all",
  "Web": "sites",
  "People": "people",
  "Opportunities": "opportunities",
};

const FILTER_PILLS = ["All", "Web", "People", "Opportunities", "Challenges", "Products", "Places", "Knowledge", "Visual", "More"];

const TRENDING = [
  { label: "Pan-African trade routes", pct: "+34%" },
  { label: "Creative freelance opportunities", pct: "+28%" },
  { label: "African tech startups", pct: "+21%" },
  { label: "Diaspora remittance tools", pct: "+19%" },
  { label: "Sustainable fashion brands", pct: "+15%" },
];

const OPPORTUNITY_TILES = [
  { label: "Creative Grants 2025", org: "Kebu Foundation", tag: "Open" },
  { label: "Tech Co-Founder", org: "NairobiTech", tag: "New" },
  { label: "Export Bootcamp", org: "AfroTrade", tag: "Closing" },
];

const TOPICS = [
  { label: "Finance", color: "#0E9F6E" },
  { label: "Design", color: "#6C63FF" },
  { label: "Trade", color: "#FF5500" },
  { label: "Health", color: "#0EA5E9" },
  { label: "Education", color: "#F4B400" },
  { label: "Tech", color: "#FF1F1F" },
];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Payload>({ results: [], pages: [] });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activePill, setActivePill] = useState("All");
  const inputRef = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      abort.current?.abort();
      const controller = new AbortController(); abort.current = controller;
      setLoading(true); setFailed(false);
      try {
        const mode: SearchMode = PILL_MODE[activePill] ?? "all";
        const r = await fetch(`/api/me/search?q=${encodeURIComponent(q)}&mode=${mode}`, { credentials: "include", signal: controller.signal });
        if (!r.ok) throw new Error("search");
        setData(await r.json());
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, q ? 180 : 0);
    return () => clearTimeout(timer);
  }, [q, activePill]);

  const allResults = [...(data.pages ?? []), ...(data.results ?? [])];
  const hasResults = allResults.length > 0;

  return (
    <AppShell title="Search">
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(145deg, #0A0A0A 0%, #1a0800 55%, #0A0A0A 100%)", minHeight: 400 }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 90% at 65% 40%, rgba(255,85,0,.28) 0%, transparent 60%), radial-gradient(ellipse 45% 60% at 10% 80%, rgba(255,140,0,.18) 0%, transparent 55%)" }} />
        <div className="relative mx-auto max-w-5xl px-6 py-16 sm:px-8">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[.22em]" style={{ color: KEBU.orange }}>Kebu Search</p>
          <h1 className="max-w-2xl text-[clamp(2.4rem,6vw,4.5rem)] font-black leading-[.9] tracking-[-.05em] text-white" style={{ fontFamily: "var(--font-fraunces)" }}>
            Search a bigger{" "}
            <em className="not-italic" style={{ color: KEBU.orange }}>tomorrow.</em>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            Search your Kebu and the trusted Kebu corpus. Results are real records, not generated answers.
          </p>

          {/* Search bar */}
          <div className="mt-8 flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-xl" style={{ maxWidth: 680 }}>
            <span className="text-lg" style={{ color: KEBU.orange }}>✦</span>
            <input
              ref={inputRef}
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search people, places, opportunities, ideas…"
              aria-label="Search Kebu"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none"
              style={{ color: KEBU.black }}
            />
            {loading && <span className="shrink-0 h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: KEBU.orange, borderTopColor: "transparent" }} />}
            {q && !loading && (
              <button onClick={() => setQ("")} className="shrink-0 text-xs font-bold" style={{ color: KEBU.muted }}>Clear</button>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="shrink-0 rounded-xl px-5 py-2.5 text-[11px] font-black text-white transition hover:brightness-110"
              style={{ background: KEBU.black }}
            >
              Search
            </button>
          </div>

          {/* Filter pills */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {FILTER_PILLS.map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => setActivePill(pill)}
                className="shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wide transition-colors"
                style={{
                  background: activePill === pill ? KEBU.orange : "rgba(255,255,255,0.1)",
                  color: activePill === pill ? "#fff" : "rgba(255,255,255,0.6)",
                  border: activePill === pill ? "none" : "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {pill}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8" style={{ color: KEBU.black }}>

        {/* Active search results */}
        {q && (
          <section className="mb-12">
            {failed ? (
              <div className="rounded-2xl border p-6" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg }}>
                <p className="font-semibold">Search could not load.</p>
                <p className="mt-1 text-sm" style={{ color: KEBU.status.errorText }}>Check your connection and try again.</p>
              </div>
            ) : loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl border" style={{ borderColor: KEBU.borders.default }} />
                ))}
              </div>
            ) : !hasResults ? (
              <div className="rounded-2xl border border-dashed bg-white p-10 text-center" style={{ borderColor: KEBU.borders.default }}>
                <KebuIcon name="search" size={28} className="mx-auto mb-3" style={{ color: KEBU.faint }} />
                <p className="font-semibold">No results for &ldquo;{q}&rdquo;</p>
                <p className="mt-1 text-sm" style={{ color: KEBU.muted }}>Kebu only shows records that actually exist in the current index.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {allResults.map(item => <ResultCard key={item.id} item={item} />)}
              </div>
            )}
          </section>
        )}

        {/* Discovery content — shown when no active search */}
        {!q && (
          <>
            {/* Featured grid */}
            <section className="mb-10">
              <h2 className="mb-4 text-[10px] font-black uppercase tracking-[.18em]" style={{ color: KEBU.orange }}>Discover</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <FeaturedCard
                  tag="Featured Challenge"
                  title="African Design Week 2025"
                  sub="Submit your design to be featured across 12 countries."
                  accent="#FF5500"
                  href="/opportunities"
                />
                <FeaturedCard
                  tag="Latest Winner"
                  title="Nia Abena Mensah"
                  sub="Won the Pan-African Creative Grant — Accra, Ghana."
                  accent="#6C63FF"
                  href="/search?q=winner"
                />
                <FeaturedCard
                  tag="In the Spotlight"
                  title="Kebu Marketplace Launch"
                  sub="Trade your skills and products across the continent."
                  accent="#0E9F6E"
                  href="/shop"
                />
              </div>
            </section>

            {/* 4-column section */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Trending */}
              <section>
                <h3 className="mb-3 text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.muted }}>Trending searches</h3>
                <div className="space-y-2">
                  {TRENDING.map((item, i) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setQ(item.label)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition hover:bg-black/[.04]"
                      style={{ border: `1px solid ${KEBU.borders.default}` }}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="shrink-0 text-[10px] font-black" style={{ color: KEBU.faint }}>{String(i + 1).padStart(2, "0")}</span>
                        <span className="truncate text-[11px] font-semibold">{item.label}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-black" style={{ color: "#0E9F6E" }}>{item.pct}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Opportunities */}
              <section>
                <h3 className="mb-3 text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.muted }}>Opportunities for you</h3>
                <div className="space-y-2">
                  {OPPORTUNITY_TILES.map(opp => (
                    <Link
                      key={opp.label}
                      href="/opportunities"
                      className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-black/[.04]"
                      style={{ border: `1px solid ${KEBU.borders.default}` }}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-[10px] font-black" style={{ background: KEBU.orange }}>
                        {opp.label.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-bold">{opp.label}</span>
                        <span className="text-[9px]" style={{ color: KEBU.muted }}>{opp.org}</span>
                      </span>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black"
                        style={{
                          background: opp.tag === "Open" ? "rgba(14,159,110,.12)" : opp.tag === "New" ? "rgba(255,85,0,.1)" : "rgba(0,0,0,.07)",
                          color: opp.tag === "Open" ? "#0E9F6E" : opp.tag === "New" ? KEBU.orange : KEBU.muted,
                        }}>
                        {opp.tag}
                      </span>
                    </Link>
                  ))}
                  <Link href="/opportunities" className="block pt-1 text-center text-[10px] font-black" style={{ color: KEBU.orange }}>See all →</Link>
                </div>
              </section>

              {/* Recent winners */}
              <section>
                <h3 className="mb-3 text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.muted }}>Recent winners</h3>
                <div className="rounded-xl border border-dashed p-4 text-center" style={{ borderColor: KEBU.borders.default }}>
                  <KebuIcon name="yande" size={22} className="mx-auto mb-2" style={{ color: KEBU.faint }} />
                  <p className="text-[10px] font-semibold">Winners announced here</p>
                  <p className="mt-1 text-[9px]" style={{ color: KEBU.muted }}>When a Kebu challenge closes, the winners will show up in this spot.</p>
                </div>
              </section>

              {/* Topics */}
              <section>
                <h3 className="mb-3 text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.muted }}>Explore by topic</h3>
                <div className="grid grid-cols-2 gap-2">
                  {TOPICS.map(topic => (
                    <button
                      key={topic.label}
                      type="button"
                      onClick={() => setQ(topic.label)}
                      className="rounded-xl px-3 py-3 text-left text-[11px] font-black transition hover:brightness-110"
                      style={{ background: topic.color + "22", color: topic.color, border: `1px solid ${topic.color}33` }}
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Bottom CTA */}
            <section className="mt-12 overflow-hidden rounded-2xl p-8 text-center" style={{ background: KEBU.black }}>
              <p className="text-[10px] font-black uppercase tracking-[.2em]" style={{ color: KEBU.orange }}>Kebu Search</p>
              <h2 className="mt-3 text-2xl font-black text-white" style={{ fontFamily: "var(--font-fraunces)" }}>
                Don&apos;t just search.{" "}
                <span style={{ color: KEBU.orange }}>Build.</span>
              </h2>
              <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                Turn every search into an opportunity. Find co-founders, clients, and collaborators.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {(
                  [
                    { label: "Find an opportunity", href: "/opportunities" },
                    { label: "Browse Kebu People", href: "/search?q=people" },
                    { label: "Start a project", href: "/create" },
                  ] as const
                ).map(({ label, href }) => (
                  <Link key={label} href={href}
                    className="rounded-full border px-5 py-2.5 text-[11px] font-black text-white transition hover:bg-white/10"
                    style={{ borderColor: "rgba(255,255,255,0.2)" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function FeaturedCard({ tag, title, sub, accent, href }: { tag: string; title: string; sub: string; accent: string; href: string }) {
  return (
    <Link href={href} className="group block overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: KEBU.borders.default }}>
      <div className="relative h-32" style={{ background: accent + "18" }}>
        <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(ellipse at 70% 30%, ${accent}, transparent 60%)` }} />
        <div className="absolute left-4 top-4">
          <span className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase text-white" style={{ background: accent }}>{tag}</span>
        </div>
      </div>
      <div className="bg-white p-4">
        <p className="text-sm font-black" style={{ color: KEBU.black }}>{title}</p>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: KEBU.muted }}>{sub}</p>
      </div>
    </Link>
  );
}

function ResultCard({ item }: { item: SearchResult }) {
  return (
    <Link href={item.href} className="group flex min-h-20 items-center gap-3 rounded-2xl border bg-white p-4 transition hover:-translate-y-px hover:shadow-sm" style={{ borderColor: KEBU.borders.default }}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: KEBU.cream, color: item.accent ?? KEBU.black }}>
        <KebuIcon name={item.kind === "opportunity" ? "opportunity" : item.kind === "design" ? "studio" : item.kind === "business" ? "spaces" : item.kind === "site" ? "builder" : "arrowRight"} size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{item.label}</span>
        {item.sublabel ? <span className="block truncate text-xs" style={{ color: KEBU.muted }}>{item.sublabel}</span> : null}
        {item.sourceName ? <span className="mt-1 block truncate text-[9px]" style={{ color: KEBU.faint }}>Source: {item.sourceName}</span> : null}
        {item.trustLabel ? <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider" style={{ color: item.trustLabel === "verified" ? KEBU.status.successText : KEBU.faint }}>{item.trustLabel.replaceAll("_", " ")}</span> : null}
      </span>
      <KebuIcon name="arrowRight" size={16} style={{ color: KEBU.faint }} />
    </Link>
  );
}
