"use client";

import { useState } from "react";
import { Nav } from "@/app/components/nav";
import { AiEngineDisclaimer } from "@/app/components/ai-engine-disclaimer";

const PROCUREMENT_PORTALS = [
  // Pan-African / UN
  { country: "UN System (40+ countries)", name: "UNGM — UN Global Marketplace", url: "https://www.ungm.org", flag: "🌍", region: "Pan-African" },
  // West Africa
  { country: "Nigeria", name: "Bureau of Public Procurement", url: "https://www.bpp.gov.ng", flag: "🇳🇬", region: "West Africa" },
  { country: "Ghana", name: "Public Procurement Authority", url: "https://www.ppaghana.org", flag: "🇬🇭", region: "West Africa" },
  { country: "Senegal", name: "ARMP — Marchés Publics", url: "https://www.dcmp.gouv.sn", flag: "🇸🇳", region: "West Africa" },
  { country: "Côte d'Ivoire", name: "Marchés Publics de Côte d'Ivoire", url: "https://www.marchespublics.ci", flag: "🇨🇮", region: "West Africa" },
  { country: "Cameroon", name: "ARMP Cameroun", url: "https://www.armp.cm", flag: "🇨🇲", region: "West Africa" },
  { country: "Mali", name: "DGMP — Direction Générale", url: "https://www.dgmp.gouv.ml", flag: "🇲🇱", region: "West Africa" },
  { country: "Burkina Faso", name: "DGCMEF Marchés Publics", url: "https://www.dgcmef.gov.bf", flag: "🇧🇫", region: "West Africa" },
  { country: "Guinea", name: "Marchés Publics Guinée", url: "https://www.marchespublics.gov.gn", flag: "🇬🇳", region: "West Africa" },
  { country: "Benin", name: "ARMP Bénin", url: "https://www.armp.bj", flag: "🇧🇯", region: "West Africa" },
  { country: "Togo", name: "ARMP Togo", url: "https://www.armp.tg", flag: "🇹🇬", region: "West Africa" },
  { country: "Sierra Leone", name: "NPPA Sierra Leone", url: "https://www.nppa.gov.sl", flag: "🇸🇱", region: "West Africa" },
  { country: "Liberia", name: "PPCC Liberia", url: "https://www.ppcc.gov.lr", flag: "🇱🇷", region: "West Africa" },
  { country: "Gambia", name: "GPPA Gambia", url: "https://www.gppa.gm", flag: "🇬🇲", region: "West Africa" },
  { country: "Cabo Verde", name: "Portal de Compras Públicas", url: "https://www.portalcompras.gov.cv", flag: "🇨🇻", region: "West Africa" },
  { country: "Niger", name: "ARMP Niger", url: "https://www.armp.ne", flag: "🇳🇪", region: "West Africa" },
  // East Africa
  { country: "Kenya", name: "Public Procurement Information Portal", url: "https://ppip.go.ke", flag: "🇰🇪", region: "East Africa" },
  { country: "Ethiopia", name: "Public Procurement & Property Authority", url: "https://www.ppa.gov.et", flag: "🇪🇹", region: "East Africa" },
  { country: "Tanzania", name: "Tanzania Procurement Portal", url: "https://www.tender.go.tz", flag: "🇹🇿", region: "East Africa" },
  { country: "Uganda", name: "PPDA Uganda", url: "https://www.gpp.ppda.go.ug", flag: "🇺🇬", region: "East Africa" },
  { country: "Rwanda", name: "Rwanda Public Procurement Authority", url: "https://www.rppa.gov.rw", flag: "🇷🇼", region: "East Africa" },
  { country: "Burundi", name: "ARMP Burundi", url: "https://www.armp.bi", flag: "🇧🇮", region: "East Africa" },
  // North Africa
  { country: "Morocco", name: "Marchés Publics du Maroc", url: "https://www.marchespublics.gov.ma", flag: "🇲🇦", region: "North Africa" },
  { country: "Egypt", name: "Egyptian Government Procurement", url: "https://www.eprocurement.gov.eg", flag: "🇪🇬", region: "North Africa" },
  { country: "Algeria", name: "ARMP Algérie", url: "https://www.armp.dz", flag: "🇩🇿", region: "North Africa" },
  { country: "Tunisia", name: "TunEPS Procurement Portal", url: "https://www.tuneps.tn", flag: "🇹🇳", region: "North Africa" },
  // Southern Africa
  { country: "South Africa", name: "Government Tender Bulletin (eTenders)", url: "https://www.etenders.gov.za", flag: "🇿🇦", region: "Southern Africa" },
  { country: "Zimbabwe", name: "PRAZ Zimbabwe", url: "https://www.praz.org.zw", flag: "🇿🇼", region: "Southern Africa" },
  { country: "Zambia", name: "ZPPA Zambia", url: "https://www.zppa.org.zm", flag: "🇿🇲", region: "Southern Africa" },
  { country: "Botswana", name: "PPADB Botswana", url: "https://www.ppb.org.bw", flag: "🇧🇼", region: "Southern Africa" },
  { country: "Mozambique", name: "UFSA Mozambique", url: "https://www.ufsa.gov.mz", flag: "🇲🇿", region: "Southern Africa" },
  { country: "Namibia", name: "Namibia Tender Portal (NIPDB)", url: "https://www.nipdb.com", flag: "🇳🇦", region: "Southern Africa" },
  { country: "Malawi", name: "ODPP Malawi", url: "https://www.odpp.gov.mw", flag: "🇲🇼", region: "Southern Africa" },
  { country: "Eswatini", name: "SPPRA Eswatini", url: "https://www.sppra.co.sz", flag: "🇸🇿", region: "Southern Africa" },
  { country: "Lesotho", name: "PPD Lesotho", url: "https://www.ppd.gov.ls", flag: "🇱🇸", region: "Southern Africa" },
  { country: "Madagascar", name: "ARMP Madagascar", url: "https://www.armp.mg", flag: "🇲🇬", region: "Southern Africa" },
  { country: "Mauritius", name: "Government Tenders Mauritius", url: "https://www.govtenders.gov.mu", flag: "🇲🇺", region: "Southern Africa" },
  { country: "Seychelles", name: "PPU Seychelles", url: "https://www.ppu.gov.sc", flag: "🇸🇨", region: "Southern Africa" },
  // Central Africa
  { country: "Congo (DRC)", name: "ACMP Marchés Publics RDC", url: "https://www.acmp.gouv.cd", flag: "🇨🇩", region: "Central Africa" },
  { country: "Congo-Brazzaville", name: "Marchés Publics Congo", url: "https://www.marchespublics.cg", flag: "🇨🇬", region: "Central Africa" },
  { country: "Gabon", name: "Marchés Publics Gabon", url: "https://www.marchespublics.ga", flag: "🇬🇦", region: "Central Africa" },
  { country: "Angola", name: "SPE Angola", url: "https://www.spe.gov.ao", flag: "🇦🇴", region: "Central Africa" },
  { country: "Mauritania", name: "ARMP Mauritanie", url: "https://www.armp.mr", flag: "🇲🇷", region: "West Africa" },
];

