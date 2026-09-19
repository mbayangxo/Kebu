"use client";

import { useState } from "react";
import { Nav } from "@/app/components/nav";
import { AiEngineDisclaimer } from "@/app/components/ai-engine-disclaimer";

export default function BankabilityPage() {
  const [country, setCountry] = useState("");
  const [revenue, setRevenue] = useState("");
  const [mobileRevenue, setMobileRevenue] = useState("");
  const [years, setYears] = useState("");
  const [hasFormalAccount, setHasFormalAccount] = useState("");
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
          system: `You are the Bankability Engine for Kebu. You help informal and semi-formal African businesses become creditworthy and access formal financial services.

Africa has 600 million mobile money accounts. Most small businesses have years of mobile transaction history (M-Pesa, Wave, MTN Mobile Money, Airtel Money, Orange Money) that banks historically ignored. Your role is to help business owners:
1. Understand their current "bankability score" based on what they tell you
2. Learn exactly what documents and records will make them loan-ready
3. Translate informal business records into formal financial statements
4. Identify the right financial products for their stage
5. Get practical action steps to become loan-eligible within 90 days

Be specific about products available in their country. Consider mobile money statements, supplier invoices, airtime history, and USSD payment records as valid financial evidence.`,
          prompt: `Analyze the bankability of this African business owner:

Country: ${country}
Business sector: ${sector}
Monthly revenue (estimated): ${revenue || "Unknown"}
Monthly mobile money transactions: ${mobileRevenue || "Unknown"}
Years in business: ${years || "Unknown"}
Has formal bank account: ${hasFormalAccount || "Unknown"}

Please provide:
1. Bankability Assessment: Rate them on a 5-point scale across 4 dimensions (transaction history, business longevity, revenue consistency, documentation)
2. Credit Products They Could Access Now: Specific loan products available in ${country} at their current bankability level (with realistic amounts and terms)
3. The 90-Day Bankability Plan: Specific steps to become eligible for larger formal credit, with exact documents to gather
4. Mobile Money to Bank Bridge: How to use their mobile money history to satisfy bank KYC and credit requirements
5. Alternative Credit Sources: Non-bank lenders (SACCOs, MFIs, fintech lenders) that serve informal businesses in ${country}
6. Revenue-Based Financing Option: Whether they qualify for revenue-based financing and which providers operate in ${country}`,
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
            AI ENGINE 3
          </div>
          <h1 className="font-display text-4xl font-bold text-ink mb-3">
            Bankability Engine
          </h1>
          <p className="text-muted max-w-2xl leading-relaxed">
            600 million Africans use mobile money. Most banks still can&apos;t read it.
            The Bankability Engine translates your mobile transaction history, supplier relationships,
            and informal records into a bank-ready financial profile — so you can access the credit
            you&apos;ve already earned.
          </p>
        </div>

        <div className="mb-6">
          <AiEngineDisclaimer />
        </div>

        {/* Form */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-ink mb-5">Your business profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Country</label>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Kenya, Ghana, Senegal"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Business sector</label>
              <input type="text" value={sector} onChange={(e) => setSector(e.target.value)}
                placeholder="e.g. Market trader, tailor, agri-dealer"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Monthly revenue (USD approx.)</label>
              <input type="text" value={revenue} onChange={(e) => setRevenue(e.target.value)}
                placeholder="e.g. $500, $2,000"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Monthly mobile money volume</label>
              <input type="text" value={mobileRevenue} onChange={(e) => setMobileRevenue(e.target.value)}
                placeholder="e.g. $1,000 via M-Pesa"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Years in business</label>
              <input type="text" value={years} onChange={(e) => setYears(e.target.value)}
                placeholder="e.g. 3 years"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Has a formal bank account?</label>
              <select value={hasFormalAccount} onChange={(e) => setHasFormalAccount(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold">
                <option value="">Select</option>
                <option>Yes, business account</option>
                <option>Yes, personal account only</option>
                <option>No bank account</option>
              </select>
            </div>
          </div>

          <button onClick={handleAnalyze} disabled={!country || !sector || loading}
            className="w-full bg-deep-green text-ivory font-bold py-3.5 rounded-xl hover:bg-mid-green transition-colors disabled:opacity-50">
            {loading ? "Analyzing your bankability..." : "Get my bankability report →"}
          </button>
        </div>

        {result && (
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold text-ink mb-4">Your Bankability Report</h2>
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
