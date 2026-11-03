"use client";

import { useState } from "react";
import { Nav } from "@/app/components/nav";
import Link from "next/link";
import { AFRICA_SECTORS, COUNTRY_YOUTH_PROGRAMS, SectorOpportunity } from "@/lib/data/africa-sectors";
import { HIDDEN_OPPORTUNITIES, type HiddenOpportunity } from "@/lib/data/hidden-opportunities";
import { ResourceVideoSection } from "@/app/components/resource-video";

/** Maps a hidden-opportunity commodity to the closest /api/resource-videos query key. */
const HIDDEN_OPPORTUNITY_VIDEO_QUERY: Record<string, string> = {
  "cocoa-chocolate": "cocoa",
  "coffee": "coffee",
  "mangoes-tropical-fruit": "fruits",
  "fishing-fisheries": "fish",
  "textiles-fabric": "cotton",
  "shea-beauty-cosmetics": "skincare",
  "shea-butter": "skincare",
  "dairy-livestock": "farming",
  "cashew-nuts": "farming",
  "leather-hides": "brand",
  "palm-oil-ingredients": "farming",
  "salt": "market",
  "music-entertainment": "brand",
  "tourism": "ocean",
};

const PROBLEMS_ARE_MARKETS = [
  {
    problem: "Housing shortage",
    icon: "🏚️",
    everyone_sees: "Crisis. Overcrowding. Slums.",
    you_see: "A market. Someone has to build 50 million homes.",
    businesses: ["Construction company", "Cement & materials supply", "Architecture firm", "Pre-fab housing", "Real estate developer", "Mortgage company", "Interior design", "Plumbing & electrical"],
    example: "Julius Berger (German) wins Nigeria's biggest construction contracts. Not because Nigerians can't build — because not enough Nigerians have construction companies.",
  },
  {
    problem: "Poor transportation",
    icon: "🚗",
    everyone_sees: "Traffic jams. Broken roads. No buses.",
    you_see: "Zero logistics infrastructure = zero competition.",
    businesses: ["Logistics company", "Bus fleet operator", "Last-mile delivery", "Trucking fleet", "Ride-hailing platform", "Car rental", "Driver training school", "Vehicle maintenance"],
    example: "Kobo360 built a freight-matching platform in Nigeria and raised $30M from Goldman Sachs. Problem: trucks run empty going back. Solution: fill the return trip. That's it.",
  },
  {
    problem: "No reliable electricity",
    icon: "🔌",
    everyone_sees: "Load shedding. Generator fumes. Dark cities.",
    you_see: "600 million customers waiting for a better option.",
    businesses: ["Solar installation company", "Mini-grid developer", "Battery storage", "Generator rental", "Energy efficiency auditing", "Solar panel distribution", "Rural electrification contractor", "Power inverter import"],
    example: "Starsight Energy started with one commercial rooftop solar installation in Lagos. Now powers hospitals and data centers across West Africa.",
  },
  {
    problem: "Food is expensive & imported",
    icon: "🌽",
    everyone_sees: "Inflation. Empty shelves. Rising prices.",
    you_see: "Every import is a local product that doesn't exist yet.",
    businesses: ["Food processing company", "Cold chain logistics", "Local packaging manufacturer", "Agritech platform", "Farm input supply", "Food export company", "Restaurant supply", "Supermarket brand"],
    example: "Senegal imports 80% of its rice. Casamance grows premium rice. The gap between the rice field and the dinner table is a $350M business that doesn't exist yet.",
  },
  {
    problem: "No access to healthcare",
    icon: "🏥",
    everyone_sees: "Sick people. Dying. No hospitals.",
    you_see: "A $45B market completely underserved.",
    businesses: ["Private clinic chain", "Medical supply distribution", "Telemedicine platform", "Pharmacy chain", "Diagnostic lab network", "Health insurance product", "Medical device import", "Community health franchise"],
    example: "Africa produces less than 2% of its own medicines. The pharmacy is empty. Every drug imported is a drug you could make or distribute locally.",
  },
  {
    problem: "Unemployment",
    icon: "👥",
    everyone_sees: "Idle youth. Social risk. Wasted potential.",
    you_see: "The largest untapped workforce in human history.",
    businesses: ["Skills training company", "Staffing agency", "Apprenticeship program", "Vocational school", "Job platform", "Factory owner (employ them)", "Agricultural cooperative", "Construction company (employ them)"],
    example: "Andela hired 700 Nigerian engineers in 6 months, trained them, and placed them in global tech companies. Now worth $1.5B. They didn't create a tech product. They created trained talent.",
  },
  {
    problem: "No internet or expensive data",
    icon: "📱",
    everyone_sees: "Digital divide. Left behind.",
    you_see: "Whoever fixes this owns a continent.",
    businesses: ["WiFi hotspot network", "Community internet café chain", "Offline-first software", "SMS platform", "Local content creator", "Mobile payment agent", "Digital skills training", "USSD app developer"],
    example: "Wave built a mobile money app in Senegal with 0% transaction fees (vs Orange Money's 5–8%). They passed 1M users faster than any other African fintech. The problem was the price. The solution was obvious.",
  },
  {
    problem: "Water scarcity",
    icon: "💧",
    everyone_sees: "Drought. Thirst. Crisis.",
    you_see: "Water infrastructure and delivery as a business.",
    businesses: ["Borehole drilling company", "Water filtration & purification", "Bottled water brand", "Irrigation systems", "Water delivery service", "Rainwater harvesting", "WASH (water, sanitation, hygiene) NGO-to-business pivot", "Hydrology consulting"],
    example: "In many African cities, water delivery companies (who fill tanks in neighborhoods not served by piped water) run profitable, recession-proof businesses. The customer base never disappears.",
  },
];

