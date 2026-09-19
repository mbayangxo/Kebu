"use client";

import { useState } from "react";
import { Nav } from "@/app/components/nav";
import { AiEngineDisclaimer } from "@/app/components/ai-engine-disclaimer";

interface Layer {
  name: string;
  type: string;
  amount: string;
  source: string;
  notes: string;
}

export default function CapitalStackPage() {
  const [businessType, setBusinessType] = useState("");
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("");
  const [stage, setStage] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!businessType || !amount || !country) return;
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are the Capital Stack Engine for Kebu, Africa's premier funding intelligence platform. You design optimal multi-layered funding structures for African businesses by combining grants, soft loans, development finance, impact investment, and commercial capital.

Your output must include:
1. A capital stack table showing each layer: type, amount, source, cost of capital
2. Why this combination works for this specific business in this country
3. Sequencing advice (what to get first)
4. Key eligibility requirements for each layer
5. One risk and one alternative

Format clearly with headers, be specific about real African funders (AfDB, IFC, local DFIs, government programs, etc.).`,
          prompt: `Design a capital stack for the following African business:

Business type: ${businessType}
Funding needed: $${amount} USD equivalent
Country: ${country}
Business stage: ${stage || "Early stage"}

Create an optimized multi-layer funding structure that combines:
- Non-dilutive funding (grants, government programs)
- Concessional debt (development bank loans, government credit lines)
- Revenue-based or impact-linked financing
- Commercial debt or equity (only if appropriate)

For each layer, name the specific funder, the realistic amount they could provide, and the rough terms. Total the stack to reach the funding goal.`,
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
      setResult("Error generating capital stack. Please try again.");
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
            AI ENGINE 1
          </div>
          <h1 className="font-display text-4xl font-bold text-ink mb-3">
            Capital Stack Engine
          </h1>
          <p className="text-muted max-w-2xl leading-relaxed">
            Most African businesses are undercapitalized because founders only access one type of funding.
            The Capital Stack Engine designs multi-layer funding architectures — combining grants, concessional
            loans, development finance, and equity in the right order.
          </p>
        </div>

        <div className="mb-6">
          <AiEngineDisclaimer />
        </div>

        {/* Form */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-ink mb-5">Describe your business</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                Business type / sector
              </label>
              <input
                type="text"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="e.g. Agro-processing SME, EdTech startup, Fashion brand"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                Total funding needed (USD)
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 250,000"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                Country of operation
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Nigeria, Kenya, Morocco"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                Business stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold"
              >
                <option value="">Select stage</option>
                <option>Idea / pre-revenue</option>
                <option>Early stage (0–2 years)</option>
                <option>Growing (2–5 years)</option>
                <option>Established (5+ years)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!businessType || !amount || !country || loading}
            className="w-full bg-deep-green text-ivory font-bold py-3.5 rounded-xl hover:bg-mid-green transition-colors disabled:opacity-50"
          >
            {loading ? "Designing your capital stack..." : "Design my capital stack →"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold text-ink mb-4">Your Capital Stack</h2>
            <div className="prose prose-sm max-w-none text-ink whitespace-pre-wrap leading-relaxed">
              {result}
              {loading && <span className="inline-block w-1.5 h-4 bg-gold ml-1 animate-pulse align-middle" />}
            </div>
          </div>
        )}

        {/* How it works */}
        {!result && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Grant layer first", desc: "Non-dilutive capital as the foundation — government grants, DFI programs, philanthropic funding." },
              { step: "2", title: "Concessional debt", desc: "Below-market loans from development banks, credit guarantees, and SME loan programs." },
              { step: "3", title: "Commercial capital", desc: "Revenue-based financing, impact investment, or equity — only after the first two layers are secured." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-white border border-border rounded-xl p-4">
                <div className="w-8 h-8 rounded-full bg-deep-green text-ivory text-sm font-bold flex items-center justify-center mb-3">
                  {step}
                </div>
                <h3 className="font-semibold text-ink text-sm mb-1">{title}</h3>
                <p className="text-xs text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
