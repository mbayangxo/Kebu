"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/app/components/nav";
import { NETWORK_NEEDS } from "@/lib/network/types";
import { createDirectoryLoader, initialDirectoryState } from "@/lib/network/directory-loader";
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
  const [selectedNeed, setSelectedNeed] = useState<NetworkNeed | "All">("All");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [search, setSearch] = useState("");

  const [{ profiles, loading, error, signedOut, hasMore }, setDirectory] = useState(initialDirectoryState);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const loader = createDirectoryLoader(setDirectory);
    void loader.reload();
    const { data: { subscription } } = createClient().auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      loader.sessionChanged(session?.user.id ?? null);
    });
    return () => {
      loader.dispose();
      subscription.unsubscribe();
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
      <Nav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-gold bg-gold/10 px-3 py-1.5 rounded-full mb-4">
              THE NETWORK
            </div>
            <h1 className="font-display text-3xl font-bold text-ink mb-2">
              Who&apos;s building across Africa
            </h1>
            <p className="text-muted text-sm max-w-xl">
              Connect with founders, diaspora investors, export partners, mentors, and co-founders
              across the continent. Africa&apos;s strongest companies will be built together.
            </p>
          </div>
          <Link
            href="/network/join"
            className="flex-shrink-0 bg-deep-green text-ivory font-bold px-5 py-3 rounded-xl hover:bg-mid-green transition-colors text-sm"
          >
            Join the network
          </Link>
        </div>

        {/* Stats */}
        {!loading && !error && <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { value: String(profiles.length), label: hasMore ? "Members shown" : "Listed members" },
            { value: String(countries.length - 1), label: "Countries shown" },
            { value: String(new Set(profiles.map(p => p.sector)).size), label: "Sectors shown" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white border border-border rounded-xl p-4 text-center">
              <p className="font-display text-2xl font-bold text-deep-green">{value}</p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>}

        {loading && <p role="status" className="mb-6 text-sm text-muted">Loading members…</p>}
        {error && <div role="alert" className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p>{error}</p>
          {signedOut ? <Link href="/login?next=%2Fnetwork" className="underline">Sign in</Link>
            : <button onClick={() => setRetry(value => value + 1)} className="underline">Retry loading members</button>}
        </div>}
        {/* Filters */}
        <div className="space-y-3 mb-8">
          <input aria-label="Search members" type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by sector, what they're building, or what they need..."
            className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold" />

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedNeed("All")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                selectedNeed === "All" ? "bg-deep-green text-ivory" : "bg-white border border-border text-muted hover:border-deep-green"
              }`}>
              All
            </button>
            {NEEDS.map((need) => (
              <button key={need} onClick={() => setSelectedNeed(need)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  selectedNeed === need ? "bg-deep-green text-ivory" : "bg-white border border-border text-muted hover:border-deep-green"
                }`}>
                Looking for: {need}
              </button>
            ))}
          </div>

          <select aria-label="Filter members by country" value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-border text-ink focus:outline-none focus:border-gold">
            {countries.map((c) => (
              <option key={c} value={c}>{c === "All" ? "All countries" : c}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        {!loading && !error && <p role="status" className="text-xs text-muted mb-5">
          {filtered.length} members match your filters{hasMore ? " · Showing the latest 500 profiles" : ""}
        </p>}
        {!loading && !error && filtered.length === 0 && <p className="mb-6 text-sm text-muted">
          {profiles.length ? "No members match these filters." : "No member profiles have been listed yet. You can add yours."}
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
                  <p className="font-semibold text-ink text-sm">{profile.name}</p>
                  <p className="text-xs text-muted">{profile.location}</p>
                </div>
                {profile.stage && <span className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${STAGE_COLORS[profile.stage] || "bg-gray-100 text-gray-600"}`}>
                  {profile.stage}
                </span>}
              </div>

              {/* Sector + headline */}
              <p className="text-xs font-semibold text-deep-green mb-1">{profile.sector}</p>
              <h3 className="font-display text-base font-bold text-ink mb-2 leading-snug">
                {profile.headline}
              </h3>

              {/* Building */}
              <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-2">
                {profile.building}
              </p>

              {/* What they're looking for */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-ink mb-1.5">Looking for</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.looking_for.map((need) => (
                    <span key={need} className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gold/10 text-gold-dark">
                      {need}
                    </span>
                  ))}
                </div>
              </div>

              {/* Offering */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-ink mb-1">What they offer</p>
                <p className="text-xs text-muted leading-relaxed line-clamp-2">{profile.offering}</p>
              </div>

              {/* Languages + connect */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex flex-wrap gap-1">
                  {profile.languages.map((lang) => (
                    <span key={lang} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-warm-ivory text-muted">
                      {lang}
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
            Add your profile to the network
          </h2>
          <p className="text-ivory/70 text-sm mb-6 max-w-md mx-auto">
            Tell the community what you&apos;re building and what you need. Co-founders, investors,
            customers, and partners can discover your profile here.
          </p>
          <Link href="/network/join"
            className="inline-flex items-center gap-2 bg-gold text-deep-green font-bold px-6 py-3 rounded-xl hover:bg-gold-light transition-colors">
            Join the network →
          </Link>
        </div>
      </div>
    </div>
  );
}
