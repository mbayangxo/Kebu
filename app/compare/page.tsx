"use client";

import { useState, useRef } from "react";
import { Nav } from "@/app/components/nav";
import { getMigrationData, type MigrationRoute, type WealthPathLocal } from "@/lib/data/migration-data";
import Link from "next/link";

const WEALTH_PATH_LABELS = [
  "Farmer / Producer",
  "Creator / Freelancer",
  "Tech Founder",
  "Manufacturer",
  "Exporter",
  "Fashion Brand",
  "Beauty Founder",
];

function ShareButton({ wealthPath, localPath, route }: {
  wealthPath: string;
  localPath: WealthPathLocal;
  route: MigrationRoute;
}) {
  const [copied, setCopied] = useState(false);

  const shareText = `📊 COMPARE: Quitter le Sénégal vs Construire ici (${wealthPath})

🚢 Route migration (${route.name}):
• Coût: ${route.cost_cfa}
• Taux de mortalité: ${route.death_rate}
• Stabilité en 5 ans: ${route.probability_stable_in_5y}
• Temps avant travail stable: ${route.arrival_to_stable_income}

🌱 Démarrer ici (${localPath.structure}):
• Inscription: ${localPath.start_cost_cfa}
• Premier revenu: ${localPath.first_income_timeline}
• Revenus réalistes an 1: ${localPath.realist_year1_cfa}
• En 5 ans: ${localPath.realist_5year}

Compare toi-même → kebu.app/compare`;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch { /* user cancelled */ }
    }
    // fallback: copy
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      onClick={share}
      className="w-full bg-deep-green text-ivory font-bold py-4 rounded-xl hover:bg-mid-green transition-colors text-sm"
    >
      {copied ? "Copied — paste into WhatsApp" : "Share on WhatsApp →"}
    </button>
  );
}

function RouteCard({ route }: { route: MigrationRoute }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-red-950 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold text-red-earth/60 uppercase tracking-widest mb-1">Leave route</p>
            <h3 className="font-display text-lg font-bold text-white">{route.name}</h3>
            <p className="text-xs text-red-300 mt-0.5">Destination: {route.destination}</p>
          </div>
          <span className="text-2xl">⚠️</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-red-900/60 rounded-xl p-3">
            <p className="text-[10px] text-red-earth/60 font-semibold uppercase tracking-wide mb-1">Fixer cost</p>
            <p className="text-sm font-bold text-white">{route.cost_cfa}</p>
            <p className="text-xs text-red-300">{route.cost_usd}</p>
          </div>
          <div className="bg-red-900/60 rounded-xl p-3">
            <p className="text-[10px] text-red-earth/60 font-semibold uppercase tracking-wide mb-1">Death rate</p>
            <p className="text-sm font-bold text-red-300">{route.death_rate}</p>
          </div>
          <div className="bg-red-900/60 rounded-xl p-3">
            <p className="text-[10px] text-red-earth/60 font-semibold uppercase tracking-wide mb-1">Stable in 5 years</p>
            <p className="text-sm font-bold text-white">{route.probability_stable_in_5y}</p>
          </div>
          <div className="bg-red-900/60 rounded-xl p-3">
            <p className="text-[10px] text-red-earth/60 font-semibold uppercase tracking-wide mb-1">Papers timeline</p>
            <p className="text-sm font-bold text-white leading-tight">{route.arrival_to_papers}</p>
          </div>
        </div>

        <div className="bg-red-900/40 rounded-xl p-3 mb-3">
          <p className="text-xs text-red-300 font-semibold mb-1">What happens to most people</p>
          <p className={`text-xs text-red-200 leading-relaxed ${!expanded ? "line-clamp-3" : ""}`}>
            {route.what_happens_to_most}
          </p>
          {!expanded && (
            <button onClick={() => setExpanded(true)} className="text-[10px] text-red-earth/60 hover:text-red-300 mt-1 font-semibold">
              Read more
            </button>
          )}
        </div>

        <div className="border-t border-red-800 pt-3">
          <p className="text-[10px] text-red-500 leading-relaxed">{route.death_context}</p>
          <p className="text-[9px] text-red-earth mt-1.5">Sources: {route.sources.join(" · ")}</p>
        </div>
      </div>
    </div>
  );
}

