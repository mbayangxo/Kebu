"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlkebulanLion } from "@/app/components/panther-motif";

type CountryRow = {
  country: string;
  country_code: string;
  capital: string | null;
  population: number | null;
  gdp: string | null;
  industries: string[] | null;
  overview: string | null;
  data_confidence: string | null;
};

export default function OpportunityCountriesPage() {
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trustNote, setTrustNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/opportunity/countries");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load countries.");
        setCountries([]);
        return;
      }
      setCountries(Array.isArray(data.countries) ? data.countries : []);
      setTrustNote(data.trust?.note ?? null);
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", color: "#0F0D33" }}>
      <header className="sticky top-0 z-40" style={{ background: "#0F0D33" }}>
        <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #009E40, #00C851)" }} />
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/opportunity" className="flex items-center gap-2 text-white text-sm">
            <AlkebulanLion size={28} />
            <span className="font-bold tracking-[0.12em]">Country Explorer</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "#009E40" }}>
          Opportunity OS · Slice 1
        </p>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          Countries
        </h1>
        <p className="text-sm mb-6 max-w-2xl" style={{ color: "#6B5B45", lineHeight: 1.7 }}>
          Explore curated country profiles for African entrepreneurship. Verified/curated data is separate from
          AI-generated opportunity analysis.
        </p>

        {trustNote && (
          <p className="text-xs mb-6 rounded-xl px-4 py-3" style={{ background: "#F0FFF6", color: "#0F0D33" }}>
            {trustNote}
          </p>
        )}

        {error && (
          <div role="alert" className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
            {error}{" "}
            <button type="button" className="underline font-semibold" onClick={() => void load()}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: "#6B5B45" }}>
            Loading countries…
          </p>
        ) : countries.length === 0 && !error ? (
          <div className="rounded-2xl p-8 text-center" style={{ border: "1px dashed #DDE0F0", background: "#fff" }}>
            <p className="font-semibold mb-2">No published countries yet</p>
            <p className="text-sm" style={{ color: "#6B5B45" }}>
              Apply migration 009 (Senegal seed) or run the admin seed endpoint.
            </p>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {countries.map((c) => (
              <li key={c.country_code}>
                <Link
                  href={`/opportunity/countries/${c.country_code.toLowerCase()}`}
                  className="block rounded-2xl px-5 py-4 h-full"
                  style={{ background: "#fff", border: "1px solid #DDE0F0" }}
                >
                  <p className="font-semibold">{c.country}</p>
                  <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: "#8A8578" }}>
                    {c.country_code}
                    {c.capital ? ` · ${c.capital}` : ""}
                    {c.data_confidence ? ` · ${c.data_confidence} confidence` : ""}
                  </p>
                  {c.industries && c.industries.length > 0 && (
                    <p className="text-xs mt-2" style={{ color: "#6B5B45" }}>
                      {(c.industries ?? []).slice(0, 4).join(" · ")}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
