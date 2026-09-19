"use client";

import { useState } from "react";
import { Nav } from "@/app/components/nav";
import { AiEngineDisclaimer } from "@/app/components/ai-engine-disclaimer";

export default function CollectivePage() {
  const [businessType, setBusinessType] = useState("");
  const [country, setCountry] = useState("");
  const [tenderValue, setTenderValue] = useState("");
  const [weakness, setWeakness] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    if (!businessType || !country) return;
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are the First-Order Collective engine for Kebu. You help African SMEs form legal consortiums, joint ventures, and collective bid entities to compete for large government contracts and corporate procurement deals that would be too large for any single business.

The First-Order Collective is inspired by African traditions of collective action (Ubuntu, Tontines/Njangi, Susu) applied to modern procurement. You help businesses:
1. Identify the right partners to form a consortium with
2. Structure the legal entity (SPV, JV, consortium agreement)
3. Understand collective bidding rules in their country's procurement law
4. Write the consortium structure into tender submissions
5. Divide roles, responsibilities, and revenue shares fairly
6. Manage collective risk and performance bonds

Key reference: African countries increasingly mandate SME set-asides and local content requirements in large tenders — consortiums allow SMEs to meet minimum turnover/capacity thresholds collectively.`,
          prompt: `Design a collective bidding strategy for:

Business type: ${businessType}
Country: ${country}
Target tender value: ${tenderValue || "Unknown — recommend optimal range"}
Weakness to address: ${weakness || "Capacity/turnover too small to qualify alone"}

Please provide:
1. Consortium Structure: What type of legal entity to form (JV, SPV, consortium agreement)? How many partners is optimal?
2. Partner Profile: What complementary businesses should they partner with? What capabilities/certifications should each bring?
3. Role Division: How to divide scope of work, management responsibility, and revenue among consortium members
4. Legal Requirements: Specific consortium registration and documentation requirements under ${country}'s procurement law
5. Tender Threshold Strategy: How the collective structure allows them to meet minimum turnover/capacity thresholds
6. Performance Bond: How to collectively secure performance bonds (5–10% of contract value)
7. Consortium Agreement Template: Key clauses to include in the consortium agreement to protect all parties
8. First Tender Target: What specific type of government tender in ${country} is most accessible for a first consortium bid?`,
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
            AI ENGINE 7
          </div>
          <h1 className="font-display text-4xl font-bold text-ink mb-3">
            First-Order Collective
          </h1>
          <p className="text-muted max-w-2xl leading-relaxed">
            The Ubuntu tradition of collective strength has always defined African business. The
            First-Order Collective helps you form legal consortiums and joint ventures so that
            small businesses can collectively bid on — and win — government contracts worth
            millions that no single SME could access alone.
          </p>
        </div>

        <div className="mb-6">
          <AiEngineDisclaimer />
        </div>

        {/* Inspiration strip */}
        <div className="bg-deep-green text-ivory rounded-2xl p-6 mb-8">
          <p className="font-display text-lg font-semibold text-gold mb-2">
            "Ubuntu — I am because we are"
          </p>
          <p className="text-sm text-ivory/80">
            African SMEs that form procurement consortiums can access contracts 10–50x larger than
            what they could bid on alone — while meeting local content thresholds set aside for
            African businesses.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-ink mb-5">Design your collective bid</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Your business type</label>
              <input type="text" value={businessType} onChange={(e) => setBusinessType(e.target.value)}
                placeholder="e.g. Construction firm, IT services company, food supplier"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Country</label>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Ghana, Nigeria, South Africa"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Target tender value (USD)</label>
              <input type="text" value={tenderValue} onChange={(e) => setTenderValue(e.target.value)}
                placeholder="e.g. $2 million, $10 million"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Your current weakness</label>
              <select value={weakness} onChange={(e) => setWeakness(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold">
                <option value="">Select</option>
                <option>Turnover too small to qualify</option>
                <option>Missing required certifications</option>
                <option>Not enough staff/capacity</option>
                <option>Lack of prior contract experience</option>
                <option>Cannot fund performance bond alone</option>
              </select>
            </div>
          </div>

          <button onClick={handleAnalyze} disabled={!businessType || !country || loading}
            className="w-full bg-deep-green text-ivory font-bold py-3.5 rounded-xl hover:bg-mid-green transition-colors disabled:opacity-50">
            {loading ? "Designing your collective..." : "Design my collective bid →"}
          </button>
        </div>

        {result && (
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold text-ink mb-4">Your Collective Bid Strategy</h2>
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
