"use client";

import { useState, useRef, useEffect } from "react";
import { Nav } from "@/app/components/nav";
import Link from "next/link";

// ── Resource categories ────────────────────────────────────────────────────────

const RESOURCE_CATEGORIES = [
  { id: "crops",     icon: "🌾", label: "Farm Produce",     sub: "Crops, fruit, grains, vegetables" },
  { id: "livestock", icon: "🐄", label: "Livestock",         sub: "Cattle, goats, poultry, fish" },
  { id: "water",     icon: "🌊", label: "Water Access",      sub: "River, lake, coast, dam" },
  { id: "timber",    icon: "🌲", label: "Timber / Forest",   sub: "Wood, charcoal, firewood" },
  { id: "minerals",  icon: "⛏️", label: "Minerals / Earth",  sub: "Sand, stone, clay, ore" },
  { id: "land",      icon: "🏠", label: "Land or Space",     sub: "Farm land, urban property, warehouse" },
  { id: "skills",    icon: "🛠️", label: "A Skill or Trade",  sub: "What you know how to do" },
  { id: "community", icon: "🤝", label: "People / Network",  sub: "Relationships, community trust" },
  { id: "equipment", icon: "🚗", label: "Equipment",          sub: "Vehicle, machine, tools" },
  { id: "capital",   icon: "💰", label: "Money to Invest",   sub: "Savings or capital ready to deploy" },
  { id: "urban",     icon: "🏙️", label: "Busy Urban Area",   sub: "High foot traffic, market access" },
  { id: "unsure",    icon: "🤷", label: "Not Sure Yet",       sub: "Show me what's possible" },
];

const SPECIFICS: Record<string, { label: string; value: string }[]> = {
  crops: [
    { label: "Mango", value: "mango" },
    { label: "Cassava", value: "cassava" },
    { label: "Yam", value: "yam" },
    { label: "Maize / Corn", value: "maize" },
    { label: "Rice", value: "rice" },
    { label: "Coffee", value: "coffee" },
    { label: "Cacao / Cocoa", value: "cocoa" },
    { label: "Groundnuts", value: "groundnuts" },
    { label: "Plantain", value: "plantain" },
    { label: "Palm", value: "palm" },
    { label: "Shea", value: "shea" },
    { label: "Sorghum", value: "sorghum" },
    { label: "Tomatoes / Vegetables", value: "vegetables" },
    { label: "Garments / Textiles", value: "garments and textiles" },
    { label: "Other crops", value: "other crops" },
  ],
  livestock: [
    { label: "Cattle", value: "cattle" },
    { label: "Goats / Sheep", value: "goats" },
    { label: "Poultry / Eggs", value: "poultry" },
    { label: "Fish / Aquaculture", value: "fish" },
    { label: "Honey / Bees", value: "honey" },
    { label: "Pigs", value: "pigs" },
  ],
  skills: [
    { label: "Construction / Engineering", value: "construction and engineering" },
    { label: "Tech / Software", value: "technology and software" },
    { label: "Healthcare / Nursing", value: "healthcare" },
    { label: "Teaching / Training", value: "teaching and training" },
    { label: "Cooking / Food", value: "cooking and food preparation" },
    { label: "Sewing / Fashion / Garments", value: "sewing, fashion, and garment production" },
    { label: "Trading / Buying & Selling", value: "trading" },
    { label: "Mechanics / Repairs", value: "mechanics and repairs" },
    { label: "Accounting / Finance", value: "accounting and finance" },
    { label: "Transport / Driving", value: "transport and driving" },
  ],
  land: [
    { label: "Farming land (rural)", value: "rural farming land" },
    { label: "Urban property / plot", value: "urban property" },
    { label: "Commercial space", value: "commercial space" },
    { label: "Riverside / waterfront", value: "waterfront land" },
  ],
  water: [
    { label: "River or lake", value: "river or lake" },
    { label: "Coastal / ocean", value: "coastal access" },
    { label: "Irrigation dam", value: "dam or irrigation" },
    { label: "Borehole / well", value: "borehole or well" },
  ],
};

const COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "Senegal", "Côte d'Ivoire", "Ethiopia",
  "Uganda", "Tanzania", "Rwanda", "Cameroon", "Zambia", "DRC",
  "South Africa", "Morocco", "Egypt", "Burkina Faso", "Mali",
  "Benin", "Togo", "Zimbabwe", "Mozambique", "Angola", "Guinea",
  "Sierra Leone", "Liberia", "Niger", "Chad", "Sudan", "Tunisia",
  "Algeria", "Madagascar", "Malawi", "Botswana", "Namibia",
  "Other",
];

