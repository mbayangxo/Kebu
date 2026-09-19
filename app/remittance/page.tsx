"use client";

import { useState } from "react";
import { Nav } from "@/app/components/nav";
import { AiEngineDisclaimer } from "@/app/components/ai-engine-disclaimer";

export default function RemittancePage() {
  const [diaspLocation, setDiaspLocation] = useState("");
  const [targetCountry, setTargetCountry] = useState("");
  const [monthlyRemittance, setMonthlyRemittance] = useState("");
  const [businessInterest, setBusinessInterest] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    if (!diaspLocation || !targetCountry) return;
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are the Remittance-to-Ownership Pipeline engine for Kebu. You help African diaspora members transform monthly family remittances into equity ownership in African businesses and assets.

Africa receives $100B+ in diaspora remittances annually — more than all foreign aid combined. Most of this money is consumed, not invested. You help diaspora members:
1. Understand the investment vehicles available to them in specific African countries
2. Structure remittances as equity contributions rather than gifts
3. Access diaspora investment bonds, real estate investment programs, and co-ownership structures
4. Navigate legal structures for non-resident ownership in African countries
5. Minimize currency risk and repatriation friction

Key instruments include: Diaspora bonds (Kenya, Ethiopia, Nigeria), REIT structures, SME equity crowdfunding platforms (Charisol, Farmcrowdy, etc.), land title programs for diaspora, and diaspora investment funds.`,
          prompt: `Build a remittance-to-ownership roadmap for this diaspora investor:

Current location: ${diaspLocation}
Target country for investment: ${targetCountry}
Current monthly remittance: ${monthlyRemittance || "Unknown"}
Business/asset interest: ${businessInterest || "Open to recommendations"}

Please provide:
1. Investment Vehicles Available: Specific investment instruments for ${diaspLocation} residents to invest in ${targetCountry} (diaspora bonds, REITs, equity platforms, co-ops)
2. Remittance Structuring: How to legally transform ${monthlyRemittance || "existing"} monthly transfers from consumption to equity, with specific documentation needed
3. Ownership Structures: The best legal structure for non-resident equity ownership in ${targetCountry} (branch vs subsidiary vs nominee vs land title)
4. Currency Risk Management: How to hedge USD/EUR/GBP → [local currency] conversion risk
5. Repatriation Rights: Rules for repatriating profits and capital from ${targetCountry} to ${diaspLocation}
6. Tax Implications: Key tax considerations in both ${diaspLocation} and ${targetCountry} for diaspora investors
7. First Steps: Specific actions to take in the next 60 days with realistic investment amounts and expected returns
8. Red Flags: Common scams and pitfalls targeting diaspora investors in ${targetCountry}`,
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
            AI ENGINE 6
          </div>
          <h1 className="font-display text-4xl font-bold text-ink mb-3">
            Remittance-to-Ownership Pipeline
          </h1>
          <p className="text-muted max-w-2xl leading-relaxed">
            Africa receives $100 billion in diaspora remittances every year — more than all foreign
            aid combined. Almost none of it builds ownership. The Remittance-to-Ownership Pipeline
            turns monthly transfers into equity, land, and generational wealth back home.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Annual remittances to Africa", value: "$100B+" },
            { label: "% invested vs consumed", value: "<5%" },
            { label: "Potential equity unlocked", value: "$50B+" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-deep-green text-ivory rounded-xl p-4 text-center">
              <p className="font-display text-xl font-bold text-gold">{value}</p>
              <p className="text-xs text-ivory/70 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <AiEngineDisclaimer />
        </div>

        {/* Form */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-ink mb-5">Your diaspora investment profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                Where you live now
              </label>
              <input type="text" value={diaspLocation} onChange={(e) => setDiaspLocation(e.target.value)}
                placeholder="e.g. United States, France, UK, Canada"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                Target country for investment
              </label>
              <input type="text" value={targetCountry} onChange={(e) => setTargetCountry(e.target.value)}
                placeholder="e.g. Ghana, Senegal, Nigeria, Kenya"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                Monthly remittance amount (USD)
              </label>
              <input type="text" value={monthlyRemittance} onChange={(e) => setMonthlyRemittance(e.target.value)}
                placeholder="e.g. $500, $2,000"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                What you want to own
              </label>
              <select value={businessInterest} onChange={(e) => setBusinessInterest(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold">
                <option value="">Select interest</option>
                <option>Real estate / land</option>
                <option>Equity in a family business</option>
                <option>Agricultural land / farm</option>
                <option>Shares in an African SME</option>
                <option>Government diaspora bonds</option>
                <option>Diversified portfolio</option>
              </select>
            </div>
          </div>

          <button onClick={handleAnalyze} disabled={!diaspLocation || !targetCountry || loading}
            className="w-full bg-deep-green text-ivory font-bold py-3.5 rounded-xl hover:bg-mid-green transition-colors disabled:opacity-50">
            {loading ? "Building your pipeline..." : "Build my ownership pipeline →"}
          </button>
        </div>

        {result && (
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold text-ink mb-4">Your Ownership Roadmap</h2>
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
