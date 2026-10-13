"use client";

import { useState } from "react";
import { Nav } from "@/app/components/nav";
import { NETWORK_PROFILES, NetworkNeed } from "@/lib/data/network-profiles";
import Link from "next/link";

const NEEDS: NetworkNeed[] = [
  "Co-founder", "Investor", "Customers", "Supplier", "Mentor",
  "Partner", "Team member", "Diaspora connection", "Export partner",
];

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

  const filtered = NETWORK_PROFILES.filter((p) => {
    if (selectedNeed !== "All" && !p.looking_for.includes(selectedNeed)) return false;
    if (selectedCountry !== "All" && p.country !== selectedCountry) return false;
    if (search && !p.headline.toLowerCase().includes(search.toLowerCase()) &&
        !p.building.toLowerCase().includes(search.toLowerCase()) &&
        !p.sector.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const countries = ["All", ...Array.from(new Set(NETWORK_PROFILES.map((p) => p.country)))];

  return (
    <div className="min-h-screen bg-warm-ivory">
      <Nav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-gold bg-gold/10 px-3 py-1.5 rounded-full mb-4">
              THE NETWORK
            </div>
            <h1 className="font-display text-3xl font-bold text-ink mb-2">
              Who&apos;s building across Africa
            </h1>
            <p className="text-muted text-sm max-w-xl">
              Explore an illustrative directory layout. Profiles shown here are examples, not verified members or live connections.
            </p>
          </div>
          <Link
            href="/network/join"
            className="flex-shrink-0 bg-deep-green text-ivory font-bold px-5 py-3 rounded-xl hover:bg-mid-green transition-colors text-sm"
          >
            Join the network
          </Link>
        </div>

        <p role="status" className="mb-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-ink">Preview data only — this directory does not yet display verified live members. Do not use these profiles to make contact or business decisions.</p>

        {/* Preview summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { value: `${NETWORK_PROFILES.length}`, label: "Example profiles" },
            { value: `${new Set(NETWORK_PROFILES.map((p) => p.country)).size}`, label: "Example countries" },
            { value: `${new Set(NETWORK_PROFILES.map((p) => p.sector)).size}`, label: "Example sectors" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white border border-border rounded-xl p-4 text-center">
              <p className="font-display text-2xl font-bold text-deep-green">{value}</p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-8">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
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

          <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-border text-ink focus:outline-none focus:border-gold">
            {countries.map((c) => (
              <option key={c} value={c}>{c === "All" ? "All countries" : c}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <p className="text-xs text-muted mb-5">{filtered.length} example profiles match your filters</p>

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
                <span className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${STAGE_COLORS[profile.stage] || "bg-gray-100 text-gray-600"}`}>
                  {profile.stage}
                </span>
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
                <Link href="/assistant"
                  className="text-xs font-semibold text-deep-green hover:text-gold transition-colors">
                  Connect →
                </Link>
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
            customers, and partners are already here.
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
