"use client";

import { useEffect, useRef, useState } from "react";
import type { ShippingQuote } from "@/lib/shop/shipping-corridors";

/** Buyer destination + SN→GH (and SN→SN) estimate — honest labels. */
export function PublicShippingQuote({
  subdomain,
  sellerCountry = "SN",
  valueXof,
  onChange,
}: {
  subdomain: string;
  sellerCountry?: string;
  valueXof?: number | null;
  onChange?: (opts: {
    buyerCountry: string;
    quote: ShippingQuote | null;
  }) => void;
}) {
  const [buyerCountry, setBuyerCountry] = useState(sellerCountry || "SN");
  const [destinations, setDestinations] = useState<{ code: string; label: string }[]>([
    { code: "SN", label: "Senegal" },
    { code: "GH", label: "Ghana" },
  ]);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [unsupported, setUnsupported] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = new URLSearchParams({
      to: buyerCountry,
      from: sellerCountry || "SN",
    });
    if (valueXof != null && valueXof > 0) q.set("goodsValueXof", String(valueXof));
    void fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/shipping-quote?${q}`, {
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (Array.isArray(data.destinations)) setDestinations(data.destinations);
        const next = (data.quote as ShippingQuote | null) ?? null;
        setQuote(next);
        setUnsupported(typeof data.unsupported === "string" ? data.unsupported : null);
        onChangeRef.current?.({ buyerCountry, quote: next });
      })
      .catch(() => {
        if (!cancelled) {
          setQuote(null);
          setUnsupported("Could not load shipping estimate.");
          onChangeRef.current?.({ buyerCountry, quote: null });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subdomain, sellerCountry, buyerCountry, valueXof]);

  return (
    <div className="space-y-1.5 rounded-lg border border-black/10 bg-black/[0.02] p-2">
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
          Ship to (country)
        </span>
        <select
          className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-black"
          value={buyerCountry}
          onChange={(e) => setBuyerCountry(e.target.value)}
        >
          {destinations.map((d) => (
            <option key={d.code} value={d.code}>
              {d.label} ({d.code})
            </option>
          ))}
        </select>
      </label>
      {loading ? (
        <p className="text-[10px] opacity-60">Checking shipping…</p>
      ) : quote ? (
        <div className="text-[10px] leading-relaxed opacity-80">
          <p className="font-semibold opacity-100">{quote.summary}</p>
          <p className="mt-0.5">
            Trust: <span className="uppercase">{quote.trustLabel}</span> · {quote.carrierHint}
          </p>
          {quote.crossBorder ? (
            <p className="mt-1 opacity-70">{quote.customsHint}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-[10px] opacity-70">
          {unsupported || "No shipping estimate for this corridor yet."}
        </p>
      )}
    </div>
  );
}
