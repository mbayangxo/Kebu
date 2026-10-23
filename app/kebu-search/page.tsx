"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuAuthHeaderCTA } from "@/app/components/kebu-auth-header-cta";
import { KEBU } from "@/lib/kebu-brand";

type BusinessResult = {
  id: string;
  name: string;
  summary: string;
  category: string | null;
  countryCode: string | null;
  trustLabel: "verified" | "unverified";
  sourceName: string;
  sourceUrl: string | null;
  fetchedAt: string;
  href: string;
};

type Payload = { query: string; results: BusinessResult[]; mode: "recent" | "query" };

const MODES: Array<{ id: string; label: string; live: boolean }> = [
  { id: "business", label: "Business", live: true },
  { id: "web", label: "Web", live: false },
  { id: "africa", label: "Africa", live: false },
  { id: "products", label: "Products", live: false },
  { id: "people", label: "People & Talent", live: false },
  { id: "research", label: "Research", live: false },
  { id: "trade", label: "Trade", live: false },
  { id: "opportunities", label: "Opportunities", live: false },
  { id: "culture", label: "Culture", live: false },
  { id: "local", label: "Local", live: false },
];

export default function KebuSearchPage() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Payload>({ query: "", results: [], mode: "recent" });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setLoading(true);
      setFailed(false);
      try {
        const r = await fetch(`/api/search/businesses?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!r.ok) throw new Error("search");
        setData(await r.json());
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, q ? 200 : 0);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <main className="min-h-screen" style={{ background: KEBU.bright, color: KEBU.black }}>
      <header className="flex items-center justify-between border-b px-5 py-4 sm:px-8" style={{ borderColor: KEBU.border }}>
        <Link href="/" className="flex items-center gap-2">
          <KebuMark size={28} />
          <span className="text-sm font-black">Kebu Search</span>
        </Link>
        <div className="flex items-center gap-2">
          <KebuAuthHeaderCTA />
        </div>
      </header>

      <section className="border-b px-5 py-10 sm:px-8" style={{ borderColor: KEBU.border }}>
        <div className="mx-auto max-w-[760px] text-center">
          <h1 className="text-[34px] leading-[1.02] tracking-[-.03em] sm:text-[46px]" style={{ fontFamily: "var(--font-fraunces)" }}>
            Find real businesses, not just links.
          </h1>
          <p className="mt-3 text-[13px]" style={{ color: KEBU.muted }}>
            Kebu Search connects you to businesses, products and opportunities actually indexed on Kebu —
            every result shows where it came from.
          </p>
          <div className="mx-auto mt-6 flex max-w-[640px] items-center gap-3 rounded-full border bg-white px-4 py-3 shadow-sm" style={{ borderColor: KEBU.border }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ color: KEBU.muted }}>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search businesses — e.g. “chocolate manufacturing Senegal”"
              aria-label="Search Kebu businesses"
              className="min-h-6 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-black/35"
            />
            {q ? (
              <button onClick={() => setQ("")} className="text-[10px] font-semibold" style={{ color: KEBU.muted }}>
                Clear
              </button>
            ) : null}
          </div>
          <div className="mx-auto mt-5 flex max-w-[680px] flex-wrap justify-center gap-2">
            {MODES.map((mode) =>
              mode.live ? (
                <span
                  key={mode.id}
                  className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: KEBU.black, color: "white" }}
                >
                  {mode.label}
                </span>
              ) : (
                <span
                  key={mode.id}
                  title="Not available yet"
                  aria-disabled="true"
                  className="cursor-not-allowed rounded-full border px-3 py-1.5 text-[10px] font-semibold opacity-45"
                  style={{ borderColor: KEBU.border, color: KEBU.muted }}
                >
                  {mode.label} · soon
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[900px] px-5 py-8 sm:px-8">
        {failed ? (
          <div className="rounded-[14px] border p-5" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg }}>
            <p className="font-semibold">Search could not load.</p>
            <p className="mt-1 text-[11px]" style={{ color: KEBU.status.errorText }}>
              Check your connection and try again.
            </p>
          </div>
        ) : null}

        {!failed && loading ? <p className="py-10 text-center text-[11px]" style={{ color: KEBU.muted }}>Searching…</p> : null}

        {!failed && !loading && data.mode === "recent" && !q ? (
          <>
            <h2 className="mb-3 text-xs font-black uppercase tracking-[.16em]" style={{ color: KEBU.muted }}>
              Recently active on Kebu
            </h2>
            {data.results.length === 0 ? (
              <div className="rounded-[14px] border border-dashed p-10 text-center" style={{ borderColor: KEBU.border }}>
                <p className="font-semibold">No active businesses are indexed yet.</p>
                <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
                  Kebu Search only shows businesses that have actually been reviewed and activated —
                  nothing here is invented.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.results.map((item) => (
                  <BusinessCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </>
        ) : null}

        {!failed && !loading && data.mode === "query" ? (
          <>
            <h2 className="mb-3 text-xs font-black uppercase tracking-[.16em]" style={{ color: KEBU.muted }}>
              {data.results.length} result{data.results.length === 1 ? "" : "s"} for “{data.query}”
            </h2>
            {data.results.length === 0 ? (
              <div className="rounded-[14px] border border-dashed p-10 text-center" style={{ borderColor: KEBU.border }}>
                <p className="font-semibold">No indexed businesses match “{data.query}”.</p>
                <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
                  Kebu Search only shows real, indexed records — it will never invent a result to fill this space.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.results.map((item) => (
                  <BusinessCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

function BusinessCard({ item }: { item: BusinessResult }) {
  return (
    <Link
      href={item.href}
      className="block rounded-[14px] border bg-white p-4 transition hover:shadow-md"
      style={{ borderColor: KEBU.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{item.name}</p>
          <p className="mt-0.5 truncate text-xs" style={{ color: KEBU.muted }}>
            {item.summary}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide"
          style={{
            background: item.trustLabel === "verified" ? KEBU.status.successBg : "#F3EEE9",
            color: item.trustLabel === "verified" ? KEBU.status.successText : KEBU.muted,
          }}
        >
          {item.trustLabel}
        </span>
      </div>
      <p className="mt-2 text-[9px]" style={{ color: KEBU.faint }}>
        Source: {item.sourceName} · indexed {new Date(item.fetchedAt).toLocaleDateString()}
      </p>
    </Link>
  );
}