function BuildCard({ path, countryCode }: { path: WealthPathLocal; countryCode: string }) {
  return (
    <div className="bg-deep-green rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold text-gold uppercase tracking-widest mb-1">Build here</p>
            <h3 className="font-display text-lg font-bold text-ivory">{path.path}</h3>
            <p className="text-xs text-ivory/60 mt-0.5">Structure: {path.structure}</p>
          </div>
          <span className="text-2xl">🌱</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-[10px] text-gold font-semibold uppercase tracking-wide mb-1">Start cost</p>
            <p className="text-sm font-bold text-ivory">{path.start_cost_cfa}</p>
            <p className="text-xs text-ivory/60">{path.start_cost_usd}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-[10px] text-gold font-semibold uppercase tracking-wide mb-1">First income</p>
            <p className="text-sm font-bold text-ivory leading-tight">{path.first_income_timeline}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-[10px] text-gold font-semibold uppercase tracking-wide mb-1">Year 1 realistic</p>
            <p className="text-sm font-bold text-gold leading-tight">{path.realist_year1_cfa}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-[10px] text-gold font-semibold uppercase tracking-wide mb-1">Year 2 realistic</p>
            <p className="text-sm font-bold text-gold leading-tight">{path.realist_year2_cfa}</p>
          </div>
        </div>

        <div className="bg-white/10 rounded-xl p-3 mb-3">
          <p className="text-xs text-ivory/70 font-semibold mb-1">After 5 years</p>
          <p className="text-xs text-ivory/90 leading-relaxed">{path.realist_5year}</p>
        </div>

        <div className="bg-white/10 rounded-xl p-3 mb-3">
          <p className="text-xs text-ivory/70 font-semibold mb-1">Loan access</p>
          <p className="text-xs text-ivory/80 leading-relaxed">{path.loan_access}</p>
        </div>

        <div className="mb-3">
          <p className="text-[10px] text-ivory/60 font-semibold uppercase tracking-wide mb-2">Programs you can access</p>
          <ul className="space-y-1">
            {path.key_programs.map((prog, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-ivory/80">
                <span className="text-gold mt-0.5 flex-shrink-0">→</span>
                {prog}
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-4">
          <p className="text-[10px] text-ivory/60 font-semibold uppercase tracking-wide mb-2">Real risks</p>
          <ul className="space-y-1">
            {path.risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-ivory/70">
                <span className="text-gold mt-0.5 flex-shrink-0">·</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href={`/register/senegal${path.register_link.split("/register/senegal")[1] || ""}`}
          className="block w-full text-center bg-gold text-ink font-bold py-3 rounded-xl text-sm hover:bg-gold-light transition-colors"
        >
          How to register →
        </Link>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [selectedPath, setSelectedPath] = useState<string>("Farmer / Producer");
  const [selectedRoute, setSelectedRoute] = useState<number>(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const data = getMigrationData("SN");
  if (!data) return null;

  const localPath = data.local_wealth_paths.find(p => p.path === selectedPath);
  const route = data.migration_routes[selectedRoute];

  function handleSelect(path: string) {
    setSelectedPath(path);
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  return (
    <div className="min-h-screen bg-warm-ivory">
      <Nav />

      {/* Hero */}
      <div className="bg-deep-green text-ivory py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">Build vs. Leave</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4 leading-tight">
            The real comparison nobody is showing you
          </h1>
          <p className="text-sm text-ivory/70 max-w-xl mx-auto leading-relaxed">
            Real statistics. Real costs. Real timelines. What it actually takes to go — and what it takes to build here instead.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Context note */}
        <div className="bg-gold/10 border border-gold/20 rounded-2xl p-5 mb-8">
          <p className="text-sm text-ink leading-relaxed">{data.comparison_note}</p>
        </div>

        {/* Wealth path selector */}
        <div className="mb-8">
          <h2 className="font-display text-xl font-bold text-ink mb-2">What kind of business would you build?</h2>
          <p className="text-xs text-muted mb-4">Select the path that fits you — the comparison adjusts to show your specific starting position.</p>
          <div className="flex flex-wrap gap-2">
            {WEALTH_PATH_LABELS.map(p => (
              <button
                key={p}
                onClick={() => handleSelect(p)}
                className={`text-xs font-semibold px-3 py-2 rounded-full border transition-colors ${
                  selectedPath === p
                    ? "bg-deep-green text-ivory border-deep-green"
                    : "bg-white text-ink border-border hover:border-deep-green hover:text-deep-green"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Route selector */}
        <div className="mb-8">
          <h2 className="font-display text-xl font-bold text-ink mb-2">Which route are they talking about?</h2>
          <div className="flex gap-2">
            {data.migration_routes.map((r, i) => (
              <button
                key={i}
                onClick={() => setSelectedRoute(i)}
                className={`flex-1 text-xs font-semibold px-3 py-2 rounded-full border transition-colors ${
                  selectedRoute === i
                    ? "bg-red-900 text-white border-red-900"
                    : "bg-white text-ink border-border hover:border-red-600 hover:text-red-earth"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>

        {/* Comparison cards */}
        {localPath && route && (
          <div ref={resultRef} className="space-y-4 mb-8">
            <RouteCard route={route} />
            <BuildCard path={localPath} countryCode="SN" />

            {/* Share */}
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="font-display text-base font-bold text-ink mb-2">Share this comparison</h3>
              <p className="text-xs text-muted mb-4">
                Migration recruiters share their numbers every day on WhatsApp. Share the full picture.
              </p>
              <ShareButton wealthPath={selectedPath} localPath={localPath} route={route} />
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="bg-deep-green text-ivory rounded-2xl p-6 text-center">
          <h3 className="font-display text-xl font-bold mb-2">Ready to start?</h3>
          <p className="text-sm text-ivory/70 mb-4">
            The registration steps are simpler than most people think. Some paths take as little as one day.
          </p>
          <div className="flex gap-3">
            <Link
              href="/register/senegal"
              className="flex-1 bg-gold text-ink font-bold py-3 rounded-xl text-sm hover:bg-gold-light transition-colors text-center"
            >
              How to register →
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 border border-ivory/20 text-ivory font-semibold py-3 rounded-xl text-sm hover:bg-white/10 transition-colors text-center"
            >
              Find programs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
