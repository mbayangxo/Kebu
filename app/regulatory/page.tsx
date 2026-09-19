"use client";

import { useState } from "react";
import { Nav } from "@/app/components/nav";
import { AiEngineDisclaimer } from "@/app/components/ai-engine-disclaimer";

export default function RegulatoryPage() {
  const [businessType, setBusinessType] = useState("");
  const [countries, setCountries] = useState("");
  const [priority, setPriority] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    if (!businessType || !countries) return;
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are the Regulatory Arbitrage Map engine for Kebu. You help African entrepreneurs identify the optimal legal and regulatory environment to operate their business across multiple African countries.

Africa has 54 legal systems with significant variation in:
- Company registration speed and cost (Rwanda: 6 hours; others: 6+ months)
- Corporate tax rates (Mauritius: 15%; Seychelles: 0% for offshore; Nigeria: 30%)
- Special Economic Zone (SEZ) and free zone benefits
- IP protection frameworks
- Foreign exchange and repatriation rules
- Labor laws and minimum wage requirements
- Data protection and fintech licensing
- Double tax treaties

Your job is to identify which African jurisdiction gives a specific business the best operating environment — and how to structure operations across multiple countries to maximize legal advantage without violating any laws.`,
          prompt: `Analyze regulatory arbitrage opportunities for this business:

Business type: ${businessType}
Countries of interest: ${countries}
Primary priority: ${priority || "Minimize tax burden while maintaining operational flexibility"}

Please provide:
1. Regulatory Comparison: Side-by-side comparison of the key regulatory dimensions for ${countries} that matter most for ${businessType}
2. Optimal Primary Jurisdiction: Which country should be the primary legal home and why? (Consider registration ease, tax, banking access, IP protection)
3. Optimal Operating Structure: How to legally structure operations across these countries to minimize tax and compliance burden
4. Special Economic Zones: Any SEZs, free zones, or special investment zones in these countries that apply to this business type
5. Treaty Network: Key double tax treaties between the listed countries and with major trading partners
6. Practical Steps: How to register and set up the recommended structure, with realistic timelines and costs
7. Compliance Red Lines: What NOT to do — aggressive structures that could trigger tax authority scrutiny`,
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
            AI ENGINE 5
          </div>
          <h1 className="font-display text-4xl font-bold text-ink mb-3">
            Regulatory Arbitrage Map
          </h1>
          <p className="text-muted max-w-2xl leading-relaxed">
            54 countries. 54 different tax rates, company laws, and operating environments.
            The Regulatory Arbitrage Map identifies the optimal legal jurisdiction for your
            African business — and shows you how to structure operations across borders to stay
            compliant while maximizing advantage.
          </p>
        </div>

        <div className="mb-6">
          <AiEngineDisclaimer />
        </div>

        {/* Form */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-ink mb-5">Business structure analysis</h2>
          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                Business type and model
              </label>
              <input type="text" value={businessType} onChange={(e) => setBusinessType(e.target.value)}
                placeholder="e.g. Fintech startup, cross-border e-commerce, creative agency, agri-exporter"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                Countries to compare (comma-separated)
              </label>
              <input type="text" value={countries} onChange={(e) => setCountries(e.target.value)}
                placeholder="e.g. Rwanda, Mauritius, Ghana, Nigeria"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                Primary optimization goal
              </label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold">
                <option value="">Select priority</option>
                <option>Minimize corporate tax</option>
                <option>Fastest company registration</option>
                <option>Best fintech / banking access</option>
                <option>Strongest IP protection</option>
                <option>Easiest FX repatriation</option>
                <option>Access to investors and capital markets</option>
                <option>Balanced: tax + compliance + banking</option>
              </select>
            </div>
          </div>

          <button onClick={handleAnalyze} disabled={!businessType || !countries || loading}
            className="w-full bg-deep-green text-ivory font-bold py-3.5 rounded-xl hover:bg-mid-green transition-colors disabled:opacity-50">
            {loading ? "Mapping regulatory landscape..." : "Map my regulatory options →"}
          </button>
        </div>

        {result && (
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold text-ink mb-4">Regulatory Analysis</h2>
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