const SECTORS_NAV = AFRICA_SECTORS.map(s => ({ id: s.id, label: s.sector, icon: s.sector_icon }));

type View = "overview" | "hidden" | "sectors" | "countries" | "contracts";

export default function OpportunitiesPage() {
  const [view, setView] = useState<View>("overview");
  const [activeSector, setActiveSector] = useState<string>("construction");
  const [activeCountry, setActiveCountry] = useState<string>("Senegal");
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [showAllProblems, setShowAllProblems] = useState(false);
  const [activeOpportunity, setActiveOpportunity] = useState<string>(HIDDEN_OPPORTUNITIES[0].id);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["businesses"]));

  function toggleSection(section: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  }

  const sector = AFRICA_SECTORS.find(s => s.id === activeSector)!;
  const countryPrograms = COUNTRY_YOUTH_PROGRAMS.find(c => c.country === activeCountry);

  const visibleProblems = showAllProblems ? PROBLEMS_ARE_MARKETS : PROBLEMS_ARE_MARKETS.slice(0, 4);

  return (
    <div className="min-h-screen bg-warm-ivory">
      <Nav />

      {/* ── MANIFESTO HERO ── */}
      <div className="relative bg-deep-green overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #00C851 0, #00C851 1px, transparent 0, transparent 50%)`,
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="inline-flex items-center gap-2 bg-gold/20 text-gold text-xs font-bold px-4 py-2 rounded-full mb-8 uppercase tracking-widest">
            Africa is the Opportunity
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-ivory leading-tight mb-6">
            We have the resources.<br />
            We have the youth.<br />
            We have the ideas.<br />
            <span className="text-gold">What are we waiting for?</span>
          </h1>
          <p className="text-ivory/70 text-lg sm:text-xl max-w-2xl leading-relaxed mb-8">
            Africa doesn&apos;t need charity. Africa needs builders. Engineers who build the roads.
            Farmers who process the food. Entrepreneurs who stop importing what they can make.
            Doctors who build the clinics. Developers who write the software. This is the generation that builds.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setView("hidden")}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${view === "hidden" ? "bg-gold text-deep-green" : "border border-gold/60 text-gold hover:bg-gold/10"}`}
            >
              🔍 Hidden opportunities
            </button>
            <button
              onClick={() => setView("overview")}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${view === "overview" ? "bg-gold text-deep-green" : "border border-ivory/30 text-ivory hover:bg-ivory/10"}`}
            >
              The opportunity map
            </button>
            <button
              onClick={() => setView("sectors")}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${view === "sectors" ? "bg-gold text-deep-green" : "border border-ivory/30 text-ivory hover:bg-ivory/10"}`}
            >
              By sector
            </button>
            <button
              onClick={() => setView("countries")}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${view === "countries" ? "bg-gold text-deep-green" : "border border-ivory/30 text-ivory hover:bg-ivory/10"}`}
            >
              Country programs
            </button>
            <button
              onClick={() => setView("contracts")}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${view === "contracts" ? "bg-gold text-deep-green" : "border border-ivory/30 text-ivory hover:bg-ivory/10"}`}
            >
              Indigenous contracts
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="bg-ink text-ivory">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {[
            { stat: "1.4B", label: "People, 54 countries" },
            { stat: "$68B", label: "Annual infrastructure gap" },
            { stat: "600M", label: "Without reliable power" },
            { stat: "$50B", label: "Food imported annually" },
          ].map(({ stat, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-2xl font-bold text-gold">{stat}</p>
              <p className="text-xs text-ivory/60 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* ── VIEW: HIDDEN OPPORTUNITIES ── */}
        {view === "hidden" && (
          <div>
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-gold uppercase tracking-widest mb-3">
                Hidden in plain sight
              </div>
              <h2 className="font-display text-3xl font-bold text-ink mb-3">
                What's already on your land — and who's profiting from it.
              </h2>
              <p className="text-muted text-base leading-relaxed max-w-2xl">
                Africa produces the raw materials for the world's most profitable industries. The leather for Louis Vuitton. The cocoa for Nestlé. The shea for L'Oréal. The coffee for Starbucks. The fish for European supermarkets. The raw material leaves Africa. The money stays in Europe. These pages show you what's happening — and what you can build instead.
              </p>
            </div>

            {/* Commodity selector */}
            <div className="flex flex-wrap gap-2 mb-8">
              {HIDDEN_OPPORTUNITIES.map((opp) => (
                <button
                  key={opp.id}
                  onClick={() => setActiveOpportunity(opp.id)}
                  className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${
                    activeOpportunity === opp.id
                      ? "bg-deep-green text-ivory border-deep-green"
                      : "bg-white border-border text-ink hover:border-deep-green"
                  }`}
                >
                  <span>{opp.emoji}</span>
                  <span>{opp.commodity}</span>
                </button>
              ))}
            </div>

            {/* Active commodity detail */}
            {(() => {
              const opp = HIDDEN_OPPORTUNITIES.find(o => o.id === activeOpportunity);
              if (!opp) return null;
              return (
                <div className="space-y-5">
                  {/* Header */}
                  <div className="bg-deep-green text-ivory rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl">{opp.emoji}</span>
                      <div>
                        <h3 className="font-display text-2xl font-bold text-ivory">{opp.commodity}</h3>
                        <p className="text-ivory/60 text-sm">{opp.countries.join(" · ")}</p>
                      </div>
                    </div>
                    <p className="text-ivory/85 text-sm leading-relaxed">{opp.the_truth}</p>
                  </div>

                  {/* Resource footage */}
                  <ResourceVideoSection
                    title={`${opp.commodity} — on the ground`}
                    query={HIDDEN_OPPORTUNITY_VIDEO_QUERY[opp.id] ?? "market"}
                    count={2}
                    layout="strip"
                  />

                  {/* What exists */}
                  <div className="bg-white border border-border rounded-2xl p-6">
                    <p className="text-xs font-bold text-deep-green uppercase tracking-widest mb-2">What already exists in Africa</p>
                    <p className="text-sm text-ink/80 leading-relaxed">{opp.what_exists}</p>
                  </div>

                  {/* Who profits */}
                  <div className="bg-red-earth/10 border border-red-earth/20 rounded-2xl p-6">
                    <p className="text-xs font-bold text-red-earth uppercase tracking-widest mb-2">Who is currently profiting</p>
                    <p className="text-sm text-ink/70 leading-relaxed">{opp.who_profits}</p>
                    <div className="mt-3 pt-3 border-t border-red-earth/30">
                      <p className="text-xs font-bold text-red-earth">Annual market size:</p>
                      <p className="text-sm text-ink/70 mt-1">{opp.annual_value}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-red-earth/30">
                      <p className="text-xs font-bold text-red-earth">The value gap:</p>
                      <p className="text-sm text-ink/70 mt-1">{opp.the_gap}</p>
                    </div>
                  </div>

                  {/* Businesses to build */}
                  <div className="bg-white border border-border rounded-2xl p-6">
                    <p className="text-xs font-bold text-deep-green uppercase tracking-widest mb-4">Businesses you can build</p>
                    <div className="space-y-3">
                      {opp.businesses_to_build.map((biz) => (
                        <div key={biz.name} className="flex items-start gap-3 p-3 bg-deep-green/5 rounded-xl">
                          <div className="w-5 h-5 rounded-full bg-deep-green text-ivory text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">→</div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-bold text-sm text-ink">{biz.name}</p>
                              <span className="text-xs font-semibold text-gold-dark bg-gold/15 px-2 py-0.5 rounded-full">{biz.startup_cost}</span>
                            </div>
                            <p className="text-xs text-muted leading-relaxed">{biz.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Two columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="bg-white border border-border rounded-2xl p-5">
                      <p className="text-xs font-bold text-deep-green uppercase tracking-widest mb-2">Where to sell</p>
                      <p className="text-sm text-ink/80 leading-relaxed">{opp.markets}</p>
                    </div>
                    <div className="bg-white border border-border rounded-2xl p-5">
                      <p className="text-xs font-bold text-deep-green uppercase tracking-widest mb-2">Africans already doing it</p>
                      <p className="text-sm text-ink/80 leading-relaxed">{opp.africans_doing_it}</p>
                    </div>
                  </div>

                  {/* Historical note */}
                  <div className="bg-gold/10 border border-gold/30 rounded-2xl p-6">
                    <p className="text-xs font-bold text-ink uppercase tracking-widest mb-2">Our history in this sector</p>
                    <p className="text-sm text-ink/70 leading-relaxed">{opp.historical_note}</p>
                  </div>

                  {/* First step */}
                  <div className="bg-deep-green rounded-2xl p-6 text-center">
                    <p className="text-xs font-bold text-gold uppercase tracking-widest mb-3">Start today</p>
                    <p className="text-ivory text-sm leading-relaxed mb-5">{opp.first_step}</p>
                    <Link
                      href="/build"
                      className="inline-block bg-gold text-deep-green font-bold px-6 py-3 rounded-xl text-sm hover:bg-gold-light transition-colors"
                    >
                      Build a business plan around this →
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── VIEW: OVERVIEW (Problems = Opportunities) ── */}
        {view === "overview" && (
          <div>
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-gold uppercase tracking-widest mb-3">
                The mindset shift
              </div>
              <h2 className="font-display text-3xl font-bold text-ink mb-3">
                The problem is the business.
              </h2>
              <p className="text-muted text-base leading-relaxed max-w-2xl">
                In Africa, the most visible problems are also the most visible markets.
                Every housing shortage is a construction company waiting to be born.
                Every broken road is a logistics startup. Every expensive import is a local manufacturer.
                Stop seeing the crisis. Start seeing the client.
              </p>
            </div>

            <div className="space-y-5">
              {visibleProblems.map((item) => (
                <div key={item.problem} className="bg-white border border-border rounded-2xl overflow-hidden">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <span className="text-3xl flex-shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <h3 className="font-display text-xl font-bold text-ink mb-1">{item.problem}</h3>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="text-muted"><span className="font-semibold">Everyone sees:</span> {item.everyone_sees}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-deep-green/5 border border-deep-green/15 rounded-xl p-4 mb-4">
                      <p className="text-sm font-bold text-deep-green mb-0.5">You see →</p>
                      <p className="text-sm text-deep-green/90 font-medium">{item.you_see}</p>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Businesses you can build from this problem</p>
                      <div className="flex flex-wrap gap-2">
                        {item.businesses.map((b) => (
                          <span key={b} className="text-xs bg-gold/10 text-gold-dark border border-gold/20 px-3 py-1 rounded-full font-medium">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-border pt-3">
                      <p className="text-xs text-muted italic leading-relaxed">{item.example}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!showAllProblems && (
              <button
                onClick={() => setShowAllProblems(true)}
                className="mt-4 w-full py-3 border border-border rounded-2xl text-sm font-semibold text-muted hover:border-deep-green hover:text-deep-green transition-colors"
              >
                Show {PROBLEMS_ARE_MARKETS.length - 4} more opportunities →
              </button>
            )}

            {/* For who section */}
            <div className="mt-10 bg-deep-green text-ivory rounded-2xl p-6 sm:p-8">
              <h3 className="font-display text-2xl font-bold mb-2">This is for you.</h3>
              <p className="text-ivory/70 mb-6 leading-relaxed">
                Modern Africa needs every type of builder. Here&apos;s what your role looks like in the new economy.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { who: "Farmers", what: "Process, package, export. A Senegalese farmer who dries and packages moringa earns 20× more than one who sells fresh leaves." },
                  { who: "Builders", what: "Government contracts are waiting. Register your company. Learn to bid. Win public housing projects." },
                  { who: "Engineers", what: "Africa has a critical shortage of engineers who own engineering firms — not just engineers who work for foreign firms." },
                  { who: "Doctors", what: "Build the clinic network. Start a diagnostic lab chain. Launch the telemedicine platform. You know the problem better than any foreign investor." },
                  { who: "Architects", what: "Pre-fab, CEB (compressed earth blocks), climate-adapted design — Africa needs an architecture that is its own." },
                  { who: "Developers", what: "African governments are buying local software. Healthcare apps, tax platforms, agricultural databases. Your code should run Africa." },
                  { who: "Factory Workers", what: "You know the process. Start the cooperative. Buy the machine with 5 colleagues. Own the output, not just the labor." },
                  { who: "Solar Technicians", what: "600 million people with no electricity. Rural concessions sit unclaimed because no local company applied. Be that company." },
                  { who: "Entrepreneurs", what: "Stop importing what you can make. Every import is a business that doesn't exist yet. That gap is yours to fill." },
                  { who: "Youth 18–35", what: "DER/FJ, TEF, NYIF, Hustler Fund, YouStart — your government is looking for you. Apply." },
                  { who: "Diaspora", what: "The capital, the skills, and the network you built abroad are exactly what the continent needs. Invest, build, return." },
                  { who: "Women", what: "AFAWA, AWIEF, She Leads Africa, 3× Women — dedicated capital for women-owned businesses exists and goes unclaimed." },
                ].map(({ who, what }) => (
                  <div key={who} className="bg-ivory/5 rounded-xl p-4">
                    <p className="text-gold font-bold text-sm mb-2">{who}</p>
                    <p className="text-ivory/70 text-xs leading-relaxed">{what}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW: SECTORS ── */}
        {view === "sectors" && (
          <div>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-ink mb-2">Choose your sector</h2>
              <p className="text-muted text-sm">Real programs, real contracts, real entry points.</p>
            </div>

            {/* Sector tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {SECTORS_NAV.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSector(s.id)}
                  className={`px-3 py-2 rounded-full text-xs font-bold border transition-all ${
                    activeSector === s.id
                      ? "bg-deep-green text-ivory border-deep-green"
                      : "bg-white text-ink border-border hover:border-deep-green"
                  }`}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            {/* Sector detail */}
            <div className="space-y-5">
              {/* Hero */}
              <div className="bg-deep-green text-ivory rounded-2xl p-6">
                <div className="text-4xl mb-3">{sector.sector_icon}</div>
                <h3 className="font-display text-2xl font-bold mb-2">{sector.sector}</h3>
                <p className="text-gold font-semibold mb-3">&ldquo;{sector.tagline}&rdquo;</p>
                <p className="text-ivory/80 leading-relaxed text-sm mb-4">{sector.the_truth}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gold/20 text-gold px-3 py-1 rounded-full font-semibold">{sector.market_size}</span>
                </div>
              </div>

              {/* For who */}
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-xs font-bold text-muted uppercase tracking-wide mb-3">This is for</p>
                <div className="flex flex-wrap gap-2">
                  {sector.for_who.map((w) => (
                    <span key={w} className="text-xs bg-gold/10 text-gold-dark border border-gold/20 px-3 py-1 rounded-full font-medium">
                      {w}
                    </span>
                  ))}
                </div>
              </div>

              {/* Programs */}
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-xs font-bold text-muted uppercase tracking-wide mb-4">Funding programs & government support</p>
                <div className="space-y-3">
                  {sector.programs.map((prog, i) => {
                    const key = `${sector.id}-prog-${i}`;
                    const open = expandedProgram === key;
                    return (
                      <div key={i} className="border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedProgram(open ? null : key)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-warm-ivory transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[10px] font-bold bg-deep-green/10 text-deep-green px-2 py-0.5 rounded-full flex-shrink-0">
                              {prog.country}
                            </span>
                            {prog.indigenous_only && (
                              <span className="text-[10px] font-bold bg-gold/15 text-gold-dark px-2 py-0.5 rounded-full flex-shrink-0">
                                Indigenous only
                              </span>
                            )}
                            <span className="font-semibold text-sm text-ink truncate">{prog.name}</span>
                          </div>
                          <span className="text-muted text-lg ml-2 flex-shrink-0">{open ? "−" : "+"}</span>
                        </button>
                        {open && (
                          <div className="px-4 pb-4 space-y-3">
                            <p className="text-sm text-ink leading-relaxed">{prog.what_it_is}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="bg-warm-ivory rounded-xl p-3">
                                <p className="text-[10px] font-bold text-muted uppercase mb-1">For who</p>
                                <p className="text-xs text-ink">{prog.for_who}</p>
                              </div>
                              <div className="bg-warm-ivory rounded-xl p-3">
                                <p className="text-[10px] font-bold text-muted uppercase mb-1">How much</p>
                                <p className="text-xs text-ink font-semibold">{prog.how_much}</p>
                              </div>
                            </div>
                            <div className="bg-gold/10 border border-gold/20 rounded-xl p-3">
                              <p className="text-[10px] font-bold text-gold-dark uppercase mb-1">How to apply</p>
                              <p className="text-xs text-ink">{prog.how_to_apply}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Entry points */}
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-xs font-bold text-muted uppercase tracking-wide mb-4">Start from where you are</p>
                <div className="space-y-3">
                  {sector.entry_points.map((ep, i) => (
                    <div key={i} className="border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold bg-deep-green text-ivory px-2 py-0.5 rounded-full">{ep.budget}</span>
                      </div>
                      <p className="text-sm text-ink mb-2"><span className="font-semibold">Start here:</span> {ep.start_here}</p>
                      <p className="text-xs text-muted"><span className="font-semibold">First contract:</span> {ep.first_contract}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* African winner */}
              {sector.african_winner && (
                <div className="bg-gold/10 border border-gold/20 rounded-2xl p-5">
                  <p className="text-xs font-bold text-gold uppercase tracking-wide mb-2">Proof it works</p>
                  <p className="text-sm text-ink leading-relaxed">{sector.african_winner}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VIEW: COUNTRY PROGRAMS ── */}
        {view === "countries" && (
          <div>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-ink mb-2">Programs your government is running right now</h2>
              <p className="text-muted text-sm">These aren&apos;t rumours. These are real programs with real money. Apply.</p>
            </div>

            {/* Country tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {COUNTRY_YOUTH_PROGRAMS.map((c) => (
                <button
                  key={c.country}
                  onClick={() => setActiveCountry(c.country)}
                  className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                    activeCountry === c.country
                      ? "bg-deep-green text-ivory border-deep-green"
                      : "bg-white text-ink border-border hover:border-deep-green"
                  }`}
                >
                  {c.flag} {c.country}
                </button>
              ))}
            </div>

            {countryPrograms && (
              <div className="space-y-4">
                {countryPrograms.programs.map((prog, i) => (
                  <div key={i} className="bg-white border border-border rounded-2xl overflow-hidden">
                    <div className="bg-deep-green/5 border-b border-border p-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-ink text-base">{prog.name}</h3>
                        <p className="text-xs text-muted mt-0.5">{prog.who}</p>
                      </div>
                      <span className="text-xs font-bold bg-deep-green text-ivory px-2.5 py-1 rounded-full flex-shrink-0">{prog.amount}</span>
                    </div>
                    <div className="p-5 space-y-4">
                      <p className="text-sm text-ink leading-relaxed">{prog.what}</p>

                      <div className="flex flex-wrap gap-1.5">
                        {prog.sectors.map((s) => (
                          <span key={s} className="text-[10px] bg-warm-ivory text-muted border border-border px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>

                      <div className="bg-gold/10 border border-gold/20 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-gold-dark uppercase mb-1">Apply at</p>
                        <p className="text-xs text-ink font-mono">{prog.apply_at}</p>
                      </div>

                      {prog.indigenous_note && (
                        <div className="bg-gold/10 border border-gold/30 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-gold-dark uppercase mb-1">Indigenous note</p>
                          <p className="text-xs text-gold-dark leading-relaxed">{prog.indigenous_note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: INDIGENOUS CONTRACTS ── */}
        {view === "contracts" && (
          <div>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-ink mb-2">Government contracts for indigenous African businesses</h2>
              <p className="text-muted text-sm leading-relaxed max-w-2xl">
                These contracts exist. They&apos;re meant for you. The problem isn&apos;t that the government doesn&apos;t want to give them to Africans —
                it&apos;s that there aren&apos;t enough organized African businesses bidding for them. Here&apos;s what&apos;s available and exactly how to get in.
              </p>
            </div>

            <div className="bg-gold/10 border border-gold/30 rounded-2xl p-5 mb-6">
              <p className="text-sm font-bold text-gold-dark mb-2">Why do foreign companies win these contracts?</p>
              <p className="text-sm text-ink leading-relaxed">
                Not because they&apos;re better. Because they applied. A Chinese company wins a Senegalese road contract not because Senegalese engineers can&apos;t build roads —
                but because not enough Senegalese companies submitted bids. The first step isn&apos;t skill. It&apos;s forming a company and showing up.
              </p>
            </div>

            <div className="space-y-5">
              {AFRICA_SECTORS.flatMap(sector =>
                sector.indigenous_contracts.map((contract, i) => ({
                  sectorName: sector.sector,
                  sectorIcon: sector.sector_icon,
                  sectorId: sector.id,
                  contract,
                  key: `${sector.id}-${i}`
                }))
              ).map(({ sectorName, sectorIcon, contract, key }) => (
                <div key={key} className="bg-white border border-border rounded-2xl overflow-hidden">
                  <div className="bg-deep-green text-ivory p-4 flex items-center gap-3">
                    <span className="text-xl">{sectorIcon}</span>
                    <div>
                      <p className="font-bold text-sm">{contract.country} — {sectorName}</p>
                      <p className="text-xs text-ivory/60">{contract.who_qualifies.split('—')[0].trim()}</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">What they&apos;re looking for</p>
                      <p className="text-sm text-ink leading-relaxed">{contract.what_they_want}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-red-earth/10 border border-red-earth/20 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-red-earth uppercase mb-1">Why it goes abroad now</p>
                        <p className="text-xs text-red-earth leading-relaxed">{contract.current_gap}</p>
                      </div>
                      <div className="bg-light-green/10 border border-light-green/20 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-mid-green uppercase mb-1">The opportunity</p>
                        <p className="text-xs text-mid-green leading-relaxed">{contract.the_opportunity}</p>
                      </div>
                    </div>
                    <div className="bg-gold/10 border border-gold/20 rounded-xl p-4">
                      <p className="text-[10px] font-bold text-gold-dark uppercase mb-1">How to position yourself</p>
                      <p className="text-sm text-ink leading-relaxed">{contract.how_to_position}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-8 bg-deep-green text-ivory rounded-2xl p-6 text-center">
              <h3 className="font-display text-xl font-bold mb-2">Ready to bid for your first contract?</h3>
              <p className="text-ivory/70 text-sm mb-5">Use our AI coach to find the right program and map your exact path to the contract.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/path" className="bg-gold text-deep-green font-bold px-6 py-2.5 rounded-full text-sm hover:bg-gold/90 transition-colors">
                  Build my roadmap →
                </Link>
                <Link href="/assistant" className="border border-ivory/30 text-ivory font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-ivory/10 transition-colors">
                  Ask the AI coach
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
