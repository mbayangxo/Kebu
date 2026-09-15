"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KebuWordmark } from "@/app/components/kebu-mark";
import { KEBU } from "@/lib/kebu-brand";
import {
  BUDGET_BANDS,
  KEBU_HERE_FOR,
  OPPORTUNITY_GOALS,
  OPPORTUNITY_INTERESTS,
  OPPORTUNITY_RESOURCE_NEEDS,
} from "@/lib/opportunity/intake-schema";
import {
  readStoredWorkspace,
  workspaceHome,
} from "@/lib/navigation/kebu-workspace";

const AFRICAN_COUNTRY_OPTIONS = [
  { code: "SN", name: "Senegal" },
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "RW", name: "Rwanda" },
  { code: "MA", name: "Morocco" },
  { code: "ET", name: "Ethiopia" },
  { code: "EG", name: "Egypt" },
];

// Pill-shaped tag chip (for multi-select: goals, resource needs, countries)
function Tag({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all"
      style={{
        background: active ? KEBU.orange : KEBU.white,
        color: active ? KEBU.white : KEBU.black,
        border: `1.5px solid ${active ? KEBU.orange : KEBU.border}`,
        boxShadow: active ? "0 4px 16px rgba(255,85,0,0.2)" : "none",
      }}
    >
      {active && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {children}
    </button>
  );
}

const INTEREST_ICONS: Record<string, string> = {
  construction_bidding: "🏗️",
  agriculture_resources: "🌾",
  grants_funding: "🎯",
  loans_credit: "💰",
  jobs_employment: "💼",
  trade_import_export: "🚢",
  tech_software: "💻",
  creative_media: "🎨",
  ancestry_heritage: "🪢",
  retail_store: "🛍️",
  manufacturing: "🔧",
};

const BUDGET_ICONS: Record<string, string> = {
  under_50k: "🌱",
  "50k_500k": "📦",
  "500k_5m": "⚙️",
  "5m_plus": "🏦",
  not_sure: "🤷",
};

// Card chip (for single-select with icon + description: main goal, interests, budget)
function Card({
  active,
  onClick,
  icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 transition-all"
      style={{
        background: active ? "rgba(255,85,0,0.06)" : KEBU.white,
        border: `2px solid ${active ? KEBU.orange : KEBU.border}`,
        boxShadow: active ? "0 0 0 4px rgba(255,85,0,0.08)" : "none",
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5 shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: KEBU.black }}>{label}</p>
          {desc && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: KEBU.muted }}>{desc}</p>}
        </div>
        <div
          className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5"
          style={{
            borderColor: active ? KEBU.orange : KEBU.border,
            background: active ? KEBU.orange : "transparent",
          }}
        >
          {active && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: KEBU.orange }}>
      {children}
    </p>
  );
}

function StepHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-2xl font-bold mb-1.5 leading-tight"
      style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
    >
      {children}
    </h2>
  );
}

function StepSub({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm mb-6 leading-relaxed" style={{ color: KEBU.muted }}>
      {children}
    </p>
  );
}