const CAPITAL_OPTIONS = [
  { value: "under $200", label: "Under $200" },
  { value: "$200 – $1,000", label: "$200 – $1K" },
  { value: "$1,000 – $5,000", label: "$1K – $5K" },
  { value: "$5,000 – $20,000", label: "$5K – $20K" },
  { value: "$20,000 – $100,000", label: "$20K – $100K" },
  { value: "over $100,000", label: "$100K+" },
];

// ── Markdown renderer ──────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  let listItems: React.ReactNode[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ol key={key++} className="space-y-2 mb-5 pl-1">
          {listItems}
        </ol>
      );
      listItems = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={key++} style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.25, marginTop: elements.length ? "2.5rem" : 0, marginBottom: "0.75rem", borderLeft: "3px solid #00C851", paddingLeft: "1rem" }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("**") && line.includes("**:")) {
      flushList();
      const match = line.match(/^\*\*([^*]+)\*\*:\s*(.*)/);
      if (match) {
        elements.push(
          <div key={key++} className="mb-4">
            <p style={{ fontSize: "9px", letterSpacing: "0.18em", color: "rgba(0,200,81,0.6)", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>{match[1]}</p>
            <p style={{ color: "rgba(253,250,244,0.75)", fontSize: "13.5px", lineHeight: 1.65 }}>{match[2]}</p>
          </div>
        );
      }
    } else if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s/, "");
      listItems.push(
        <li key={key++} className="flex items-start gap-3">
          <span style={{ color: "#00C851", fontWeight: 700, fontSize: "12px", minWidth: "18px", marginTop: "2px" }}>
            {listItems.length + 1}.
          </span>
          <span style={{ color: "rgba(253,250,244,0.75)", fontSize: "13px", lineHeight: 1.6 }}>{content}</span>
        </li>
      );
    } else if (line.startsWith("---")) {
      flushList();
      elements.push(<hr key={key++} style={{ borderColor: "rgba(255,255,255,0.07)", margin: "2rem 0" }} />);
    } else if (line.trim()) {
      flushList();
      elements.push(
        <p key={key++} style={{ color: "rgba(253,250,244,0.6)", fontSize: "13px", lineHeight: 1.7, marginBottom: "0.75rem" }}>
          {line}
        </p>
      );
    }
  }
  flushList();
  return elements;
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type Step = "resources" | "specifics" | "location" | "capital" | "results";

