"use client";

import { useState } from "react";
import { Nav } from "@/app/components/nav";
import { CAPITAL_TYPES, CAPITAL_WISDOM } from "@/lib/data/capital-intelligence";
import { AiEngineDisclaimer } from "@/app/components/ai-engine-disclaimer";

const OUTCOME_COLORS = {
  good: "bg-light-green/10 border-light-green/30 text-mid-green",
  bad: "bg-red-earth/10 border-red-earth/30 text-red-earth",
  mixed: "bg-gold/10 border-gold/30 text-gold-dark",
};

const OUTCOME_LABEL = {
  good: "Worked",
  bad: "Went wrong",
  mixed: "Mixed result",
};

export default function CapitalPage() {
  const [active, setActive] = useState("debt");
  const [expandedExamples, setExpandedExamples] = useState<Record<string, boolean>>({});
  const [aiQ, setAiQ] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const current = CAPITAL_TYPES.find((c) => c.id === active)!;

  function toggleExample(key: string) {
    setExpandedExamples((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function askCapitalAdvisor() {
    if (!aiQ.trim()) return;
    setAiLoading(true);
    setAiResult("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are Kebu's Capital Advisor — a straight-talking friend who has seen African entrepreneurs lose their businesses to the wrong investors and watched others build empires with the right capital.

Your core philosophy:
- Taking money is only good if you can still move how you want to move
- The wrong check costs more than it's worth
- Debt doesn't care about your harvest. Angels can slow you down. Family offices go sour on values. Crowdfunding is public accountability. VC is rocket fuel — don't take it if you're not ready to move fast. PE does not play about numbers.
- Bootstrapping is severely underrated in Africa
- Most African businesses should NOT take VC — they should stay private, stay lean, stay in control

You know the African capital landscape deeply:
- Development Finance Institutions (AFREXIMBANK, IFC, OPIC, Proparco, DEG, FMO, CDC/BII) offer far cheaper capital than commercial banks
- Grants available: Tony Elumelu Foundation ($5,000 non-dilutive), Norrsken, She Leads Africa, AWIEF, AfDB grants, USAID DIV, etc.
- The difference between an MFI at 30% and a DFI at 6% can mean bankruptcy vs. profitability
- Real examples: Dangote (debt done right), Laiterie du Berger (DFI smart), Wave (patient capital), Flutterwave (VC done right), various founders pushed out by PE

Be specific. Be honest. Warn about mistakes. Sound like a brilliant older cousin who's seen it all, not a banker trying to sell a product.

Format your answers conversationally — no bullet points unless listing specific options. Talk directly to the person.`,
          prompt: aiQ,
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
        setAiResult(text);
      }
    } catch {
      setAiResult("Something went wrong. Try again.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-ivory">
      <Nav />

      {/* Hero */}
      <div className="bg-deep-green text-ivory py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-gold bg-gold/15 px-3 py-1.5 rounded-full mb-5">
            CAPITAL INTELLIGENCE
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            The wrong check costs<br />more than it&apos;s worth.
          </h1>
          <p className="text-ivory/75 text-lg max-w-2xl leading-relaxed">
            Every type of funding comes with strings. Some strings are fine. Others will take your company.
            Learn the truth about each one — from someone who&apos;s not trying to sell it to you.
          </p>
        </div>
      </div>

      {/* Core message banner */}
      <div className="bg-gold text-deep-green py-4 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-display text-lg font-bold">
            &ldquo;{CAPITAL_WISDOM.core_message}&rdquo;
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* Stage fit table */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-8">
          <h2 className="font-display text-lg font-bold text-ink mb-4">What type of capital fits your stage?</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted uppercase tracking-wide">Stage</th>
                  <th className="text-left py-2 text-xs font-semibold text-muted uppercase tracking-wide">Right capital</th>
                </tr>
              </thead>
              <tbody>
                {CAPITAL_WISDOM.investor_type_fit.map((row) => (
                  <tr key={row.stage} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-ink">{row.stage}</td>
                    <td className="py-3 text-muted">{row.fits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bootstrapping callout */}
        <div className="bg-deep-green text-ivory rounded-2xl p-6 mb-8">
          <div className="text-xs font-bold text-gold uppercase tracking-widest mb-2">Before you raise anything</div>
          <p className="text-ivory/90 leading-relaxed">{CAPITAL_WISDOM.the_bootstrapping_case}</p>
        </div>

        {/* Capital type nav */}
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-ink mb-4">Choose what you want to understand</h2>
          <div className="flex flex-wrap gap-2">
            {CAPITAL_TYPES.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  active === c.id
                    ? "bg-deep-green text-ivory border-deep-green"
                    : "bg-white text-ink border-border hover:border-deep-green"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Capital type detail */}
        <div className="bg-white border border-border rounded-2xl overflow-hidden mb-8">
          {/* Header */}
          <div className="bg-deep-green text-ivory p-6">
            <h3 className="font-display text-2xl font-bold mb-1">{current.name}</h3>
            <p className="text-gold font-medium text-lg">&ldquo;{current.tagline}&rdquo;</p>
          </div>

          <div className="p-6 space-y-6">
            {/* The truth */}
            <div>
              <div className="text-xs font-bold text-gold uppercase tracking-widest mb-2">The truth</div>
              <p className="text-ink leading-relaxed">{current.the_truth}</p>
            </div>

            {/* How it works */}
            <div>
              <div className="text-xs font-bold text-muted uppercase tracking-widest mb-2">How it works</div>
              <p className="text-ink/80 leading-relaxed">{current.how_it_works}</p>
            </div>

            {/* Range and return */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-warm-ivory rounded-xl p-4">
                <div className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Typical range</div>
                <p className="text-ink font-semibold">{current.typical_range}</p>
              </div>
              <div className="bg-warm-ivory rounded-xl p-4">
                <div className="text-xs font-bold text-muted uppercase tracking-widest mb-1">What they want back</div>
                <p className="text-ink font-semibold">{current.what_they_want_back}</p>
              </div>
            </div>

            {/* Best for / not for */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-mid-green uppercase tracking-widest mb-2">Best for</div>
                <ul className="space-y-1">
                  {current.best_for.map((b, i) => (
                    <li key={i} className="text-sm text-ink flex gap-2">
                      <span className="text-light-green mt-0.5 flex-shrink-0">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-bold text-red-earth uppercase tracking-widest mb-2">Not for</div>
                <ul className="space-y-1">
                  {current.not_for.map((n, i) => (
                    <li key={i} className="text-sm text-ink flex gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Red flags / Green flags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-red-earth/10 border border-red-earth/20 rounded-xl p-4">
                <div className="text-xs font-bold text-red-earth uppercase tracking-widest mb-2">🚩 Red flags</div>
                <ul className="space-y-1.5">
                  {current.red_flags.map((f, i) => (
                    <li key={i} className="text-sm text-red-earth">{f}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-light-green/10 border border-light-green/20 rounded-xl p-4">
                <div className="text-xs font-bold text-mid-green uppercase tracking-widest mb-2">✅ Green flags</div>
                <ul className="space-y-1.5">
                  {current.green_flags.map((f, i) => (
                    <li key={i} className="text-sm text-mid-green">{f}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Real examples */}
            <div>
              <div className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Real examples</div>
              <div className="space-y-3">
                {current.real_examples.map((ex, i) => {
                  const key = `${current.id}-${i}`;
                  const open = expandedExamples[key];
                  return (
                    <div
                      key={i}
                      className={`border rounded-xl overflow-hidden ${OUTCOME_COLORS[ex.outcome]}`}
                    >
                      <button
                        className="w-full flex items-center justify-between p-4 text-left"
                        onClick={() => toggleExample(key)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-current opacity-70">
                            {OUTCOME_LABEL[ex.outcome]}
                          </span>
                          <span className="font-semibold text-sm">{ex.name}</span>
                        </div>
                        <span className="text-lg">{open ? "−" : "+"}</span>
                      </button>
                      {open && (
                        <div className="px-4 pb-4 space-y-2">
                          <p className="text-sm leading-relaxed">{ex.what_happened}</p>
                          <div className="mt-2 pt-2 border-t border-current/20">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-70">The lesson: </span>
                            <span className="text-sm font-medium">{ex.lesson}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Questions to ask yourself */}
            <div className="bg-gold/10 border border-gold/30 rounded-xl p-4">
              <div className="text-xs font-bold text-gold uppercase tracking-widest mb-3">Before you sign anything, ask yourself</div>
              <ul className="space-y-2">
                {current.questions_to_ask_yourself.map((q, i) => (
                  <li key={i} className="text-sm text-ink flex gap-2">
                    <span className="text-gold font-bold flex-shrink-0">{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Before you take any money */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-8">
          <h3 className="font-display text-lg font-bold text-ink mb-4">Before you take any money — any type, from anyone</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CAPITAL_WISDOM.before_you_take_any_money.map((item, i) => (
              <div key={i} className="flex gap-3 py-2">
                <span className="w-6 h-6 bg-deep-green text-ivory text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-ink">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Capital Advisor */}
        <div className="bg-deep-green rounded-2xl p-6">
          <div className="text-xs font-bold text-gold uppercase tracking-widest mb-2">Capital Advisor</div>
          <h3 className="font-display text-xl font-bold text-ivory mb-2">Ask anything about funding</h3>
          <p className="text-ivory/70 text-sm mb-5">
            What type of capital fits your business? Should you take this investor&apos;s offer? What should a term sheet say?
            Ask straight — get a straight answer.
          </p>
          <div className="mb-4">
            <AiEngineDisclaimer compact />
          </div>
          <textarea
            value={aiQ}
            onChange={(e) => setAiQ(e.target.value)}
            rows={3}
            placeholder="E.g. 'I have a 2-year-old food business in Accra making $80K/year. A local angel wants 20% for $100K. Is that fair?'"
            className="w-full bg-white/10 border border-ivory/20 rounded-xl p-4 text-ivory placeholder:text-ivory/40 text-sm resize-none focus:outline-none focus:border-gold mb-4"
          />
          <button
            onClick={askCapitalAdvisor}
            disabled={aiLoading || !aiQ.trim()}
            className="bg-gold text-deep-green font-bold px-6 py-2.5 rounded-full text-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {aiLoading ? "Thinking..." : "Get honest advice"}
          </button>
          {aiResult && (
            <div className="mt-6 bg-white/10 rounded-xl p-5 text-ivory/90 text-sm leading-relaxed whitespace-pre-wrap">
              {aiResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