export function KebuWelcomeIntake() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextPath =
    rawNext ||
    (readStoredWorkspace() ? workspaceHome(readStoredWorkspace()!) : "/start");

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animDir, setAnimDir] = useState<"forward" | "back">("forward");
  const [animKey, setAnimKey] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const [mainGoal, setMainGoal] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [interestPaths, setInterestPaths] = useState<string[]>([]);
  const [resourceNeeds, setResourceNeeds] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [countryCodes, setCountryCodes] = useState<string[]>([]);
  const [enjoyDoing, setEnjoyDoing] = useState("");

  const totalSteps = 6;

  function exploringMode(): boolean {
    const ids = new Set(["just_browsing", "explore_africa", "learn_skills", "find_my_path"]);
    return ids.has(mainGoal) || goals.some((g) => ids.has(g));
  }

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/me/opportunity-profile", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as {
        profile?: {
          mainGoal?: string | null;
          goals?: string[];
          interestPaths?: string[];
          resourceNeeds?: string[];
          startingBudgetBand?: string | null;
          preferredCountryCodes?: string[];
          enjoyDoing?: string;
        };
        needsIntake?: boolean;
      };
      if (!data.needsIntake && data.profile) {
        router.replace(nextPath);
        return;
      }
      const p = data.profile;
      if (!p) return;
      if (p.mainGoal) setMainGoal(p.mainGoal);
      if (p.goals?.length) setGoals(p.goals);
      if (p.interestPaths?.length) setInterestPaths(p.interestPaths);
      if (p.resourceNeeds?.length) setResourceNeeds(p.resourceNeeds);
      if (p.startingBudgetBand) setBudget(p.startingBudgetBand);
      if (p.preferredCountryCodes?.length) setCountryCodes(p.preferredCountryCodes);
      if (p.enjoyDoing) setEnjoyDoing(p.enjoyDoing);
    })();
  }, [router, nextPath]);

  function toggle(arr: string[], id: string, set: (v: string[]) => void) {
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  function goTo(next: number) {
    setAnimDir(next > step ? "forward" : "back");
    setAnimKey((k) => k + 1);
    setStep(next);
    contentRef.current?.scrollTo({ top: 0 });
  }

  async function finish() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/me/opportunity-profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mainGoal: mainGoal || goals[0] || "explore_africa",
        goals: goals.length ? goals : [mainGoal || "explore_africa"],
        interestPaths,
        resourceNeeds,
        startingBudgetBand: budget || "not_sure",
        preferredCountryCodes: countryCodes,
        enjoyDoing,
        intakeComplete: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save. Sign in and try again.");
      return;
    }
    router.push(
      rawNext === "/dashboard" && !readStoredWorkspace() ? "/start?next=/dashboard" : nextPath,
    );
    router.refresh();
  }

  function canNext(): boolean {
    if (step === 1) return Boolean(mainGoal);
    if (step === 2) return goals.length > 0;
    if (step === 3) return exploringMode() || interestPaths.length > 0;
    if (step === 4) return exploringMode() || resourceNeeds.length > 0;
    if (step === 5) return Boolean(budget) || exploringMode();
    return true;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: KEBU.bright }}>
      <style>{`
        @keyframes step-in-forward {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes step-in-back {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .step-animate-forward { animation: step-in-forward 0.28s cubic-bezier(0.22,1,0.36,1) both; }
        .step-animate-back    { animation: step-in-back 0.28s cubic-bezier(0.22,1,0.36,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .step-animate-forward, .step-animate-back { animation: none; }
        }
      `}</style>

      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-4 px-5 sm:px-8 h-[60px] shrink-0"
        style={{ background: KEBU.bright, borderBottom: `1px solid ${KEBU.border}` }}
      >
        <Link href="/" className="shrink-0">
          <KebuWordmark size={26} dark />
        </Link>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(10,10,10,0.07)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round((step / totalSteps) * 100)}%`,
              background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})`,
            }}
          />
        </div>
        <span className="shrink-0 text-[11px] font-bold tabular-nums" style={{ color: KEBU.muted }}>
          {step > 0 ? `${step} / ${totalSteps}` : ""}
        </span>
      </header>

      {/* Scrollable content */}
      <main ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-5 sm:px-8 py-10 pb-28">
          <div
            key={animKey}
            className={animDir === "forward" ? "step-animate-forward" : "step-animate-back"}
          >

            {step === 0 && (
              <div>
                <StepLabel>Welcome to Kebu</StepLabel>
                <h1
                  className="text-3xl sm:text-4xl font-bold mb-2 leading-tight"
                  style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
                >
                  What are you here to build?
                </h1>
                <p className="text-sm mb-8 leading-relaxed" style={{ color: KEBU.muted }}>
                  3 minutes — personalizes your entire Kebu experience.
                  You don't need a business to start.
                </p>

                <div className="grid grid-cols-1 gap-3 mb-8">
                  {[
                    { icon: "🌍", title: "Explore Africa", desc: "Countries, resources, opportunities, culture — understand the continent" },
                    { icon: "🌐", title: "Build a site or store", desc: "Get online fast — site, shop, or brand live in minutes" },
                    { icon: "💼", title: "Grow a business", desc: "Kebu ID, B2B directory, search, email, clients across Africa" },
                    { icon: "✨", title: "Find opportunities", desc: "Grants, fellowships, tenders, jobs — curated for you" },
                  ].map((c) => (
                    <div
                      key={c.title}
                      className="flex items-start gap-4 rounded-2xl p-4"
                      style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{c.icon}</span>
                      <div>
                        <p className="font-bold text-sm" style={{ color: KEBU.black }}>{c.title}</p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: KEBU.muted }}>{c.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => goTo(1)}
                  className="w-full rounded-2xl py-4 text-sm font-bold transition-all hover:brightness-105"
                  style={{ background: KEBU.orange, color: KEBU.white }}
                >
                  Get started →
                </button>
                <p className="text-xs mt-4 text-center" style={{ color: KEBU.faint }}>
                  <Link href="/opportunity" style={{ color: KEBU.muted, textDecoration: "underline" }}>
                    Skip for now
                  </Link>
                  {" "}— you can personalize anytime from your home page
                </p>
              </div>
            )}

            {step === 1 && (
              <div>
                <StepLabel>About you</StepLabel>
                <StepHeading>What are you here for right now?</StepHeading>
                <StepSub>Pick the closest match — this is personal, not a business profile.</StepSub>
                <div className="space-y-2.5">
                  {KEBU_HERE_FOR.map((g) => (
                    <Card
                      key={g.id}
                      active={mainGoal === g.id}
                      onClick={() => setMainGoal(g.id)}
                      icon={g.icon}
                      label={g.label}
                      desc={g.desc}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <StepLabel>Goals</StepLabel>
                <StepHeading>What else matters to you?</StepHeading>
                <StepSub>Pick as many as you like.</StepSub>
                <div className="flex flex-wrap gap-2">
                  {[...KEBU_HERE_FOR, ...OPPORTUNITY_GOALS].filter(
                    (g, i, arr) => arr.findIndex((x) => x.id === g.id) === i,
                  ).map((g) => (
                    <Tag key={g.id} active={goals.includes(g.id)} onClick={() => toggle(goals, g.id, setGoals)}>
                      {"icon" in g && g.icon ? `${g.icon} ` : ""}
                      {g.label}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <StepLabel>Interests</StepLabel>
                <StepHeading>What are you curious about?</StepHeading>
                <StepSub>
                  {exploringMode() ? "Optional — tap Continue to skip." : "Pick at least one area."}
                </StepSub>
                <div className="space-y-2.5">
                  {OPPORTUNITY_INTERESTS.map((item) => (
                    <Card
                      key={item.id}
                      active={interestPaths.includes(item.id)}
                      onClick={() => toggle(interestPaths, item.id, setInterestPaths)}
                      icon={INTEREST_ICONS[item.id] ?? "📌"}
                      label={item.label}
                      desc={item.desc}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <StepLabel>Resources</StepLabel>
                <StepHeading>What kind of support might you need?</StepHeading>
                <StepSub>
                  Grants, jobs, heritage stories, country intel…{exploringMode() ? " Optional for now." : ""}
                </StepSub>
                <div className="flex flex-wrap gap-2">
                  {OPPORTUNITY_RESOURCE_NEEDS.map((r) => (
                    <Tag
                      key={r.id}
                      active={resourceNeeds.includes(r.id)}
                      onClick={() => toggle(resourceNeeds, r.id, setResourceNeeds)}
                    >
                      {r.label}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <StepLabel>Starting point</StepLabel>
                <StepHeading>How much could you start with?</StepHeading>
                <StepSub>
                  Honest answer helps us show the right opportunities. "Not sure" is perfectly fine.
                </StepSub>
                <div className="space-y-2.5">
                  {BUDGET_BANDS.map((b) => (
                    <Card
                      key={b.id}
                      active={budget === b.id}
                      onClick={() => setBudget(b.id)}
                      icon={BUDGET_ICONS[b.id] ?? "💰"}
                      label={b.label}
                      desc={b.hint}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-7">
                <div>
                  <StepLabel>Your Africa</StepLabel>
                  <StepHeading>Which countries matter to you?</StepHeading>
                  <StepSub>Home, diaspora, or markets you want to reach — pick all that apply.</StepSub>
                  <div className="flex flex-wrap gap-2">
                    {AFRICAN_COUNTRY_OPTIONS.map((c) => (
                      <Tag
                        key={c.code}
                        active={countryCodes.includes(c.code)}
                        onClick={() => toggle(countryCodes, c.code, setCountryCodes)}
                      >
                        {c.name}
                      </Tag>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="block font-bold text-sm mb-2" style={{ color: KEBU.black }}>
                    What do you enjoy — or want to try?
                  </span>
                  <textarea
                    value={enjoyDoing}
                    onChange={(e) => setEnjoyDoing(e.target.value)}
                    rows={3}
                    placeholder="e.g. music, farming, fixing phones, teaching kids, design…"
                    className="w-full rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: KEBU.white,
                      border: `1.5px solid ${KEBU.border}`,
                      color: KEBU.black,
                      outline: "none",
                    }}
                  />
                </label>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Sticky bottom navigation */}
      <div
        className="sticky bottom-0 z-20 px-5 sm:px-8 py-4"
        style={{
          background: KEBU.bright,
          borderTop: `1px solid ${KEBU.border}`,
        }}
      >
        <div className="max-w-xl mx-auto flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              className="rounded-xl px-5 py-3 text-sm font-semibold transition-all"
              style={{
                background: "transparent",
                border: `1.5px solid ${KEBU.border}`,
                color: KEBU.muted,
              }}
            >
              ← Back
            </button>
          )}
          <div className="flex-1" />
          {step === 0 && (
            <button
              type="button"
              onClick={() => goTo(1)}
              className="rounded-xl px-6 py-3 text-sm font-bold transition-all hover:brightness-105"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              Get started →
            </button>
          )}
          {step > 0 && step < 6 && (
            <button
              type="button"
              disabled={!canNext()}
              onClick={() => goTo(step + 1)}
              className="rounded-xl px-6 py-3 text-sm font-bold transition-all hover:brightness-105 disabled:opacity-40"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              Continue →
            </button>
          )}
          {step === 6 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void finish()}
              className="rounded-xl px-6 py-3 text-sm font-bold transition-all hover:brightness-105 disabled:opacity-40"
              style={{ background: KEBU.black, color: KEBU.white }}
            >
              {busy ? "Saving…" : "Personalize my Kebu →"}
            </button>
          )}
        </div>
        {error && (
          <p className="max-w-xl mx-auto text-xs mt-2" style={{ color: KEBU.red }}>{error}</p>
        )}
      </div>
    </div>
  );
}
