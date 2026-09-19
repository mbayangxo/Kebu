"use client";

import { useState } from "react";
import { Nav } from "@/app/components/nav";
import { AiEngineDisclaimer } from "@/app/components/ai-engine-disclaimer";

export default function AfcftaPage() {
  const [fromCountry, setFromCountry] = useState("");
  const [toCountry, setToCountry] = useState("");
  const [product, setProduct] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    if (!fromCountry || !toCountry || !product) return;
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are the AfCFTA Navigator for Kebu. You are an expert on the African Continental Free Trade Area (AfCFTA) agreement, which entered into force in 2019 and covers 54 African countries with a combined GDP of $3.4 trillion.

Your expertise includes:
- AfCFTA preferential tariff schedules and tariff elimination timelines
- Rules of origin requirements (value-added thresholds, substantial transformation)
- Certificate of Origin procedures under the Pan-African Payment and Settlement System (PAPSS)
- Non-tariff barriers and how to navigate them
- Sensitive products lists and exclusions by country
- AfCFTA dispute resolution mechanisms
- Practical steps for exporters to qualify for preferential treatment

Be specific, practical, and cite the AfCFTA Annex or Protocol where relevant.`,
          prompt: `Analyze this cross-border trade scenario under AfCFTA:

Exporting country: ${fromCountry}
Destination country: ${toCountry}
Product/commodity: ${product}
HS Code (if known): ${hsCode || "Unknown — please identify likely HS code"}

Please provide:
1. Current AfCFTA tariff treatment: Is this product eligible for preferential rates? What is the current duty rate vs. AfCFTA rate?
2. Rules of origin: What percentage of value must originate in ${fromCountry}? What documentation proves this?
3. Certificate of Origin: Step-by-step instructions for obtaining an AfCFTA certificate of origin in ${fromCountry}
4. Non-tariff barriers: Any known NTBs or compliance requirements for this product entering ${toCountry}
5. Timeline: Estimated days from export to arrival at the border with proper documentation
6. Cost savings: Estimated duty savings vs. MFN rate at typical shipment values ($10,000 and $100,000)
7. Next steps: Specific actions to take in the next 30 days`,
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
      setResult("Error analyzing trade route. Please try again.");
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
            AI ENGINE 2
          </div>
          <h1 className="font-display text-4xl font-bold text-ink mb-3">
            AfCFTA Navigator
          </h1>
          <p className="text-muted max-w-2xl leading-relaxed">
            The African Continental Free Trade Area represents a $3.4 trillion market.
            Most businesses have no idea how to access it. Enter your trade route and product —
            get tariff rates, rules of origin, certificates of origin, and a complete export roadmap.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Member states", value: "54" },
            { label: "Combined GDP", value: "$3.4T" },
            { label: "Tariff lines reduced", value: "90%+" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-deep-green text-ivory rounded-xl p-4 text-center">
              <p className="font-display text-2xl font-bold text-gold">{value}</p>
              <p className="text-xs text-ivory/70 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <AiEngineDisclaimer />
        </div>

        {/* Form */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-ink mb-5">Trade route analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                Exporting from
              </label>
              <input
                type="text"
                value={fromCountry}
                onChange={(e) => setFromCountry(e.target.value)}
                placeholder="e.g. Ghana, Ethiopia, Morocco"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                Selling into
              </label>
              <input
                type="text"
                value={toCountry}
                onChange={(e) => setToCountry(e.target.value)}
                placeholder="e.g. Nigeria, South Africa, Egypt"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                Product / commodity
              </label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. Processed shea butter, Kente fabric, Software services"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                HS Code (optional)
              </label>
              <input
                type="text"
                value={hsCode}
                onChange={(e) => setHsCode(e.target.value)}
                placeholder="e.g. 1515.90"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!fromCountry || !toCountry || !product || loading}
            className="w-full bg-deep-green text-ivory font-bold py-3.5 rounded-xl hover:bg-mid-green transition-colors disabled:opacity-50"
          >
            {loading ? "Analyzing trade route..." : "Get my AfCFTA roadmap →"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold text-ink mb-4">
              AfCFTA Analysis: {fromCountry} → {toCountry}
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
