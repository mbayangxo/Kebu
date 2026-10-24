"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuAuthHeaderCTA } from "@/app/components/kebu-auth-header-cta";
import { KEBU } from "@/lib/kebu-brand";
import { AFRICAN_COUNTRY_CODES } from "@/lib/kebu-id/schemas";

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

type ProductResult = {
  id: string;
  kind: "shop_product" | "marketplace_template";
  name: string;
  summary: string;
  category: string | null;
  priceLabel: string | null;
  trustLabel: "verified" | "unverified";
  sourceName: string;
  sourceUrl: string | null;
  fetchedAt: string;
  href: string;
};

type AnyResult = BusinessResult | ProductResult;

type SearchResponse<T> = { query: string; results: T[]; mode: "recent" | "query"; total: number };

type ModeId = "business" | "products";

const MODES: Array<{ id: string; label: string; live: boolean }> = [
  { id: "business", label: "Business", live: true },
  { id: "products", label: "Products", live: true },
  { id: "web", label: "Web", live: false },
  { id: "africa", label: "Africa", live: false },
  { id: "people", label: "People & Talent", live: false },
  { id: "research", label: "Research", live: false },
  { id: "trade", label: "Trade", live: false },
  { id: "opportunities", label: "Opportunities", live: false },
  { id: "culture", label: "Culture", live: false },
  { id: "local", label: "Local", live: false },
];

// Same country list business registration validates country_code against
// (lib/kebu-id/schemas.ts) — the filter can never offer a code no business
// could ever actually have.
const countryDisplay = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRY_OPTIONS = AFRICAN_COUNTRY_CODES.map((code) => ({ code, name: countryDisplay.of(code) ?? code })).sort(
  (a, b) => a.name.localeCompare(b.name),
);
function countryLabel(code: string): string {
  return COUNTRY_OPTIONS.find((o) => o.code === code)?.name ?? code;
}

const PAGE_SIZE = 20;

const RECENT_LABEL: Record<ModeId, string> = {
  business: "Recently active on Kebu",
  products: "Recently listed on Kebu",
};
const EMPTY_RECENT_LABEL: Record<ModeId, string> = {
  business: "No active businesses are indexed yet",
  products: "No products are indexed yet",
};
const EMPTY_QUERY_LABEL: Record<ModeId, string> = {
  business: "No indexed businesses match",
  products: "No indexed products match",
};
const NOUN: Record<ModeId, string> = { business: "businesses", products: "products" };

