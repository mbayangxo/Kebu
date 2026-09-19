"use client";

import { useState } from "react";
import { Nav } from "@/app/components/nav";
import { AiEngineDisclaimer } from "@/app/components/ai-engine-disclaimer";

export default function BudgetIntelPage() {
  const [country, setCountry] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [sector, setSector] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    if (!country || !sector) return;
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are the Government Budget Intelligence Engine for Kebu. You decode African government budgets and identify private sector opportunities hidden within ministerial allocations.

African governments collectively spend over $1 trillion annually. Within those budgets are:
- Infrastructure tenders open to local companies
- Ministry procurement contracts
- Public-private partnership opportunities
- Local content requirements that mandate African supplier participation
- Grant windows within budget line items
- Development bank co-financing opportunities tied to budget priorities

You translate bureaucratic budget language into actionable business intelligence. Be specific about ministries, budget codes, and realistic opportunity sizes.`,
          prompt: `Analyze the government budget of ${country} for ${year} with a focus on the ${sector} sector.

Provide:
1. Sector Budget Allocation: What is ${country} spending on ${sector} in ${year}? List the key ministries and agencies involved with estimated allocations.
2. Top 5 Procurement Opportunities: Specific types of contracts/tenders likely to be issued in ${sector} for ${year}, with realistic contract values
3. Local Content Requirements: What percentage of contracts must go to local suppliers? Any special set-asides for women-owned or youth-led businesses?
4. How to Get On The List: Specific steps to register as a government supplier in ${country} — portal URLs, documents needed, timeline
5. PPP Pipeline: Any announced public-private partnerships in ${sector} that private businesses can participate in
6. Budget Red Flags: Any risks (budget cuts, delayed releases, currency devaluation risk) that affect contract payment timelines
7. Calendar: Key dates for budget reading, tender publication, and fiscal year rollover

If specific ${year} budget data is uncertain, use the most recent available and note the year.`,
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-gold bg-gold/10 px-3 py-1.5 rounded-full mb-4">
            AI ENGINE 4
          </div>
          <h1 className="font-display text-4xl font-bold text-ink mb-3">
            Government Budget Intelligence
          </h1>
          <p className="text-muted max-w-2xl leading-relaxed">
            African governments spend over $1 trillion per year. Most of that money flows through
            procurement, tenders, and grants that private businesses can bid on — if they know where
            to look. We decode national budgets into actionable business opportunities.
          </p>
        </div>

        <div className="mb-6">
          <AiEngineDisclaimer />
        </div>

        {/* Form */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-ink mb-5">Budget scan parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Country</label>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Kenya, Nigeria, Rwanda"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Fiscal year</label>
              <input type="text" value={year} onChange={(e) => setYear(e.target.value)}
                placeholder="2025"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Your sector</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold">
                <option value="">Select sector</option>
                {["Agriculture & food security", "Infrastructure & construction", "Health & pharmaceuticals",
                  "Education & training", "ICT & digital services", "Energy & utilities", "Transport & logistics",
                  "Housing & urban development", "Security & defense", "Creative industries & media"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={handleAnalyze} disabled={!country || !sector || loading}
            className="w-full bg-deep-green text-ivory font-bold py-3.5 rounded-xl hover:bg-mid-green transition-colors disabled:opacity-50">
            {loading ? "Scanning government budget..." : "Scan for opportunities →"}
          </button>
        </div>

        {result && (
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold text-ink mb-4">
              Budget Intelligence: {country} {year} — {sector}
            </h2>
            <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
              {result}
              {loading && <span className="inline-block w-1.5 h-4 bg-gold ml-1 animate-pulse align-middle" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
