"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OpportunityOsShell } from "@/app/components/opportunity/opportunity-os-shell";
import { CountryExplorerMosaic, type CountryCardData } from "@/app/components/opportunity/country-explorer-card";
import { KEBU } from "@/lib/kebu-brand";
import type { OpportunityProfile } from "@/lib/opportunity/intake-schema";
import { filterCountriesForProfile } from "@/lib/opportunity/personalize";

export default function OpportunityCountriesPage() {
  const [countries, setCountries] = useState<CountryCardData[]>([]);
  const [profile, setProfile] = useState<OpportunityProfile | null>(null);
  const [personalizedOnly, setPersonalizedOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trustNote, setTrustNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [countriesRes, profileRes] = await Promise.all([
        fetch("/api/opportunity/countries"),
        fetch("/api/me/opportunity-profile", { credentials: "include" }),
      ]);
      const data = await countriesRes.json().catch(() => ({}));
      const profileData = await profileRes.json().catch(() => ({}));
      if (!countriesRes.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load countries.");
        setCountries([]);
        return;
      }
      setCountries(Array.isArray(data.countries) ? data.countries : []);
      setTrustNote(data.trust?.note ?? null);
      if (profileRes.ok && profileData.profile && !profileData.needsIntake) {
        setProfile(profileData.profile as OpportunityProfile);
      } else {
        setProfile(null);
      }
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  const displayCountries = useMemo(() => {
    if (!profile || !personalizedOnly) return countries;
    return filterCountriesForProfile(countries, profile) as CountryCardData[];
  }, [countries, profile, personalizedOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <OpportunityOsShell
      title="Countries"
      eyebrow="Opportunity OS · Country Explorer"
      headline="Pick a country. Understand the landscape."
      subhead="Each card opens a full profile — curated public data, labeled confidence, optional AI analysis kept separate from facts."
      heroVisual={
        <div
          className="rounded-3xl h-full min-h-[200px] flex items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${KEBU.orange}22, ${KEBU.cream})`,
            border: `1px solid ${KEBU.border}`,
          }}
        >
          <div className="text-center px-6">
            <p className="text-5xl font-bold" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.orange }}>
              {loading ? "…" : countries.length}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: KEBU.muted }}>
              Live profiles
            </p>
          </div>
        </div>
      }
    >
      {profile ? (
        <div
          className="mb-8 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-4"
          style={{ background: "rgba(255,85,0,0.08)", border: `1px solid ${KEBU.border}` }}
        >
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: KEBU.orange }}>
              Your filters
            </p>
            <p className="text-sm" style={{ color: KEBU.muted }}>
              {profile.interestPaths.slice(0, 3).map((p) => p.replace(/_/g, " ")).join(" · ")}
              {profile.preferredCountryCodes.length > 0
                ? ` · ${profile.preferredCountryCodes.join(", ")}`
                : ""}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer">
            <input
              type="checkbox"
              checked={personalizedOnly}
              onChange={(e) => setPersonalizedOnly(e.target.checked)}
              className="accent-orange-500"
            />
            Match my profile
          </label>
          <Link href="/opportunity/intake" className="text-xs font-bold underline" style={{ color: KEBU.orange }}>
            Edit answers
          </Link>
        </div>
      ) : (
        <p className="text-sm mb-8 max-w-2xl" style={{ color: KEBU.muted }}>
          <Link href="/opportunity/intake" className="font-bold underline" style={{ color: KEBU.orange }}>
            Tell us about you
          </Link>{" "}
          first — then countries rank by your goals, budget, and interests (construction, grants, heritage, and more).
        </p>
      )}

      {trustNote ? (
        <p
          className="text-xs mb-8 rounded-2xl px-5 py-4 max-w-2xl"
          style={{ background: "rgba(255,255,255,0.6)", color: KEBU.black, border: `1px solid ${KEBU.border}` }}
        >
          {trustNote}
        </p>
      ) : null}

      {error ? (
        <div role="alert" className="mb-8 rounded-2xl px-5 py-4 text-sm" style={{ background: KEBU.errorBg, color: KEBU.errorText }}>
          {error}{" "}
          <button type="button" className="underline font-semibold" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-3xl min-h-[220px] animate-pulse"
              style={{ background: "linear-gradient(90deg, #f0ebe6 25%, #faf6f2 50%, #f0ebe6 75%)", backgroundSize: "200% 100%" }}
            />
          ))}
        </div>
      ) : (
        <CountryExplorerMosaic countries={displayCountries} />
      )}
    </OpportunityOsShell>
  );
}