const REGIONS = ["Pan-African", "West Africa", "East Africa", "North Africa", "Southern Africa", "Central Africa"] as const;

type AnalysisMode = "find" | "register" | "bid" | "consortium";

export default function ProcurementPage() {
  const [mode, setMode] = useState<AnalysisMode>("find");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [businessSize, setBusinessSize] = useState("");
  const [tenderValue, setTenderValue] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [portalSearch, setPortalSearch] = useState("");
  const [portalRegion, setPortalRegion] = useState<string>("All");

  const modeConfig = {
    find: {
      label: "Find tenders",
      desc: "Discover active procurement opportunities in your sector",
      prompt: (c: string, s: string, b: string, v: string) =>
        `Find active and upcoming government procurement tenders in ${c} for the ${s} sector.

Business size: ${b || "SME"}
Target contract value: ${v || "Any size"}

Provide:
1. Current Active Tenders: 3-5 specific types of contracts currently being tendered in ${c} for ${s}, with realistic contract values and issuing ministry/agency
2. Upcoming Tender Windows: Contracts expected to be issued in the next 90 days based on budget cycles and seasonal procurement patterns
3. Set-Asides & Local Content: Any reserved procurement for SMEs, women-owned businesses, or youth-led companies in ${c}
4. Registration Required: What supplier registration databases to be on BEFORE tenders close (with URLs)
5. Fastest Entry Point: The single easiest type of tender for an ${s} business to win in ${c} as a first contract
6. Portal URLs: Where to find tender notices for ${c} government procurement`,
    },
    register: {
      label: "Register as supplier",
      desc: "Get on government supplier databases",
      prompt: (c: string, s: string, b: string) =>
        `Walk me through the complete supplier registration process for government procurement in ${c} for the ${s} sector.

Business size/stage: ${b || "SME, 1-3 years old"}

Provide:
1. Primary Procurement Database: The main government supplier database in ${c} — name, URL, and eligibility requirements
2. Documents Required: Exact list of documents needed (company registration, tax clearance, etc.) with current government fees
3. Step-by-Step Registration: Numbered steps from start to first approved submission
4. Timeline: Realistic days from starting the process to being listed as approved supplier
5. Sector-Specific Certifications: Any professional certifications or licenses required for ${s} suppliers in ${c}
6. SME Set-Aside Registration: Any separate SME or women/youth business supplier lists in ${c} with easier entry requirements
7. Ongoing Requirements: Annual renewals, tax clearance updates, or compliance requirements to stay registered`,
    },
    bid: {
      label: "Write a bid",
      desc: "AI-assisted tender document preparation",
      prompt: (c: string, s: string, b: string, ctx: string) =>
        `Help me write a competitive bid for a government tender in ${c} for the ${s} sector.

Business context: ${ctx || `${b || "SME"} seeking first government contract in ${c}`}

Provide:
1. Bid Structure: Standard structure for tender responses in ${c} (executive summary, technical proposal, financial proposal, compliance documents)
2. Evaluation Criteria: How government evaluators score bids in ${c} (price weight, technical weight, local content, BBBEE or similar)
3. Technical Proposal Template: A strong opening paragraph and section headers for the technical proposal
4. Pricing Strategy: How to price competitively for ${c} government tenders without underselling (include note on bid security/performance bond requirements)
5. Common Disqualifiers: The most common reasons bids get rejected in ${c} on technical grounds
6. Winning Language: Key phrases and commitments that score well with ${c} government evaluators in ${s} contracts
7. Local Content Statement: Template language for demonstrating local content compliance`,
    },
    consortium: {
      label: "Form a consortium",
      desc: "Pool with other businesses to bid bigger",
      prompt: (c: string, s: string, b: string, v: string) =>
        `Design a consortium strategy for an ${s} business in ${c} to bid on a contract worth ${v || "$1-5 million"}.

Lead business size: ${b || "SME, under the minimum turnover threshold to qualify alone"}

Provide:
1. Consortium Structure: Best legal entity for a consortium bid in ${c} (JV agreement, SPV, consortium agreement) with brief explanation of ${c}'s procurement law on this
2. Partner Profile: What complementary businesses to recruit as consortium members — specific skills/certifications each should bring
3. Lead vs. Sub-Contractor Split: How to structure roles, responsibilities, and revenue share
4. Qualification Pooling: How pooling turnover, staff, and past experience allows the consortium to meet minimum qualification thresholds
5. Consortium Registration: How to formally register the consortium as a bidding entity in ${c}
6. Internal Agreement: 5 key clauses to put in the consortium agreement before submitting a bid
7. First Tender Target: The most realistic first consortium bid in ${c} for ${s} sector — approximate value and issuing agency`,
    },
  };

  async function handleAnalyze() {
    if (!country || !sector) return;
    setLoading(true);
    setResult("");

    const cfg = modeConfig[mode];
    const prompt =
      mode === "find"
        ? cfg.prompt(country, sector, businessSize, tenderValue)
        : mode === "bid"
        ? modeConfig.bid.prompt(country, sector, businessSize, context)
        : mode === "consortium"
        ? modeConfig.consortium.prompt(country, sector, businessSize, tenderValue)
        : modeConfig.register.prompt(country, sector, businessSize);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are Kebu's Procurement Intelligence engine. You help African businesses find, register for, and win government contracts and corporate procurement opportunities.

You understand African procurement deeply:
- Most African governments spend 15–30% of GDP through procurement
- Government contracts are more reliable than grants (recurring, not competitive in the same way)
- SME set-asides, local content laws, and BBBEE/B-BBEE type schemes create protected procurement space
- The biggest barrier is not competition — it's not knowing how to register and bid
- Women-owned and youth-owned businesses have preferential access in many African procurement systems

Be specific: name the actual portal, ministry, regulation, or document. Give realistic contract values. Don't hedge.`,
          prompt,
        }),
      });

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setResult(text);
      }
    } catch {
      setResult("Error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-ivory">
      <Nav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-gold bg-gold/10 px-3 py-1.5 rounded-full mb-4">
            PROCUREMENT INTELLIGENCE
          </div>
          <h1 className="font-display text-4xl font-bold text-ink mb-3">
            Government contracts are better than grants
          </h1>
          <p className="text-muted max-w-2xl leading-relaxed">
            African governments spend over $1 trillion per year buying goods and services. Contracts
            are recurring, larger than grants, and reserved for local suppliers by law. Most SMEs
            don&apos;t bid because they don&apos;t know how. We fix that.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { value: "$1T+", label: "Govt spending across Africa/year" },
            { value: "30%", label: "Avg local content requirement" },
            { value: "54", label: "Procurement portals mapped" },
            { value: "3%", label: "Of SMEs currently bid" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-deep-green text-ivory rounded-xl p-4 text-center">
              <p className="font-display text-2xl font-bold text-gold">{value}</p>
              <p className="text-xs text-ivory/70 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <AiEngineDisclaimer />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2">
            {/* Mode tabs */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {(Object.keys(modeConfig) as AnalysisMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setResult(""); }}
                  className={`text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
                    mode === m
                      ? "bg-deep-green text-ivory"
                      : "bg-white border border-border text-ink hover:border-deep-green"
                  }`}
                >
                  {modeConfig[m].label}
                </button>
              ))}
            </div>

            <div className="bg-white border border-border rounded-2xl p-6 mb-6">
              <p className="text-sm text-muted mb-5">{modeConfig[mode].desc}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Country</label>
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. Nigeria, Kenya, Ghana"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Your sector</label>
                  <select value={sector} onChange={(e) => setSector(e.target.value)}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold">
                    <option value="">Select sector</option>
                    {["Catering & food supply", "IT & digital services", "Construction & civil works",
                      "Cleaning & facility management", "Security services", "Healthcare & pharmaceuticals",
                      "Printing & stationery", "Transport & logistics", "Training & capacity building",
                      "Agriculture & food processing", "Engineering & consultancy", "Media & communications"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                {(mode === "find" || mode === "consortium") && (
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Target contract value</label>
                    <select value={tenderValue} onChange={(e) => setTenderValue(e.target.value)}
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold">
                      <option value="">Any size</option>
                      <option>Under $50,000</option>
                      <option>$50,000 – $500,000</option>
                      <option>$500,000 – $2 million</option>
                      <option>$2 million – $10 million</option>
                      <option>Over $10 million</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Business size</label>
                  <select value={businessSize} onChange={(e) => setBusinessSize(e.target.value)}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold">
                    <option value="">Select</option>
                    <option>Solo / 1 person</option>
                    <option>Micro (2–5 staff)</option>
                    <option>Small (6–20 staff)</option>
                    <option>Medium (21–100 staff)</option>
                    <option>Large (100+ staff)</option>
                  </select>
                </div>
                {mode === "bid" && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">What you're bidding on</label>
                    <input type="text" value={context} onChange={(e) => setContext(e.target.value)}
                      placeholder="e.g. Hospital catering contract, county ICT services, national uniforms supply..."
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
                  </div>
                )}
              </div>

              <button onClick={handleAnalyze} disabled={!country || !sector || loading}
                className="w-full bg-deep-green text-ivory font-bold py-3.5 rounded-xl hover:bg-mid-green transition-colors disabled:opacity-50">
                {loading ? "Analyzing procurement landscape..." : `${modeConfig[mode].label} →`}
              </button>
            </div>

            {result && (
              <div className="bg-white border border-border rounded-2xl p-6">
                <h2 className="font-display text-lg font-bold text-ink mb-4">
                  Procurement Intelligence: {country}
                </h2>
                <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                  {result}
                  {loading && <span className="inline-block w-1.5 h-4 bg-gold ml-1 animate-pulse align-middle" />}
                </div>
              </div>
            )}
          </div>

          {/* Right: Portal directory */}
          <div>
            <div className="bg-white border border-border rounded-2xl p-5 sticky top-6 max-h-[80vh] overflow-y-auto">
              <h2 className="font-display text-base font-bold text-ink mb-3">
                {PROCUREMENT_PORTALS.length} Procurement portals
              </h2>
              <input
                type="text"
                value={portalSearch}
                onChange={e => setPortalSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full text-xs border border-border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-gold"
              />
              <div className="flex gap-1 flex-wrap mb-3">
                {["All", ...REGIONS].map(r => (
                  <button key={r} onClick={() => setPortalRegion(r)}
                    className={`text-[9px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                      portalRegion === r ? "bg-deep-green text-ivory" : "bg-warm-ivory text-muted hover:text-ink"
                    }`}>
                    {r === "All" ? "All" : r.replace(" Africa", "")}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                {PROCUREMENT_PORTALS
                  .filter(p =>
                    (portalRegion === "All" || p.region === portalRegion) &&
                    (portalSearch === "" || p.country.toLowerCase().includes(portalSearch.toLowerCase()))
                  )
                  .map(({ country: c, name, url, flag }) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-warm-ivory transition-colors group">
                      <span className="text-base flex-shrink-0">{flag}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-ink group-hover:text-deep-green leading-tight truncate">{c}</p>
                        <p className="text-[10px] text-muted truncate">{name}</p>
                      </div>
                      <span className="ml-auto text-muted group-hover:text-gold text-xs flex-shrink-0">→</span>
                    </a>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