export default function BuildPage() {
  const [step, setStep] = useState<Step>("resources");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [specifics, setSpecifics] = useState<Set<string>>(new Set());
  const [country, setCountry] = useState("");
  const [capital, setCapital] = useState("");
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const needsSpecifics = ["crops", "livestock", "skills", "land", "water"].some(id => selected.has(id));
  const specificCategories = ["crops", "livestock", "skills", "land", "water"].filter(id => selected.has(id));

  useEffect(() => {
    if (outputRef.current && output) {
      outputRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [output]);

  function toggleResource(id: string) {
    if (id === "unsure") {
      setSelected(new Set(["unsure"]));
      return;
    }
    setSelected(prev => {
      const next = new Set(prev);
      next.delete("unsure");
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSpecific(value: string) {
    setSpecifics(prev => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }

  function goNext() {
    if (step === "resources") {
      if (needsSpecifics) setStep("specifics");
      else setStep("location");
    } else if (step === "specifics") {
      setStep("location");
    } else if (step === "location") {
      setStep("capital");
    } else if (step === "capital") {
      runDiscovery();
    }
  }

  async function runDiscovery() {
    setStep("results");
    setStreaming(true);
    setOutput("");

    const resources = Array.from(selected).map(id =>
      RESOURCE_CATEGORIES.find(r => r.id === id)?.label || id
    );

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resources,
          specifics: Array.from(specifics),
          country,
          capital,
        }),
      });
      if (!res.ok || !res.body) throw new Error("Failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput(prev => prev + decoder.decode(value));
      }
    } catch {
      setOutput("Something went wrong. Please try again.");
    } finally {
      setStreaming(false);
    }
  }

  function restart() {
    setStep("resources");
    setSelected(new Set());
    setSpecifics(new Set());
    setCountry("");
    setCapital("");
    setOutput("");
  }

  // ── Step: Resources ──────────────────────────────────────────────────────────
  if (step === "resources") {
    return (
      <div style={{ minHeight: "100vh", background: "#080620" }}>
        <Nav />
        <div className="max-w-[820px] mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="mb-12">
            <p style={{ fontSize: "9px", letterSpacing: "0.22em", color: "rgba(0,200,81,0.6)" }} className="font-semibold uppercase mb-4">
              Kebu Discovery Engine
            </p>
            <h1 style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", fontWeight: 700, fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.1, marginBottom: "1rem" }}>
              What do you have access to?
            </h1>
            <p style={{ color: "rgba(253,250,244,0.45)", fontSize: "15px", lineHeight: 1.7, maxWidth: "520px" }}>
              Don&apos;t think about business ideas yet. Just tell us what&apos;s around you.
              What you&apos;re already sitting next to might be worth more than you think.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
            {RESOURCE_CATEGORIES.map(cat => {
              const active = selected.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleResource(cat.id)}
                  className="text-left p-4 rounded-2xl transition-all"
                  style={{
                    background: active ? "rgba(0,200,81,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${active ? "rgba(0,200,81,0.35)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <div className="text-2xl mb-2">{cat.icon}</div>
                  <p style={{ color: active ? "#FAFAF8" : "rgba(253,250,244,0.7)", fontWeight: 600, fontSize: "13px", marginBottom: "3px" }}>
                    {cat.label}
                  </p>
                  <p style={{ color: "rgba(253,250,244,0.3)", fontSize: "11px", lineHeight: 1.4 }}>
                    {cat.sub}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            onClick={goNext}
            disabled={selected.size === 0}
            className="w-full sm:w-auto px-10 py-4 rounded-full font-bold text-sm uppercase tracking-[0.08em] transition-all disabled:opacity-30"
            style={{ background: "#00C851", color: "#0F0D33" }}
          >
            Show me what I&apos;m sitting next to →
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Specifics ──────────────────────────────────────────────────────────
  if (step === "specifics") {
    return (
      <div style={{ minHeight: "100vh", background: "#080620" }}>
        <Nav />
        <div className="max-w-[820px] mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="mb-10">
            <p style={{ fontSize: "9px", letterSpacing: "0.22em", color: "rgba(0,200,81,0.6)" }} className="font-semibold uppercase mb-4">
              Step 2 of 4
            </p>
            <h1 style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 2.5rem)", lineHeight: 1.15, marginBottom: "0.75rem" }}>
              Be more specific
            </h1>
            <p style={{ color: "rgba(253,250,244,0.45)", fontSize: "14px", lineHeight: 1.7 }}>
              Pick everything that applies. The more specific, the more targeted your discovery.
            </p>
          </div>

          <div className="space-y-8 mb-10">
            {specificCategories.map(catId => {
              const options = SPECIFICS[catId];
              if (!options) return null;
              const catLabel = RESOURCE_CATEGORIES.find(r => r.id === catId)?.label;
              return (
                <div key={catId}>
                  <p style={{ fontSize: "10px", letterSpacing: "0.18em", color: "rgba(253,250,244,0.4)", marginBottom: "12px" }} className="font-bold uppercase">
                    {catLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {options.map(opt => {
                      const active = specifics.has(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleSpecific(opt.value)}
                          className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                          style={{
                            background: active ? "rgba(0,200,81,0.12)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${active ? "rgba(0,200,81,0.4)" : "rgba(255,255,255,0.1)"}`,
                            color: active ? "#00C851" : "rgba(253,250,244,0.6)",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("resources")}
              className="px-6 py-3.5 rounded-full text-sm font-semibold transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(253,250,244,0.5)" }}>
              ← Back
            </button>
            <button onClick={goNext}
              className="px-10 py-3.5 rounded-full font-bold text-sm uppercase tracking-[0.08em] transition-all"
              style={{ background: "#00C851", color: "#0F0D33" }}>
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Location ───────────────────────────────────────────────────────────
  if (step === "location") {
    return (
      <div style={{ minHeight: "100vh", background: "#080620" }}>
        <Nav />
        <div className="max-w-[600px] mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="mb-10">
            <p style={{ fontSize: "9px", letterSpacing: "0.22em", color: "rgba(0,200,81,0.6)" }} className="font-semibold uppercase mb-4">
              Almost there
            </p>
            <h1 style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 2.5rem)", lineHeight: 1.15, marginBottom: "0.75rem" }}>
              Which country are you in?
            </h1>
            <p style={{ color: "rgba(253,250,244,0.45)", fontSize: "14px" }}>
              Business opportunities are market-specific. Your country changes everything.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-10">
            {COUNTRIES.map(c => (
              <button
                key={c}
                onClick={() => setCountry(c)}
                className="py-2.5 px-3 rounded-xl text-sm font-medium transition-all text-left"
                style={{
                  background: country === c ? "rgba(0,200,81,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${country === c ? "rgba(0,200,81,0.4)" : "rgba(255,255,255,0.07)"}`,
                  color: country === c ? "#00C851" : "rgba(253,250,244,0.55)",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => needsSpecifics ? setStep("specifics") : setStep("resources")}
              className="px-6 py-3.5 rounded-full text-sm font-semibold transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(253,250,244,0.5)" }}>
              ← Back
            </button>
            <button
              onClick={goNext}
              disabled={!country}
              className="px-10 py-3.5 rounded-full font-bold text-sm uppercase tracking-[0.08em] transition-all disabled:opacity-30"
              style={{ background: "#00C851", color: "#0F0D33" }}>
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Capital ────────────────────────────────────────────────────────────
  if (step === "capital") {
    return (
      <div style={{ minHeight: "100vh", background: "#080620" }}>
        <Nav />
        <div className="max-w-[600px] mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="mb-10">
            <p style={{ fontSize: "9px", letterSpacing: "0.22em", color: "rgba(0,200,81,0.6)" }} className="font-semibold uppercase mb-4">
              Last question
            </p>
            <h1 style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 2.5rem)", lineHeight: 1.15, marginBottom: "0.75rem" }}>
              How much can you invest to start?
            </h1>
            <p style={{ color: "rgba(253,250,244,0.45)", fontSize: "14px" }}>
              Be honest. We&apos;ll find ideas that work for where you actually are right now.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
            {CAPITAL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setCapital(opt.value)}
                className="py-4 px-4 rounded-2xl text-center font-semibold transition-all"
                style={{
                  background: capital === opt.value ? "rgba(0,200,81,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${capital === opt.value ? "rgba(0,200,81,0.4)" : "rgba(255,255,255,0.07)"}`,
                  color: capital === opt.value ? "#00C851" : "rgba(253,250,244,0.6)",
                  fontSize: "14px",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("location")}
              className="px-6 py-3.5 rounded-full text-sm font-semibold transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(253,250,244,0.5)" }}>
              ← Back
            </button>
            <button
              onClick={goNext}
              disabled={!capital}
              className="px-10 py-3.5 rounded-full font-bold text-sm uppercase tracking-[0.08em] transition-all disabled:opacity-30"
              style={{ background: "#00C851", color: "#0F0D33" }}>
              Show me what I can build →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Results ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#080620" }}>
      <Nav />

      <div style={{ background: "#0F0D33", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-[900px] mx-auto px-5 sm:px-8 py-12">
          <p style={{ fontSize: "9px", letterSpacing: "0.22em", color: "rgba(0,200,81,0.6)" }} className="font-semibold uppercase mb-4">
            Your Discovery
          </p>
          <h1 style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", fontWeight: 700, fontSize: "clamp(1.8rem, 4vw, 2.5rem)", lineHeight: 1.15, marginBottom: "0.5rem" }}>
            Here&apos;s what you&apos;re sitting next to
          </h1>
          <p style={{ color: "rgba(253,250,244,0.4)", fontSize: "13px" }}>
            {country} · {capital} to start
          </p>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-5 sm:px-8 py-12">
        <div ref={outputRef}>
          {streaming && !output && (
            <div className="flex items-center gap-3 py-8">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#00C851", animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p style={{ color: "rgba(253,250,244,0.4)", fontSize: "13px" }}>
                Analysing what you have access to...
              </p>
            </div>
          )}

          {output && (
            <div className="mb-12">
              {renderMarkdown(output)}
              {streaming && (
                <span className="inline-block w-2 h-4 ml-1 animate-pulse" style={{ background: "#00C851", verticalAlign: "middle" }} />
              )}
            </div>
          )}
        </div>

        {!streaming && output && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "2.5rem" }} className="space-y-6">
            <p style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              Ready to go deeper?
            </p>
            <p style={{ color: "rgba(253,250,244,0.45)", fontSize: "13px", lineHeight: 1.7, maxWidth: "520px" }}>
              Next: register a Kebu ID business and check your Business Readiness (Kebu Score preview).
              Full Kebu Score from store activity comes after you are operating on the platform — it does not unlock funding by itself.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/business/register"
                className="inline-flex items-center gap-2 font-bold text-sm uppercase tracking-[0.08em] px-8 py-4 rounded-full transition-all"
                style={{ background: "#FF5500", color: "#0A0A0A" }}>
                Register a business →
              </Link>
              <Link href="/ka-score"
                className="inline-flex items-center gap-2 font-semibold text-sm uppercase tracking-[0.08em] px-8 py-4 rounded-full transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(253,250,244,0.7)" }}>
                View Kebu Score
              </Link>
            </div>

            <button
              onClick={restart}
              className="text-xs font-semibold uppercase tracking-widest transition-all"
              style={{ color: "rgba(0,200,81,0.5)", letterSpacing: "0.14em" }}>
              ← Discover something else
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
