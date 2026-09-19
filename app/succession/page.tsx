"use client";

import { useState } from "react";
import { Nav } from "@/app/components/nav";
import { AiEngineDisclaimer } from "@/app/components/ai-engine-disclaimer";

export default function SuccessionPage() {
  const [country, setCountry] = useState("");
  const [businessValue, setBusinessValue] = useState("");
  const [industry, setIndustry] = useState("");
  const [situation, setSituation] = useState("");
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    if (!country || !industry) return;
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are the Succession & Wealth Transfer engine for Kebu. You help African family businesses and entrepreneurs create generational wealth transfer plans that keep value within the family and community.

Africa is experiencing the largest business succession wave in history — the first generation of post-independence entrepreneurs is aging. Trillions of dollars in business value risk being lost to poor succession planning, estate tax, informal ownership structures, and family disputes.

Your expertise covers:
- Family business succession structures (family trusts, holding companies, family constitutions)
- Estate planning in African jurisdictions (avoiding probate, minimizing estate duty)
- Business valuation approaches appropriate for African markets
- Transition structures: management buyouts, employee share ownership plans (ESOPs), external sale to PE
- Islamic succession rules (for Muslim-majority countries)
- Women's inheritance rights in various African legal systems
- Cross-border estate planning for families with diaspora members

Always be culturally sensitive. Many African families have complex polygamous inheritance situations or customary law obligations. Note when professional legal counsel is essential.`,
          prompt: `Design a succession and wealth transfer plan:

Country: ${country}
Business/asset value: ${businessValue || "Unknown"}
Industry: ${industry}
Current situation: ${situation || "First-generation business owner approaching retirement"}
Primary goal: ${goal || "Keep business in the family across generations"}

Please provide:
1. Succession Structure Options: 2–3 concrete structures suitable for this business and country (e.g., family holding company + trust, management buyout, ESOP)
2. Recommended Structure: Which option is best and why, given ${country}'s laws and this family's likely situation
3. Estate Planning: How to structure ownership to minimize estate duty/inheritance tax in ${country} while preserving family control
4. Business Valuation: How to get a fair valuation for this type of business in ${country}, and why valuation matters for succession
5. Family Governance: Key elements of a family constitution or shareholder agreement to prevent family disputes
6. Women & Daughters: Specific protections to ensure female family members inherit equitably under ${country}'s legal system
7. Cross-Border Considerations: If family members live in multiple countries, how does that affect the succession plan?
8. 5-Year Timeline: A practical sequence of legal and financial steps over the next 5 years
9. Professional Team: What type of advisors are needed (lawyer, accountant, family mediator) and typical cost range in ${country}`,
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
            AI ENGINE 8
          </div>
          <h1 className="font-display text-4xl font-bold text-ink mb-3">
            Succession & Wealth Transfer
          </h1>
          <p className="text-muted max-w-2xl leading-relaxed">
            The first generation of post-independence African entrepreneurs is aging.
            Trillions of dollars in business value risk disappearing without proper succession plans.
            This engine helps you structure ownership, governance, and wealth transfer so that what
            you built outlasts you — and stays African.
          </p>
        </div>

        <div className="mb-6">
          <AiEngineDisclaimer />
        </div>

        {/* Form */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-ink mb-5">Succession planning profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Country of incorporation</label>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Nigeria, Kenya, South Africa"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Industry</label>
              <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Real estate, retail chain, manufacturing"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Business / asset value (USD approx.)</label>
              <input type="text" value={businessValue} onChange={(e) => setBusinessValue(e.target.value)}
                placeholder="e.g. $500,000, $5 million"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Primary goal</label>
              <select value={goal} onChange={(e) => setGoal(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold">
                <option value="">Select goal</option>
                <option>Keep business in the family</option>
                <option>Sell the business and distribute proceeds</option>
                <option>Employee ownership / management buyout</option>
                <option>Partially sell to PE, keep family stake</option>
                <option>Create a family foundation / endowment</option>
              </select>
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Current situation</label>
            <textarea value={situation} onChange={(e) => setSituation(e.target.value)}
              placeholder="e.g. I'm 60, my business has 3 branches, I have 4 children (2 in the business, 2 abroad). My wife is a business partner..."
              rows={3}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold resize-none" />
          </div>

          <button onClick={handleAnalyze} disabled={!country || !industry || loading}
            className="w-full bg-deep-green text-ivory font-bold py-3.5 rounded-xl hover:bg-mid-green transition-colors disabled:opacity-50">
            {loading ? "Designing your succession plan..." : "Design my succession plan →"}
          </button>
        </div>

        {result && (
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold text-ink mb-1">Your Succession Plan</h2>
            <p className="text-xs text-muted mb-4">
              This is AI-generated guidance. Always engage a licensed attorney in {country} before taking legal action.
            </p>
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
