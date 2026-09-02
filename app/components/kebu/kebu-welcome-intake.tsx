"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
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
        background: active ? KEBU.orange : "rgba(255,255,255,0.9)",
        color: active ? "#fff" : KEBU.black,
        border: active ? "none" : `1px solid ${KEBU.border}`,
        boxShadow: active ? "0 12px 32px rgba(255,85,0,0.25)" : "none",
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
    <AppShell title="Welcome to Kebu">
      <div className="max-w-2xl mx-auto px-5 py-8 lg:py-12">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: KEBU.orange }}>
            Step {step + 1} of {totalSteps + 1} · Kebu learns about you
          </p>
          <div className="flex gap-1 mb-6">
            {Array.from({ length: totalSteps + 1 }).map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full"
                style={{ background: i <= step ? KEBU.orange : KEBU.border, opacity: i <= step ? 1 : 0.35 }}
              />
            ))}
          </div>

          {step === 0 && (
            <div>
              <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>
                What brings you to Kebu?
              </h1>
              <p className="text-base leading-relaxed mb-4" style={{ color: KEBU.muted }}>
                You do <strong>not</strong> need a business to use Kebu. We learn about <strong>you</strong> first —
                then Opportunity OS, Yande AI, and your home page customize to your goals, interests, and place in
                Africa.
              </p>
              <ul className="text-sm space-y-2 mb-8" style={{ color: KEBU.muted }}>
                <li>🌍 Explore countries, resources, heritage — no registration required</li>
                <li>✨ Find what you can offer and what fits you</li>
                <li>🚀 Build a site or business later — only when you are ready</li>
              </ul>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full px-8 py-4 text-sm font-bold text-white"
                style={{ background: KEBU.orange }}
              >
                Let&apos;s go — about 3 minutes
              </button>
              <p className="text-xs mt-4" style={{ color: KEBU.faint }}>
                <Link href="/opportunity" className="underline" style={{ color: KEBU.orange }}>
                  Skip to Opportunity OS
                </Link>{" "}
                (you can finish this anytime from your home page)
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
                What are you here for right now?
              </h2>
              <p className="text-sm mb-4" style={{ color: KEBU.muted }}>
                Pick the closest match. This is personal — not a business profile.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {KEBU_HERE_FOR.map((g) => (
                  <Chip key={g.id} active={mainGoal === g.id} onClick={() => setMainGoal(g.id)} large>
                    <span className="text-2xl mb-2 block">{g.icon}</span>
                    <span className="font-bold text-sm">{g.label}</span>
                    <span className="text-xs mt-1 block opacity-90">{g.desc}</span>
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
                What else matters to you?
              </h2>
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
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
                What are you curious about?
              </h2>
              <p className="text-sm mb-4" style={{ color: KEBU.muted }}>
                {exploringMode() ? "Optional — skip with Next if you are just exploring." : "Pick at least one."}
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
                    <p className="text-xs mt-1 opacity-90">{item.desc}</p>
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
                What kind of help might you need?
              </h2>
              <p className="text-sm mb-4" style={{ color: KEBU.muted }}>
                Grants, jobs, heritage stories, country intel… {exploringMode() ? "Optional for now." : ""}
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
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-fraunces)" }}>
                How much could you start with — if you built something?
              </h2>
              <p className="text-sm mb-4" style={{ color: KEBU.muted }}>
                Honest answer helps us plan. &quot;Not sure&quot; is fine — especially if you are only exploring.
              </p>
              <div className="space-y-3 max-w-lg">
                {BUDGET_BANDS.map((b) => (
                  <Chip key={b.id} active={budget === b.id} onClick={() => setBudget(b.id)} large>
                    <p className="font-bold">{b.label}</p>
                    <p className="text-xs mt-1 opacity-90">{b.hint}</p>
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
                  Which countries matter to you?
                </h2>
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
                <span className="font-bold text-sm">What do you enjoy — or want to try?</span>
                <textarea
                  value={enjoyDoing}
                  onChange={(e) => setEnjoyDoing(e.target.value)}
                  rows={3}
                  placeholder="e.g. music, farming, fixing phones, teaching kids, design…"
                  className="mt-2 w-full rounded-xl border px-4 py-3 text-sm"
                  style={{ borderColor: KEBU.border }}
                />
              </label>
            </div>
          )}

          {step > 0 && (
            <div className="flex flex-wrap gap-3 mt-10 pt-6" style={{ borderTop: `1px solid ${KEBU.border}` }}>
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-full px-6 py-3 text-sm font-semibold"
                style={{ border: `1px solid ${KEBU.border}` }}
              >
                Back
              </button>
              {step < 6 ? (
                <button
                  type="button"
                  disabled={!canNext()}
                  onClick={() => setStep((s) => s + 1)}
                  className="rounded-full px-8 py-3 text-sm font-bold text-white disabled:opacity-40"
                  style={{ background: KEBU.orange }}
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void finish()}
                  className="rounded-full px-8 py-3 text-sm font-bold text-white disabled:opacity-40"
                  style={{ background: KEBU.black }}
                >
                  {busy ? "Saving…" : "Personalize my Kebu"}
                </button>
              )}
            </div>
          )}

          {error ? <p className="text-sm text-red-600 mt-4">{error}</p> : null}
        </div>
      </div>
    </AppShell>
  );
}
