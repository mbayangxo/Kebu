"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuAuthHeaderCTA } from "@/app/components/kebu-auth-header-cta";
import { KEBU } from "@/lib/kebu-brand";

type CountryProfile = {
  name: string;
  code: string;
  capital: string | null;
  population: number | null;
  gdp: string | null;
  economyOverview: string | null;
  startupEcosystem: string | null;
  technologyEcosystem: string | null;
  universities: string[];
  majorExports: string[];
  majorImports: string[];
  tradeAgreements: string[];
  industrialZones: string[];
  manufacturingSectors: string[];
  logistics: string | null;
  culturalNotes: string | null;
  historicalNotes: string | null;
  historicalEmpires: string[];
  ethnicGroups: string[];
  businessEtiquette: string[];
  diasporaNotes: string | null;
  dataConfidence: string | null;
  lastVerifiedAt: string | null;
};

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>
        {title}
      </p>
      <p className="mt-1 text-sm">{items.join(", ")}</p>
    </div>
  );
}

export default function CountryIntelPage() {
  const params = useParams<{ code: string }>();
  const [country, setCountry] = useState<CountryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch(`/api/public/countries/${encodeURIComponent(params.code)}`);
        if (!active) return;
        if (r.status === 404) {
          setNotFound(true);
          return;
        }
        if (!r.ok) {
          setFailed(true);
          return;
        }
        const body = await r.json();
        setCountry(body.country);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.code]);

  return (
    <main className="min-h-screen" style={{ background: KEBU.bright, color: KEBU.black }}>
      <header className="flex items-center justify-between border-b px-5 py-4 sm:px-8" style={{ borderColor: KEBU.border }}>
        <Link href="/kebu-search" className="flex items-center gap-2">
          <KebuMark size={28} />
          <span className="text-sm font-black">Kebu Search</span>
        </Link>
        <KebuAuthHeaderCTA />
      </header>

      <div className="mx-auto max-w-[720px] px-5 py-10 sm:px-8">
        <Link href="/kebu-search" className="text-[11px] font-semibold" style={{ color: KEBU.muted }}>
          ← Back to search
        </Link>

        {loading ? <p className="mt-6 text-[11px]" style={{ color: KEBU.muted }}>Loading…</p> : null}

        {!loading && notFound ? (
          <div className="mt-6 rounded-[14px] border border-dashed p-10 text-center" style={{ borderColor: KEBU.border }}>
            <p className="font-semibold">This country profile isn&rsquo;t publicly listed.</p>
            <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
              It may not exist, or isn&rsquo;t published yet.
            </p>
          </div>
        ) : null}

        {!loading && failed ? (
          <div className="mt-6 rounded-[14px] border p-10 text-center" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg }}>
            <p className="font-semibold">This profile could not load.</p>
            <p className="mt-1 text-[11px]" style={{ color: KEBU.status.errorText }}>
              Check your connection and try again.
            </p>
          </div>
        ) : null}

        {!loading && country ? (
          <article className="mt-6 rounded-[18px] border bg-white p-6" style={{ borderColor: KEBU.border }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black">{country.name}</h1>
                {country.capital ? (
                  <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
                    Capital: {country.capital}
                    {country.population ? ` · Population: ${country.population.toLocaleString()}` : ""}
                  </p>
                ) : null}
              </div>
              <span
                className="shrink-0 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wide"
                style={{
                  background: country.dataConfidence === "high" ? KEBU.status.successBg : "#F3EEE9",
                  color: country.dataConfidence === "high" ? KEBU.status.successText : KEBU.muted,
                }}
              >
                {country.dataConfidence || "unverified"} confidence
              </span>
            </div>

            {country.economyOverview ? <p className="mt-4 text-sm leading-relaxed">{country.economyOverview}</p> : null}
            {country.startupEcosystem ? (
              <div className="mt-4">
                <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>
                  Startup ecosystem
                </p>
                <p className="mt-1 text-sm">{country.startupEcosystem}</p>
              </div>
            ) : null}
            {country.technologyEcosystem ? (
              <div className="mt-4">
                <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>
                  Technology ecosystem
                </p>
                <p className="mt-1 text-sm">{country.technologyEcosystem}</p>
              </div>
            ) : null}
            <List title="Universities" items={country.universities} />

            <hr className="my-5" style={{ borderColor: KEBU.border }} />

            <List title="Major exports" items={country.majorExports} />
            <List title="Major imports" items={country.majorImports} />
            <List title="Trade agreements" items={country.tradeAgreements} />
            <List title="Industrial zones" items={country.industrialZones} />
            <List title="Manufacturing sectors" items={country.manufacturingSectors} />
            {country.logistics ? (
              <div className="mt-4">
                <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>
                  Logistics
                </p>
                <p className="mt-1 text-sm">{country.logistics}</p>
              </div>
            ) : null}

            {country.culturalNotes || country.historicalNotes || country.diasporaNotes ||
            country.historicalEmpires.length || country.ethnicGroups.length || country.businessEtiquette.length ? (
              <>
                <hr className="my-5" style={{ borderColor: KEBU.border }} />
                <p className="text-[9px] uppercase tracking-wide" style={{ color: KEBU.faint }}>
                  Cultural & historical reference — Kebu&rsquo;s own country notes, not RECT video content
                </p>
                {country.culturalNotes ? <p className="mt-3 text-sm leading-relaxed">{country.culturalNotes}</p> : null}
                {country.historicalNotes ? (
                  <div className="mt-4">
                    <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>
                      History
                    </p>
                    <p className="mt-1 text-sm">{country.historicalNotes}</p>
                  </div>
                ) : null}
                <List title="Historical empires" items={country.historicalEmpires} />
                <List title="Ethnic groups" items={country.ethnicGroups} />
                <List title="Business etiquette" items={country.businessEtiquette} />
                {country.diasporaNotes ? (
                  <div className="mt-4">
                    <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>
                      Diaspora
                    </p>
                    <p className="mt-1 text-sm">{country.diasporaNotes}</p>
                  </div>
                ) : null}
              </>
            ) : null}

            <p className="mt-6 text-[9px]" style={{ color: KEBU.faint }}>
              Source: Kebu Country Intelligence
              {country.lastVerifiedAt ? ` · last verified ${new Date(country.lastVerifiedAt).toLocaleDateString()}` : ""}
            </p>
          </article>
        ) : null}
      </div>
    </main>
  );
}