export default function KebuSearchPage() {
  const [activeMode, setActiveMode] = useState<ModeId>("business");
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [results, setResults] = useState<AnyResult[]>([]);
  const [total, setTotal] = useState(0);
  const [mode, setMode] = useState<"recent" | "query">("recent");
  const [queryEcho, setQueryEcho] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const runSearch = useCallback(
    async (offset: number, append: boolean) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setFailed(false);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (activeMode === "business" && country) params.set("country", country);
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(offset));
        const endpoint = activeMode === "business" ? "/api/search/businesses" : "/api/search/products";
        const r = await fetch(`${endpoint}?${params.toString()}`, { signal: controller.signal });
        if (!r.ok) throw new Error("search");
        const body: SearchResponse<AnyResult> = await r.json();
        setMode(body.mode);
        setQueryEcho(body.query);
        setTotal(body.total);
        setResults((prev) => (append ? [...prev, ...body.results] : body.results));
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [q, country, activeMode],
  );

  useEffect(() => {
    const timer = setTimeout(() => runSearch(0, false), q ? 200 : 0);
    return () => clearTimeout(timer);
  }, [runSearch, q]);

  function switchMode(next: ModeId) {
    if (next === activeMode) return;
    setActiveMode(next);
    setQ("");
    setCountry("");
    setResults([]);
    setTotal(0);
  }

  const hasMore = !loading && !failed && results.length < total;

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
              placeholder={
                activeMode === "business"
                  ? "Search businesses — e.g. “chocolate manufacturing Senegal”"
                  : "Search products and templates — e.g. “Instagram post template”"
              }
              aria-label={`Search Kebu ${NOUN[activeMode]}`}
              className="min-h-6 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-black/35"
            />
            {q ? (
              <button onClick={() => setQ("")} className="text-[10px] font-semibold" style={{ color: KEBU.muted }}>
                Clear
              </button>
            ) : null}
          </div>

          {activeMode === "business" ? (
            <div className="mx-auto mt-3 flex max-w-[640px] items-center justify-center gap-2">
              <label htmlFor="kebu-search-country" className="text-[10px] font-semibold" style={{ color: KEBU.muted }}>
                Country
              </label>
              <select
                id="kebu-search-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                aria-label="Filter businesses by country"
                className="rounded-full border bg-white px-3 py-1.5 text-[11px] font-semibold"
                style={{ borderColor: KEBU.border, color: KEBU.black }}
              >
                <option value="">All countries</option>
                {COUNTRY_OPTIONS.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name}
                  </option>
                ))}
              </select>
              {country ? (
                <button onClick={() => setCountry("")} className="text-[10px] font-semibold" style={{ color: KEBU.muted }}>
                  Clear
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="mx-auto mt-5 flex max-w-[680px] flex-wrap justify-center gap-2">
            {MODES.map((m) =>
              m.live ? (
                <button
                  key={m.id}
                  onClick={() => switchMode(m.id as ModeId)}
                  className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
                  style={
                    activeMode === m.id
                      ? { background: KEBU.black, color: "white" }
                      : { border: `1px solid ${KEBU.border}`, color: KEBU.black, background: "white" }
                  }
                >
                  {m.label}
                </button>
              ) : (
                <span
                  key={m.id}
                  title="Not available yet"
                  aria-disabled="true"
                  className="cursor-not-allowed rounded-full border px-3 py-1.5 text-[10px] font-semibold opacity-45"
                  style={{ borderColor: KEBU.border, color: KEBU.muted }}
                >
                  {m.label} · soon
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

        {!failed && !loading && mode === "recent" && !q ? (
          <>
            <h2 className="mb-3 text-xs font-black uppercase tracking-[.16em]" style={{ color: KEBU.muted }}>
              {RECENT_LABEL[activeMode]}
              {activeMode === "business" && country ? ` · ${countryLabel(country)}` : ""}
            </h2>
            {results.length === 0 ? (
              <div className="rounded-[14px] border border-dashed p-10 text-center" style={{ borderColor: KEBU.border }}>
                <p className="font-semibold">
                  {EMPTY_RECENT_LABEL[activeMode]}
                  {activeMode === "business" && country ? ` in ${countryLabel(country)}` : ""}.
                </p>
                <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
                  Kebu Search only shows real, indexed records — nothing here is invented.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((item) =>
                  activeMode === "business" ? (
                    <BusinessCard key={item.id} item={item as BusinessResult} />
                  ) : (
                    <ProductCard key={item.id} item={item as ProductResult} />
                  ),
                )}
              </div>
            )}
          </>
        ) : null}

        {!failed && !loading && mode === "query" ? (
          <>
            <h2 className="mb-3 text-xs font-black uppercase tracking-[.16em]" style={{ color: KEBU.muted }}>
              {total} result{total === 1 ? "" : "s"} for “{queryEcho}”
              {activeMode === "business" && country ? ` · ${countryLabel(country)}` : ""}
            </h2>
            {results.length === 0 ? (
              <div className="rounded-[14px] border border-dashed p-10 text-center" style={{ borderColor: KEBU.border }}>
                <p className="font-semibold">
                  {EMPTY_QUERY_LABEL[activeMode]} “{queryEcho}”
                  {activeMode === "business" && country ? ` in ${countryLabel(country)}` : ""}.
                </p>
                <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
                  Kebu Search only shows real, indexed records — it will never invent a result to fill this space.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((item) =>
                  activeMode === "business" ? (
                    <BusinessCard key={item.id} item={item as BusinessResult} />
                  ) : (
                    <ProductCard key={item.id} item={item as ProductResult} />
                  ),
                )}
              </div>
            )}
          </>
        ) : null}

        {!failed && !loading && hasMore ? (
          <div className="mt-5 flex justify-center">
            <button
              onClick={() => {
                if (!loadingMore) runSearch(results.length, true);
              }}
              disabled={loadingMore}
              className="rounded-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
              style={{ background: KEBU.black }}
            >
              {loadingMore ? "Loading…" : `Load more (${total - results.length} more)`}
            </button>
          </div>
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

function ProductCard({ item }: { item: ProductResult }) {
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
        {item.priceLabel ? (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide"
            style={{ background: "#F3EEE9", color: KEBU.black }}
          >
            {item.priceLabel}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[9px]" style={{ color: KEBU.faint }}>
        Source: {item.sourceName} · indexed {new Date(item.fetchedAt).toLocaleDateString()}
      </p>
    </Link>
  );
}
