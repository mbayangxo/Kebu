"use client";

import Link from "next/link";
import { countryVisual } from "@/lib/opportunity/country-visuals";
import { KEBU } from "@/lib/kebu-brand";

export type CountryCardData = {
  country: string;
  country_code: string;
  capital: string | null;
  population: number | null;
  industries: string[] | null;
  data_confidence: string | null;
};

export function CountryExplorerCard({ country }: { country: CountryCardData }) {
  const vis = countryVisual(country.country_code);
  const code = country.country_code.toLowerCase();

  return (
    <Link
      href={`/opportunity/countries/${code}`}
      className="group relative block rounded-3xl overflow-hidden min-h-[220px] transition-transform duration-300 hover:scale-[1.02]"
      style={{ boxShadow: `0 20px 50px ${vis.glow}` }}
    >
      <div className="absolute inset-0" style={{ background: vis.gradient }} />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />
      <span
        className="absolute -right-4 -top-6 text-[8rem] font-black leading-none opacity-[0.12] select-none"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {vis.watermark}
      </span>

      <div className="relative h-full flex flex-col justify-end p-6 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">
          {country.data_confidence ? `${country.data_confidence} · verified slice` : "Country profile"}
        </p>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
          {country.country}
        </h2>
        {country.capital ? (
          <p className="text-sm opacity-90 mt-1">{country.capital}</p>
        ) : null}
        {country.industries && country.industries.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {country.industries.slice(0, 3).map((ind) => (
              <span
                key={ind}
                className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
              >
                {ind}
              </span>
            ))}
          </div>
        ) : null}
        <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
          Explore
          <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}

export function CountryExplorerMosaic({ countries }: { countries: CountryCardData[] }) {
  if (countries.length === 0) {
    return (
      <div
        className="rounded-3xl p-12 text-center"
        style={{ background: KEBU.white, border: `1px dashed ${KEBU.border}` }}
      >
        <p className="font-semibold text-lg mb-2">Countries loading soon</p>
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Apply migration 009 to publish country profiles.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {countries.map((c) => (
        <li key={c.country_code} className={countries.length === 1 ? "sm:col-span-2 lg:col-span-1" : ""}>
          <CountryExplorerCard country={c} />
        </li>
      ))}
    </ul>
  );
}
