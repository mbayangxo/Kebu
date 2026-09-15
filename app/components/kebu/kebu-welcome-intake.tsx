"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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

const C = {
  bg: KEBU.black,
  card: "rgba(255,255,255,0.05)",
  cardBorder: "rgba(255,255,255,0.1)",
  cardHover: "rgba(255,255,255,0.08)",
  activeCard: KEBU.orange,
  activeBorder: KEBU.orange,
  text: KEBU.white,
  muted: "rgba(255,255,255,0.5)",
  faint: "rgba(255,255,255,0.25)",
  bar: KEBU.orange,
} as const;

function Chip({
  active,
  onClick,
  children,
  large = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl transition-all ${large ? "p-5" : "px-4 py-2.5"}`}
      style={{
        background: active ? KEBU.orange : C.card,
        color: active ? KEBU.white : C.text,
        border: `1px solid ${active ? C.activeBorder : C.cardBorder}`,
        boxShadow: active ? "0 8px 24px rgba(255,85,0,0.35)" : "none",
      }}
    >
      {children}
    </button>
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
    <div
      className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text }}
    >
      {/* Ambient orbs */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: `radial-gradient(ellipse 55% 40% at 90% 0%, rgba(255,85,0,0.18), transparent 55%),
                       radial-gradient(ellipse 40% 35% at 5% 100%, rgba(225,6,0,0.12), transparent 50%)`,
        }}
        aria-hidden
      />

      {/* Top bar */}
      <header
        className="relative z-10 flex items-center justify-between px-6 py-5 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link href="/">
          <KebuWordmark size={28} dark={false} />
        </Link>
        {step > 0 && (
          <span className="text-xs font-semibold" style={{ color: C.faint }}>
            {step} / {totalSteps}
          </span>
        )}
      </header>

      {/* Progress bar */}
      <div className="relative z-10 h-[3px] w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${Math.round((step / totalSteps) * 100)}%`,
            background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})`,
          }}
        />
      </div>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 py-10 pb-20">
        <div className="w-full max-w-2xl">

          {step === 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: KEBU.orange }}>
                Welcome to Kebu
              </p>
              <h1
                className="text-4xl sm:text-5xl font-bold mb-4 leading-[1.05]"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                What can we help you do?
              </h1>
              <p className="text-base mb-10" style={{ color: C.muted }}>
                Takes 3 minutes. Personalizes your entire Kebu experience — Opportunity OS, Yande AI, your dashboard.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 mb-10">
                {[
                  { icon: "🌍", title: "Explore Africa", desc: "Countries, resources, opportunities, heritage" },
                  { icon: "🚀", title: "Build something", desc: "Site, store, or brand — live in minutes" },
                  { icon: "💼", title: "Grow a business", desc: "Kebu ID, B2B directory, clients across Africa" },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-2xl p-5"
                    style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
                  >
                    <span className="text-3xl block mb-3">{card.icon}</span>
                    <p className="font-bold text-sm mb-1">{card.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: C.muted }}>{card.desc}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full px-10 py-4 text-sm font-bold"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                Let&apos;s go →
              </button>
              <p className="text-xs mt-5" style={{ color: C.faint }}>
                <Link href="/opportunity" style={{ color: KEBU.orange }}>
                  Skip for now
                </Link>{" "}
                — you can personalize anytime
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: KEBU.orange }}>
                About you
              </p>
              <h2
                className="text-3xl font-bold mb-2"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                What are you here for right now?
              </h2>
              <p className="text-sm mb-6" style={{ color: C.muted }}>
                Pick the closest match. This is personal — not a business profile.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {KEBU_HERE_FOR.map((g) => (
                  <Chip key={g.id} active={mainGoal === g.id} onClick={() => setMainGoal(g.id)} large>
                    <span className="text-2xl mb-2 block">{g.icon}</span>
                    <span className="font-bold text-sm">{g.label}</span>
                    <span className="text-xs mt-1 block" style={{ opacity: 0.75 }}>{g.desc}</span>
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: KEBU.orange }}>
                Goals
              </p>
              <h2
                className="text-3xl font-bold mb-2"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                What else matters to you?
              </h2>
              <p className="text-sm mb-6" style={{ color: C.muted }}>
                Pick as many as you like.
              </p>
              <div className="flex flex-wrap gap-2">
                {[...KEBU_HERE_FOR, ...OPPORTUNITY_GOALS].filter(
                  (g, i, arr) => arr.findIndex((x) => x.id === g.id) === i,
                ).map((g) => (
                  <Chip key={g.id} active={goals.includes(g.id)} onClick={() => toggle(goals, g.id, setGoals)}>
                    {"icon" in g && g.icon ? `${g.icon} ` : ""}
                    {g.label}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: KEBU.orange }}>
                Interests
              </p>
              <h2
                className="text-3xl font-bold mb-2"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                What are you curious about?
              </h2>
              <p className="text-sm mb-6" style={{ color: C.muted }}>
                {exploringMode() ? "Optional — skip with Continue if you are just exploring." : "Pick at least one."}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {OPPORTUNITY_INTERESTS.map((item) => (
                  <Chip
                    key={item.id}
                    active={interestPaths.includes(item.id)}
                    onClick={() => toggle(interestPaths, item.id, setInterestPaths)}
                    large
                  >
                    <p className="font-bold text-sm">{item.label}</p>
                    <p className="text-xs mt-1" style={{ opacity: 0.75 }}>{item.desc}</p>
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: KEBU.orange }}>
                Resources
              </p>
              <h2
                className="text-3xl font-bold mb-2"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                What kind of help might you need?
              </h2>
              <p className="text-sm mb-6" style={{ color: C.muted }}>
                Grants, jobs, heritage, country intel…{exploringMode() ? " Optional for now." : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {OPPORTUNITY_RESOURCE_NEEDS.map((r) => (
                  <Chip
                    key={r.id}
                    active={resourceNeeds.includes(r.id)}
                    onClick={() => toggle(resourceNeeds, r.id, setResourceNeeds)}
                  >
                    {r.label}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: KEBU.orange }}>
                Starting point
              </p>
              <h2
                className="text-3xl font-bold mb-2"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                How much could you start with?
              </h2>
              <p className="text-sm mb-6" style={{ color: C.muted }}>
                Honest answer helps us surface the right opportunities. &quot;Not sure&quot; is perfectly fine.
              </p>
              <div className="space-y-3 max-w-lg">
                {BUDGET_BANDS.map((b) => (
                  <Chip key={b.id} active={budget === b.id} onClick={() => setBudget(b.id)} large>
                    <p className="font-bold">{b.label}</p>
                    <p className="text-xs mt-1" style={{ opacity: 0.75 }}>{b.hint}</p>
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: KEBU.orange }}>
                  Your Africa
                </p>
                <h2
                  className="text-3xl font-bold mb-2"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  Which countries matter to you?
                </h2>
                <p className="text-sm mb-6" style={{ color: C.muted }}>
                  Pick all that apply — home, diaspora, markets you want to reach.
                </p>
                <div className="flex flex-wrap gap-2">
                  {AFRICAN_COUNTRY_OPTIONS.map((c) => (
                    <Chip
                      key={c.code}
                      active={countryCodes.includes(c.code)}
                      onClick={() => toggle(countryCodes, c.code, setCountryCodes)}
                    >
                      {c.name}
                    </Chip>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="font-bold text-sm block mb-2">What do you enjoy — or want to try?</span>
                <textarea
                  value={enjoyDoing}
                  onChange={(e) => setEnjoyDoing(e.target.value)}
                  rows={3}
                  placeholder="e.g. music, farming, fixing phones, teaching kids, design…"
                  className="w-full rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: C.card,
                    border: `1px solid ${C.cardBorder}`,
                    color: C.text,
                    outline: "none",
                  }}
                />
              </label>
            </div>
          )}

          {/* Navigation */}
          <div
            className="flex flex-wrap items-center gap-3 mt-10 pt-6"
            style={{ borderTop: `1px solid rgba(255,255,255,0.08)` }}
          >
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-full px-6 py-3 text-sm font-semibold"
                style={{
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: C.muted,
                  background: "transparent",
                }}
              >
                ← Back
              </button>
            )}
            {step > 0 && step < 6 && (
              <button
                type="button"
                disabled={!canNext()}
                onClick={() => setStep((s) => s + 1)}
                className="rounded-full px-8 py-3 text-sm font-bold disabled:opacity-40"
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
                className="rounded-full px-8 py-3 text-sm font-bold disabled:opacity-40"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                {busy ? "Saving…" : "Personalize my Kebu →"}
              </button>
            )}
          </div>

          {error ? (
            <p className="text-sm mt-4" style={{ color: "#EF4444" }}>{error}</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
