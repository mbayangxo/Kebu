"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { StudioWorldNav } from "@/app/components/studio/studio-world-nav";
import { KEBU } from "@/lib/kebu-brand";

function formatXof(amount: number): string {
  return `${Math.round(amount).toLocaleString()} XOF`;
}

type MarketplaceAsset = {
  id: string;
  slug: string;
  kind: "photo" | "font" | "pattern" | "texture";
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  previewUrl: string | null;
  licenseNote: string;
  priceCents: number;
  acquireCount: number;
  developerName: string | null;
};

const KIND_FILTERS = [
  { value: "all", label: "All" },
  { value: "photo", label: "Photos" },
  { value: "pattern", label: "Patterns" },
  { value: "texture", label: "Textures" },
  { value: "font", label: "Fonts" },
] as const;

const CHECKOUT_METHOD_LABELS: Record<string, string> = {
  joko: "JOKO (Cauris)",
  wave: "Wave",
  orange_money: "Orange Money",
  card: "Card",
  paypal: "PayPal",
};

export default function StudioAssetMarketplacePage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-black/60">Loading marketplace…</p>}>
      <StudioAssetMarketplaceInner />
    </Suspense>
  );
}

function StudioAssetMarketplaceInner() {
  const search = useSearchParams();
  const [kind, setKind] = useState<(typeof KIND_FILTERS)[number]["value"]>("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MarketplaceAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acquiringId, setAcquiringId] = useState<string | null>(null);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [availableMethods, setAvailableMethods] = useState<string[]>(["joko"]);
  const [method, setMethod] = useState("joko");

  const billingNote = useMemo(() => {
    const b = search.get("billing");
    if (b === "success") return "Payment received (or pending webhook). Refresh if you just paid.";
    if (b === "cancelled") return "Checkout cancelled — asset not unlocked.";
    return null;
  }, [search]);

  useEffect(() => {
    if (billingNote) setNote(billingNote);
  }, [billingNote]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (kind !== "all") params.set("kind", kind);
    if (query.trim()) params.set("q", query.trim());
    setError(null);
    fetch(`/api/studio/creative-assets?${params.toString()}`, { credentials: "include", signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data.items) ? data.items : []))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Could not load the marketplace.");
      });
    return () => controller.abort();
  }, [kind, query]);

  useEffect(() => {
    fetch("/api/payments/checkout-methods", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const methods = Object.entries(data.methods ?? {}).filter(([, ok]) => ok).map(([id]) => id);
        if (methods.length) { setAvailableMethods(methods); setMethod(methods[0]!); }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch("/api/studio/creative-assets/library", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const ids: string[] = Array.isArray(data.items) ? data.items.map((i: { asset: { id: string } }) => i.asset.id) : [];
        setOwnedIds(new Set(ids));
      })
      .catch(() => undefined);
  }, []);

  async function acquire(assetId: string) {
    setAcquiringId(assetId);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/studio/creative-assets/${assetId}/acquire`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not add this to your library.");
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl as string;
        return;
      }
      setOwnedIds((prev) => new Set(prev).add(assetId));
      setNote(data.alreadyOwned ? "Already in your library." : "Added to your library — open it from Studio → Assets.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add this to your library.");
    } finally {
      setAcquiringId(null);
    }
  }

  const empty = useMemo(() => items !== null && items.length === 0, [items]);

  return (
    <div className="min-h-screen bg-[#FFFCF8] text-black">
      <StudioWorldNav />
      <main className="mx-auto max-w-[1320px] px-4 py-7 sm:px-7 lg:px-10">
        <header className="mb-7 border-b pb-6" style={{ borderColor: KEBU.borders.default }}>
          <p className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: KEBU.orange }}>Creative Assets Marketplace</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-[-.04em] sm:text-5xl">Photos, patterns, textures and fonts.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>
                Free to use in your Kebu designs today. Built by the Kebu community — publish your own from the Sell tab.
              </p>
            </div>
            <Link href="/studio/assets/sell" className="rounded-full bg-black px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-white">
              Sell on Kebu →
            </Link>
          </div>
        </header>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {KIND_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setKind(f.value)}
                className="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[.12em]"
                style={{ background: kind === f.value ? KEBU.black : "transparent", color: kind === f.value ? "white" : KEBU.muted, border: `1px solid ${KEBU.borders.default}` }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assets"
            className="ml-auto min-h-10 w-full max-w-xs rounded-full border px-4 text-sm outline-none"
            style={{ borderColor: KEBU.borders.default }}
          />
        </div>

        {error ? <div role="alert" className="mb-5 rounded-[16px] border px-4 py-3 text-xs font-semibold" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>{error}</div> : null}
        {note ? <div role="status" className="mb-5 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">{note}</div> : null}

        {items === null ? (
          <p className="text-sm" style={{ color: KEBU.muted }}>Loading…</p>
        ) : empty ? (
          <div className="rounded-[20px] border border-dashed p-10 text-center" style={{ borderColor: KEBU.borders.default }}>
            <p className="text-sm font-semibold">No assets yet in this category.</p>
            <p className="mt-2 text-xs" style={{ color: KEBU.muted }}>Be the first to publish one — it&apos;s free to list.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-[18px] border bg-white p-3" style={{ borderColor: KEBU.borders.default }}>
                <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-[12px] bg-[#F3EEE6]">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: KEBU.muted }}>{item.kind}</span>
                  )}
                </div>
                <p className="truncate text-sm font-bold">{item.name}</p>
                <p className="mt-0.5 text-[10px]" style={{ color: KEBU.muted }}>
                  {item.developerName ?? "Kebu community"} · {item.priceCents === 0 ? "Free" : formatXof(item.priceCents)}
                </p>
                {item.priceCents > 0 && !ownedIds.has(item.id) && availableMethods.length > 1 ? (
                  <select
                    aria-label="Pay with"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="mt-2 w-full rounded-full border px-2 py-1.5 text-[10px] font-semibold"
                    style={{ borderColor: KEBU.borders.default }}
                  >
                    {availableMethods.map((m) => (
                      <option key={m} value={m}>{CHECKOUT_METHOD_LABELS[m] ?? m}</option>
                    ))}
                  </select>
                ) : null}
                <button
                  type="button"
                  disabled={acquiringId === item.id || ownedIds.has(item.id)}
                  onClick={() => void acquire(item.id)}
                  className="mt-3 w-full rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-50"
                  style={{ background: ownedIds.has(item.id) ? KEBU.muted : KEBU.orange }}
                >
                  {ownedIds.has(item.id)
                    ? "In your library"
                    : acquiringId === item.id
                      ? "Processing…"
                      : item.priceCents > 0
                        ? `Buy — ${formatXof(item.priceCents)}`
                        : "Add to library"}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
