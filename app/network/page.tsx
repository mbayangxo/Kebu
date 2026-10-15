"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/app/components/nav";
import { LanguageBar } from "@/app/components/language-bar";
import { useLocale } from "@/app/components/locale-context";
import { NETWORK_NEEDS } from "@/lib/network/types";
import { createDirectoryLoader, initialDirectoryState } from "@/lib/network/directory-loader";
import { networkT, needLabel, stageLabel, membersMatchCount } from "@/lib/network/network-i18n";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
type NetworkNeed = (typeof NETWORK_NEEDS)[number];
import Link from "next/link";

const NEEDS = NETWORK_NEEDS;

const STAGE_COLORS: Record<string, string> = {
  "Idea": "bg-warm-brown/10 text-warm-brown",
  "Early stage": "bg-royal-blue/10 text-royal-blue",
  "Growing": "bg-deep-green/10 text-deep-green",
  "Established": "bg-gold/10 text-gold-dark",
};

export default function NetworkPage() {
  const { lang } = useLocale();
  const tt = (key: Parameters<typeof networkT>[1]) => networkT(lang, key);
  const [selectedNeed, setSelectedNeed] = useState<NetworkNeed | "All">("All");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [search, setSearch] = useState("");

  const [{ profiles, loading, error, signedOut, hasMore }, setDirectory] = useState(initialDirectoryState);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const loader = createDirectoryLoader(setDirectory);
    void loader.reload();
    let unsubscribe: (() => void) | undefined;
    try {
      const { data: { subscription } } = createClient().auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        loader.sessionChanged(session?.user.id ?? null);
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      // The API still supplies an honest unavailable state when auth is unconfigured.
    }
    return () => {
      loader.dispose();
      unsubscribe?.();
    };
  }, [retry]);

  const filtered = profiles.filter((p) => {
    if (selectedNeed !== "All" && !p.looking_for.includes(selectedNeed)) return false;
    if (selectedCountry !== "All" && p.country !== selectedCountry) return false;
    const query = search.trim().toLowerCase();
    if (query && ![p.name, p.headline, p.building, p.sector, p.offering, ...p.looking_for]
      .some(value => value.toLowerCase().includes(query))) return false;
    return true;
  });

  const countries = ["All", ...Array.from(new Set(profiles.map((p) => p.country)))];

  return (
    <div className="min-h-screen bg-warm-ivory">
      <LanguageBar variant="builder" />
      <Nav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-gold bg-gold/10 px-3 py-1.5 rounded-full mb-4">
              {tt("badge_the_network")}
            </div>
            <h1 className="font-display text-3xl font-bold text-ink mb-2">
              {tt("dir_title")}
            </h1>
            <p className="text-muted text-sm max-w-xl">
              {tt("dir_intro")}
            </p>
          </div>
          <Link
            href="/network/join"
            className="flex-shrink-0 bg-deep-green text-ivory font-bold px-5 py-3 rounded-xl hover:bg-mid-green transition-colors text-sm"
          >
            {tt("nav_join_network")}
          </Link>
        </div>

        {/* Stats */}
        {!loading && !error && <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { value: String(profiles.length), label: hasMore ? tt("stat_members_shown") : tt("stat_listed_members") },
            { value: String(countries.length - 1), label: tt("stat_countries_shown") },
            { value: String(new Set(profiles.map(p => p.sector)).size), label: tt("stat_sectors_shown") },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white border border-border rounded-xl p-4 text-center">
              <p className="font-display text-2xl font-bold text-deep-green">{value}</p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>}

        {loading && <p role="status" className="mb-6 text-sm text-muted">{tt("loading_members")}</p>}
        {error && <div role="alert" className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p>{signedOut ? tt("error_signed_out_browse") : tt("error_load_failed")}</p>
          {signedOut ? <Link href="/login?next=%2Fnetwork" className="underline">{tt("link_sign_in")}</Link>
            : <button onClick={() => setRetry(value => value + 1)} className="underline">{tt("button_retry")}</button>}
        </div>}
        {/* Filters */}
        <div className="space-y-3 mb-8">
          <input aria-label={tt("aria_search_members")} type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={tt("placeholder_search")}
            className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold" />

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedNeed("All")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                selectedNeed === "All" ? "bg-deep-green text-ivory" : "bg-white border border-border text-muted hover:border-deep-green"
              }`}>
              {tt("filter_all")}
            </button>
            {NEEDS.map((need) => (
              <button key={need} onClick={() => setSelectedNeed(need)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  selectedNeed === need ? "bg-deep-green text-ivory" : "bg-white border border-border text-muted hover:border-deep-green"
                }`}>
                {tt("filter_looking_for_prefix")}{needLabel(need, lang)}
              </button>
            ))}
          </div>

          {/* value stays the canonical English country string in every language — only "All" gets a translated label */}
          <select aria-label={tt("aria_filter_country")} value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-border text-ink focus:outline-none focus:border-gold">
            {countries.map((c) => (
              <option key={c} value={c}>{c === "All" ? tt("option_all_countries") : c}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        {!loading && !error && <p role="status" className="text-xs text-muted mb-5">
          {membersMatchCount(lang, filtered.length, hasMore)}
        </p>}
        {!loading && !error && filtered.length === 0 && <p className="mb-6 text-sm text-muted">
          {profiles.length ? tt("empty_no_match_filters") : tt("empty_no_profiles_yet")}
        </p>}

        {/* Profile grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {filtered.map((profile) => (
            <div key={profile.id} className="bg-white border border-border rounded-2xl p-5 card-hover">
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-deep-green text-ivory font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {profile.initials}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink text-sm">{profile.name}</h3>
                  <p className="text-xs text-muted">{profile.location}</p>
                </div>
                {profile.stage && <span className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${STAGE_COLORS[profile.stage] || "bg-gray-100 text-gray-600"}`}>
                  {stageLabel(profile.stage, lang)}
                </span>}
              </div>

              {/* Sector + headline */}
              <p className="text-xs font-semibold text-deep-green mb-1">{profile.sector}</p>
              <p className="font-display text-base font-bold text-ink mb-2 leading-snug">
                {profile.headline}
              </p>

              {/* Building */}
              <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-2">
                {profile.building}
              </p>

              {/* What they're looking for */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-ink mb-1.5">{tt("card_looking_for_label")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.looking_for.map((need) => (
                    <span key={need} className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gold/10 text-gold-dark">
                      {needLabel(need, lang)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Offering */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-ink mb-1">{tt("card_what_they_offer_label")}</p>
                <p className="text-xs text-muted leading-relaxed line-clamp-2">{profile.offering}</p>
              </div>

              {/* Languages + connect */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex flex-wrap gap-1">
                  {profile.languages.map((spokenLanguage) => (
                    <span key={spokenLanguage} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-warm-ivory text-muted">
                      {spokenLanguage}
                    </span>
                  ))}
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* Join CTA */}
        <div className="bg-deep-green text-ivory rounded-2xl p-8 text-center">
          <h2 className="font-display text-2xl font-bold mb-2">
            {tt("cta_heading")}
          </h2>
          <p className="text-ivory/70 text-sm mb-6 max-w-md mx-auto">
            {tt("cta_body")}
          </p>
          <Link href="/network/join"
            className="inline-flex items-center gap-2 bg-gold text-deep-green font-bold px-6 py-3 rounded-xl hover:bg-gold-light transition-colors">
            {tt("button_submit_idle")}
          </Link>
        </div>
      </div>
    </div>
  );
}
