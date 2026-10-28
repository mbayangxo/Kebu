"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Nav } from "@/app/components/nav";
import {
  SEED_LOCAL_STARTS,
  SENEGAL_REGIONS_WITH_COORDS,
  getStartsByRegion,
  type LocalStart,
} from "@/lib/data/local-starts";
import { createClient } from "@/lib/supabase/browser";
import Link from "next/link";

const WEALTH_PATH_ICONS: Record<string, string> = {
  "Farmer / Producer": "🌾",
  "Creator / Freelancer": "💻",
  "Tech Founder": "📱",
  "Manufacturer": "🏭",
  "Exporter": "📦",
  "Fashion Brand": "👗",
  "Beauty Founder": "✨",
};

function StartCard({ start }: { start: LocalStart }) {
  const icon = WEALTH_PATH_ICONS[start.wealth_path] ?? "🌱";
  return (
    <div className="bg-white border border-border rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-deep-green/10 flex items-center justify-center text-lg flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-sm text-ink">{start.first_name}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-deep-green/10 text-deep-green">
              {start.structure}
            </span>
            {start.verified && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Verified
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-deep-green mb-1">{start.business_type}</p>
          <p className="text-xs text-muted leading-relaxed mb-2">{start.what_they_are_building}</p>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] text-muted">
              📍 {start.commune ? `${start.commune}, ` : ""}{start.region}
            </span>
            <span className="text-[10px] text-muted">
              Started {start.registered_month}
            </span>
            <span className="text-[10px] text-muted font-semibold text-deep-green">
              {start.started_with_cfa}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple text-based map of Senegal regions
function RegionMap({ startsByRegion, activeRegion, onSelect }: {
  startsByRegion: Record<string, LocalStart[]>;
  activeRegion: string | null;
  onSelect: (r: string | null) => void;
}) {
  return (
    <div className="bg-white border border-border rounded-2xl p-5 mb-6">
      <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Senegal — click a region</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SENEGAL_REGIONS_WITH_COORDS.map(({ region }) => {
          const count = startsByRegion[region]?.length ?? 0;
          const isActive = activeRegion === region;
          return (
            <button
              key={region}
              onClick={() => onSelect(isActive ? null : region)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-colors ${
                isActive
                  ? "bg-deep-green text-ivory border-deep-green"
                  : count > 0
                  ? "bg-green-50 border-green-200 text-green-900 hover:border-deep-green"
                  : "bg-warm-ivory border-border text-muted hover:border-border"
              }`}
            >
              <span className="text-xs font-semibold">{region}</span>
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-white/20 text-ivory" : "bg-green-200 text-green-900"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => onSelect(null)}
          className={`flex items-center justify-center px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
            activeRegion === null
              ? "bg-deep-green text-ivory border-deep-green"
              : "bg-white border-border text-ink hover:border-deep-green"
          }`}
        >
          All regions
        </button>
      </div>
    </div>
  );
}

type SubmitState = "idle" | "submitting" | "done" | "error";

function AddStartForm({ onSuccess }: { onSuccess: (start: LocalStart) => void }) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [wealthPath, setWealthPath] = useState("");
  const [region, setRegion] = useState("");
  const [commune, setCommune] = useState("");
  const [structure, setStructure] = useState("");
  const [startedWith, setStartedWith] = useState("");
  const [whatBuilding, setWhatBuilding] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const REGIONS = SENEGAL_REGIONS_WITH_COORDS.map(r => r.region);
  const WEALTH_PATH_FILTER_OPTIONS = Object.keys(WEALTH_PATH_ICONS);
  const STRUCTURES = ["GIE", "Auto-Entrepreneur", "SARL", "Commerçant (RC)", "Informal (planning to register)"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !businessType.trim() || !region || !whatBuilding.trim()) return;

    setSubmitState("submitting");
    const entry: LocalStart = {
      id: `start-user-${Date.now()}`,
      first_name: firstName.trim(),
      business_type: businessType.trim(),
      wealth_path: wealthPath || "Other",
      region,
      commune: commune.trim() || undefined,
      registered_month: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      structure: structure || "Not registered yet",
      started_with_cfa: startedWith.trim() || "Unknown",
      what_they_are_building: whatBuilding.trim(),
      verified: false,
    };

    try {
      const supabase = createClient();
      await supabase.from("local_starts").insert({
        ...entry,
        created_at: new Date().toISOString(),
      });
    } catch { /* table may not exist yet */ }

    setSubmitState("done");
    onSuccess(entry);
    setOpen(false);
    // reset
    setFirstName(""); setBusinessType(""); setWealthPath(""); setRegion("");
    setCommune(""); setStructure(""); setStartedWith(""); setWhatBuilding("");
    setSubmitState("idle");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-deep-green/40 text-deep-green text-sm font-bold py-4 rounded-2xl hover:border-deep-green hover:bg-deep-green/5 transition-colors"
      >
        + Add your start to the map
      </button>
    );
  }

  return (
    <div className="bg-white border border-deep-green/20 rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base font-bold text-ink">Add your start</h3>
        <button onClick={() => setOpen(false)} className="text-muted hover:text-ink text-lg">×</button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">First name *</label>
            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
              placeholder="Your first name" required
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-deep-green" />
          </div>
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">Region *</label>
            <select value={region} onChange={e => setRegion(e.target.value)} required
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-deep-green bg-white">
              <option value="">Select region</option>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-ink block mb-1.5">What type of business? *</label>
          <input type="text" value={businessType} onChange={e => setBusinessType(e.target.value)}
            placeholder="e.g. Transformation lait, Développement web, Couture"
            required
            className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-deep-green" />
        </div>

        <div>
          <label className="text-xs font-bold text-ink block mb-1.5">Describe what you are building *</label>
          <textarea value={whatBuilding} onChange={e => setWhatBuilding(e.target.value)}
            placeholder="One sentence: what you are making, who you sell to, what you have done so far"
            rows={2} required
            className="w-full text-sm border border-border rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-deep-green" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">Business structure</label>
            <select value={structure} onChange={e => setStructure(e.target.value)}
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-deep-green bg-white">
              <option value="">Select</option>
              {STRUCTURES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">Started with (CFA)</label>
            <input type="text" value={startedWith} onChange={e => setStartedWith(e.target.value)}
              placeholder="e.g. 15,000 CFA"
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-deep-green" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-ink block mb-1.5">Wealth path (closest match)</label>
          <div className="flex flex-wrap gap-1.5">
            {WEALTH_PATH_FILTER_OPTIONS.map(p => (
              <button key={p} type="button" onClick={() => setWealthPath(p)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                  wealthPath === p ? "bg-deep-green text-ivory border-deep-green" : "bg-white text-ink border-border hover:border-deep-green"
                }`}>
                {WEALTH_PATH_ICONS[p]} {p}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={submitState === "submitting"}
          className="w-full bg-deep-green text-ivory font-bold py-3 rounded-xl text-sm hover:bg-mid-green transition-colors disabled:opacity-40">
          {submitState === "submitting" ? "Adding…" : "Add to the map →"}
        </button>
        <p className="text-[10px] text-muted text-center">
          Your entry will be visible immediately and verified by our team within 48 hours.
        </p>
      </form>
    </div>
  );
}

export default function StartsPage() {
  const [starts, setStarts] = useState<LocalStart[]>(SEED_LOCAL_STARTS);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [filterPath, setFilterPath] = useState<string | null>(null);

  // Try to load from Supabase
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("local_starts")
          .select("*")
          .order("created_at", { ascending: false });
        if (data && data.length > 0) {
          setStarts([...(data as LocalStart[]), ...SEED_LOCAL_STARTS]);
        }
      } catch { /* table doesn't exist yet */ }
    }
    load();
  }, []);

  const startsByRegion = getStartsByRegion(starts);

  const filtered = starts.filter(s => {
    if (activeRegion && s.region !== activeRegion) return false;
    if (filterPath && s.wealth_path !== filterPath) return false;
    return true;
  });

  const WEALTH_PATH_FILTER_OPTIONS = Object.keys(WEALTH_PATH_ICONS);

  return (
    <div className="min-h-screen bg-warm-ivory">
      <Nav />

      {/* Hero */}
      <div className="bg-deep-green text-ivory py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">Local Starts</p>
          <div className="flex items-baseline gap-4 mb-3">
            <h1 className="font-display text-4xl font-bold">
              {starts.length}
            </h1>
            <h1 className="font-display text-2xl font-bold text-ivory/70">
              people building in Senegal
            </h1>
          </div>
          <p className="text-sm text-ivory/70 max-w-xl leading-relaxed">
            Every pin is a verified person who registered a business and started. Not a success story. A start. That is enough.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Region map */}
        <RegionMap
          startsByRegion={startsByRegion}
          activeRegion={activeRegion}
          onSelect={setActiveRegion}
        />

        {/* Wealth path filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilterPath(null)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filterPath === null
                ? "bg-deep-green text-ivory border-deep-green"
                : "bg-white text-ink border-border hover:border-deep-green"
            }`}
          >
            All paths
          </button>
          {WEALTH_PATH_FILTER_OPTIONS.map(p => (
            <button
              key={p}
              onClick={() => setFilterPath(filterPath === p ? null : p)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                filterPath === p
                  ? "bg-deep-green text-ivory border-deep-green"
                  : "bg-white text-ink border-border hover:border-deep-green"
              }`}
            >
              {WEALTH_PATH_ICONS[p]} {p}
            </button>
          ))}
        </div>

        {/* Add your start */}
        <AddStartForm onSuccess={start => setStarts(prev => [start, ...prev])} />

        {/* Results header */}
        <div className="flex items-center justify-between mb-4 mt-6">
          <p className="text-xs font-bold text-muted uppercase tracking-widest">
            {filtered.length} start{filtered.length !== 1 ? "s" : ""}
            {activeRegion ? ` in ${activeRegion}` : ""}
            {filterPath ? ` — ${filterPath}` : ""}
          </p>
          {(activeRegion || filterPath) && (
            <button
              onClick={() => { setActiveRegion(null); setFilterPath(null); }}
              className="text-xs text-deep-green hover:underline font-semibold"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Starts grid */}
        {filtered.length > 0 ? (
          <div className="space-y-3 mb-8">
            {filtered.map(start => (
              <StartCard key={start.id} start={start} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-border rounded-2xl p-8 text-center mb-8">
            <p className="text-sm text-muted">No starts in this filter yet. Be the first.</p>
          </div>
        )}

        {/* CTAs */}
        <div className="bg-deep-green text-ivory rounded-2xl p-6 text-center">
          <h3 className="font-display text-xl font-bold mb-2">Start your own chapter</h3>
          <p className="text-sm text-ivory/70 mb-4">
            Registration takes less than a day and costs less than most people think. We will show you exactly how.
          </p>
          <div className="flex gap-3">
            <Link
              href="/register/senegal"
              className="flex-1 bg-gold text-ink font-bold py-3 rounded-xl text-sm hover:bg-gold-light transition-colors text-center"
            >
              How to register →
            </Link>
            <Link
              href="/compare"
              className="flex-1 border border-ivory/20 text-ivory font-semibold py-3 rounded-xl text-sm hover:bg-white/10 transition-colors text-center"
            >
              Build vs. Leave
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
