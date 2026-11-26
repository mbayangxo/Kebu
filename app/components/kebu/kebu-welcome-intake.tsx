"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { KebuWordmark } from "@/app/components/kebu-mark";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import {
  KEBU_INTENTS,
  KEBU_PERSONAS,
  KEBU_TOOLS,
  recommendedToolsForIntents,
  type KebuIntentId,
  type KebuToolId,
} from "@/lib/account/kebu-setup";
import { OPPORTUNITY_INTERESTS } from "@/lib/opportunity/intake-schema";
import { storeWorkspace } from "@/lib/navigation/kebu-workspace";

const AFRICAN_COUNTRY_OPTIONS = [
  { code: "SN", name: "Senegal" }, { code: "NG", name: "Nigeria" }, { code: "GH", name: "Ghana" },
  { code: "KE", name: "Kenya" }, { code: "ZA", name: "South Africa" }, { code: "CI", name: "Côte d'Ivoire" },
  { code: "RW", name: "Rwanda" }, { code: "MA", name: "Morocco" }, { code: "ET", name: "Ethiopia" }, { code: "EG", name: "Egypt" },
];

const PERSONA_LABELS: Record<(typeof KEBU_PERSONAS)[number], string> = {
  creator: "Creator",
  entrepreneur: "Entrepreneur",
  freelancer: "Freelancer",
  student: "Student",
  team: "Team",
  organization: "Organization",
  developer: "Developer",
  personal: "Just me",
};

const INTENT_ICONS: Record<KebuIntentId, KebuIconName> = { create:"studio", business:"spaces", build_online:"builder", communicate:"message", organize:"work", opportunities:"opportunity", technology:"search", explore:"search" };

const TOOL_ICONS: Record<KebuToolId, KebuIconName> = {
  browser: "search",
  search: "search",
  opportunities: "opportunity",
  studio: "studio",
  sites: "builder",
  shop: "commerce",
  business: "spaces",
  mail: "message",
  chat: "message",
  library: "library",
  spaces: "spaces",
  rooms: "spaces",
  docs: "work",
  tasks: "work",
  calendar: "calendar",
  people: "people",
};

function toggleIn<T extends string>(items: T[], value: T): T[] {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

function onboardingGoal(intents: KebuIntentId[]) {
  if (intents.includes("business")) return "start_business";
  if (intents.includes("opportunities")) return "find_my_path";
  if (intents.includes("technology") || intents.includes("create")) return "learn_skills";
  return "explore_africa";
}

export function KebuWelcomeIntake() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editMode = searchParams.get("edit") === "1";
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") ? rawNext : "/dashboard";

  const [step, setStep] = useState(0);
  const [intents, setIntents] = useState<KebuIntentId[]>([]);
  const [tools, setTools] = useState<KebuToolId[]>([]);
  const [persona, setPersona] = useState<(typeof KEBU_PERSONAS)[number]>("personal");
  const [workspaceName, setWorkspaceName] = useState("");
  const [interestPaths, setInterestPaths] = useState<string[]>([]);
  const [countryCodes, setCountryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recommended = useMemo(() => recommendedToolsForIntents(intents), [intents]);
  const totalSteps = 5;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/me/kebu-setup", { credentials: "include" }).then((res) => res.ok ? res.json() : null),
      fetch("/api/me/opportunity-profile", { credentials: "include" }).then((res) => res.ok ? res.json() : null),
    ]).then(([setupData, opportunityData]) => {
      if (cancelled) return;
      const setup = setupData?.setup;
      if (setup) {
        setIntents(Array.isArray(setup.intents) ? setup.intents : []);
        setTools(Array.isArray(setup.tools) ? setup.tools : []);
        setPersona(setup.persona || "personal");
        setWorkspaceName(setup.workspaceName || "");
        if (setup.onboardingComplete && !editMode) {
          router.replace(nextPath);
          return;
        }
      }
      const profile = opportunityData?.profile;
      if (profile?.interestPaths) setInterestPaths(profile.interestPaths);
      if (profile?.preferredCountryCodes) setCountryCodes(profile.preferredCountryCodes);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [editMode, nextPath, router]);

  useEffect(() => {
    if (intents.length === 0) return;
    if (tools.length === 0) setTools(recommended);
  }, [intents, recommended, tools.length]);

  function chooseIntent(id: KebuIntentId) {
    const next = toggleIn(intents, id);
    setIntents(next);
    const nextRecommended = recommendedToolsForIntents(next);
    setTools((current) => {
      const currentSet = new Set(current);
      nextRecommended.forEach((tool) => currentSet.add(tool));
      return [...currentSet].slice(0, 10);
    });
  }

  function canContinue() {
    if (step === 1) return intents.length > 0;
    if (step === 2) return tools.length > 0;
    if (step === 3) return Boolean(persona);
    return true;
  }

  const firstTool = KEBU_TOOLS.find((tool) => tool.id === tools[0]);

  async function finish() {
    if (busy) return;
    setBusy(true);
    setError(null);

    const setup = {
      intents: intents.length ? intents : ["explore"],
      tools: tools.length ? tools : ["search", "opportunities", "spaces"],
      persona,
      workspaceName: workspaceName.trim(),
      onboardingComplete: true,
      version: "v2" as const,
    };

    try {
      const setupRes = await fetch("/api/me/kebu-setup", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setup),
      });
      const setupData = await setupRes.json().catch(() => ({}));
      if (!setupRes.ok) {
        setError(setupData.error || "Could not save your Kebu setup.");
        return;
      }

      const mainGoal = onboardingGoal(setup.intents as KebuIntentId[]);
      const exploring = mainGoal === "explore_africa";
      const profileRes = await fetch("/api/me/opportunity-profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainGoal,
          goals: [mainGoal],
          interestPaths: interestPaths.length ? interestPaths : (exploring ? [] : ["creative_media"]),
          resourceNeeds: exploring ? [] : ["country_intel"],
          startingBudgetBand: "not_sure",
          preferredCountryCodes: countryCodes,
          enjoyDoing: "",
          intakeComplete: true,
        }),
      });
      if (!profileRes.ok) {
        const profileData = await profileRes.json().catch(() => ({}));
        setError(profileData.error || "Your Kebu setup saved, but personalization could not finish.");
        return;
      }

      storeWorkspace("kebu");
      const destination = editMode || rawNext ? nextPath : (firstTool?.href ?? "/dashboard");
      router.push(destination);
      router.refresh();
    } catch {
      setError("Network error. Your choices are still on this screen.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: KEBU.bright, color: KEBU.muted }}>Preparing your Kebu…</div>;
  }

  return (
    <div className="min-h-screen" style={{ background: KEBU.bright, color: KEBU.black }}>
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="flex min-h-screen flex-col">
          <header className="flex h-14 items-center justify-between border-b px-5 sm:px-8" style={{ borderColor: KEBU.borders.default }}>
            <Link href="/" aria-label="Kebu home"><KebuWordmark size={27} dark /></Link>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps + 1 }, (_, index) => (
                <span key={index} className="h-1.5 rounded-full transition-all" style={{ width: index === step ? 28 : 8, background: index <= step ? KEBU.orange : "rgba(10,10,10,.10)" }} />
              ))}
            </div>
            <span className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>{step + 1}/{totalSteps + 1}</span>
          </header>

          <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
            <div className="w-full max-w-[880px]">
              {step === 0 ? (
                <section>
                  <p className="text-[10px] font-semibold tracking-[.08em]" style={{ color: KEBU.orange }}>Welcome to Kebu</p>
                  <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[.92] tracking-[-.05em] sm:text-7xl" style={{ fontFamily: "var(--font-fraunces)" }}>
                    One place for your work, <span className="font-normal italic">ideas</span> and life online.
                  </h1>
                  <p className="mt-5 max-w-xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>Kebu is not a website-builder signup. Start with what you need today. Add the rest when it becomes useful.</p>
                  <div className="mt-8 grid border-y sm:grid-cols-4" style={{ borderColor: KEBU.borders.default }}>
                    {["Create", "Work", "Sell", "Discover"].map((word, index) => (
                      <div key={word} className="flex min-h-14 items-center gap-2 border-b py-3 sm:border-b-0 sm:border-r sm:px-3 sm:last:border-r-0" style={{ borderColor: KEBU.borders.default }}>
                        <KebuIcon name={index===0?"studio":index===1?"work":index===2?"commerce":"opportunity"} size={14}/>
                        <p className="text-[10px] font-semibold">{word}</p>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setStep(1)} className="mt-8 rounded-lg px-6 py-3 text-sm font-semibold text-white" style={{ background: KEBU.black }}>Make Kebu mine →</button>
                </section>
              ) : null}

              {step === 1 ? (
                <section>
                  <p className="text-[10px] font-semibold tracking-[.08em]" style={{ color: KEBU.orange }}>01 · Direction</p>
                  <h2 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>What should Kebu help you do?</h2>
                  <p className="mt-2 text-sm" style={{ color: KEBU.muted }}>Pick more than one. Kebu will assemble around you.</p>
                  <div className="mt-7 grid border-t sm:grid-cols-2" style={{ borderColor: KEBU.borders.default }}>
                    {KEBU_INTENTS.map((intent) => {
                      const active = intents.includes(intent.id);
                      return (
                        <button key={intent.id} type="button" aria-pressed={active} onClick={() => chooseIntent(intent.id)} className="group min-h-[82px] border-b p-3.5 text-left outline-none transition hover:bg-black/[.02] focus-visible:ring-2 focus-visible:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default, background: active ? "rgba(255,106,0,.06)" : "transparent" }}>
                          <div className="flex items-start justify-between gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ color: active ? "white" : KEBU.black, background: active ? KEBU.orange : KEBU.cream }}><KebuIcon name={INTENT_ICONS[intent.id]} size={16}/></span>
                            <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px]" style={{ borderColor: active ? KEBU.orange : KEBU.borders.default, background: active ? KEBU.orange : "transparent", color: "white" }}>{active ? "✓" : ""}</span>
                          </div>
                          <p className="mt-3 text-[12px] font-semibold">{intent.label}</p>
                          <p className="mt-1 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>{intent.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {step === 2 ? (
                <section>
                  <p className="text-[10px] font-semibold tracking-[.08em]" style={{ color: KEBU.orange }}>02 · Your Kebu</p>
                  <h2 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>Choose what belongs in your Kebu.</h2>
                  <p className="mt-2 text-sm" style={{ color: KEBU.muted }}>Kebu has selected a useful starting set. You can change it anytime.</p>
                  <div className="mt-7 grid border-t sm:grid-cols-2 lg:grid-cols-3" style={{ borderColor: KEBU.borders.default }}>
                    {KEBU_TOOLS.map((tool) => {
                      const active = tools.includes(tool.id);
                      const suggested = recommended.includes(tool.id);
                      return (
                        <button key={tool.id} type="button" aria-pressed={active} onClick={() => setTools(toggleIn(tools, tool.id))} className="relative min-h-[82px] border-b p-3 text-left outline-none transition hover:bg-black/[.02] focus-visible:ring-2 focus-visible:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default, background: active ? "rgba(255,106,0,.055)" : "transparent" }}>
                          {suggested ? <span className="absolute right-2 top-2 text-[8px] font-semibold text-[#FF6A00]">For you</span> : null}
                          <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: active ? KEBU.orange : KEBU.cream, color: active ? "white" : KEBU.black }}><KebuIcon name={TOOL_ICONS[tool.id]} size={18} /></span>
                          <p className="mt-3 text-[11px] font-semibold">{tool.label}</p>
                          <p className="mt-0.5 text-[9px] uppercase tracking-[.12em]" style={{ color: KEBU.muted }}>{tool.group}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {step === 3 ? (
                <section>
                  <p className="text-[10px] font-semibold tracking-[.08em]" style={{ color: KEBU.orange }}>03 · Identity</p>
                  <h2 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>How should Kebu think about you?</h2>
                  <p className="mt-2 text-sm" style={{ color: KEBU.muted }}>This tunes your starting experience. Your personal work stays separate from any business or team spaces you create later.</p>
                  <div className="mt-7 flex flex-wrap gap-2">
                    {KEBU_PERSONAS.map((id) => {
                      const active = persona === id;
                      return <button key={id} type="button" aria-pressed={active} onClick={() => setPersona(id)} className="rounded-full border px-4 py-2.5 text-[10px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]" style={{ borderColor: active ? KEBU.black : KEBU.borders.default, background: active ? KEBU.black : "transparent", color: active ? "white" : KEBU.black }}>{PERSONA_LABELS[id]}</button>;
                    })}
                  </div>
                  <label className="mt-8 block">
                    <span className="text-[10px] font-semibold tracking-[.08em]">Name your Personal space <span style={{ color: KEBU.muted }}>· optional</span></span>
                    <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="e.g. My Kebu, School work, Creative projects" className="mt-2 min-h-12 w-full rounded-lg border bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }} />
                  </label><div className="mt-4 border-l-2 pl-3 text-[10px] leading-relaxed" style={{borderColor:KEBU.orange,color:KEBU.muted}}><strong style={{color:KEBU.black}}>Personal is your private starting space.</strong> Businesses and teams open as separate spaces later, with their own people and data, without mixing the work.</div>
                </section>
              ) : null}

              {step === 4 ? (
                <section>
                  <p className="text-[10px] font-semibold tracking-[.08em]" style={{ color: KEBU.orange }}>04 · Discovery</p>
                  <h2 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>Give Search and Opportunity OS a head start.</h2>
                  <p className="mt-2 text-sm" style={{ color: KEBU.muted }}>Optional. Skip anything you do not care about yet.</p>
                  <div className="mt-7">
                    <p className="text-[10px] font-semibold tracking-[.08em]">Interests</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {OPPORTUNITY_INTERESTS.map((item) => {
                        const active = interestPaths.includes(item.id);
                        return <button key={item.id} type="button" onClick={() => setInterestPaths(toggleIn(interestPaths, item.id))} className="rounded-md border px-3 py-2 text-[10px] font-semibold" style={{ borderColor: active ? KEBU.orange : KEBU.borders.default, background: active ? KEBU.orange : KEBU.white, color: active ? "white" : KEBU.black }}>{item.label}</button>;
                      })}
                    </div>
                  </div>
                  <div className="mt-7">
                    <p className="text-[10px] font-semibold tracking-[.08em]">Countries that matter to you</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {AFRICAN_COUNTRY_OPTIONS.map((country) => {
                        const active = countryCodes.includes(country.code);
                        return <button key={country.code} type="button" onClick={() => setCountryCodes(toggleIn(countryCodes, country.code))} className="rounded-md border px-3 py-2 text-[10px] font-semibold" style={{ borderColor: active ? KEBU.black : KEBU.borders.default, background: active ? KEBU.black : KEBU.white, color: active ? "white" : KEBU.black }}>{country.name}</button>;
                      })}
                    </div>
                  </div>
                </section>
              ) : null}

              {step === 5 ? (
                <section>
                  <p className="text-[10px] font-semibold tracking-[.08em]" style={{ color: KEBU.orange }}>05 · Ready</p>
                  <h2 className="mt-3 text-5xl font-black leading-[.95] tracking-[-.05em] sm:text-6xl" style={{ fontFamily: "var(--font-fraunces)" }}>Your Kebu has a starting point.</h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>Start with one useful action now. Your Home will keep the rest of your selected tools close without turning setup into a wall of apps.</p>
                  <div className="mt-7 border-y py-4" style={{ borderColor: KEBU.borders.default }}>
                    <p className="text-[9px] font-semibold tracking-[.08em]" style={{ color: KEBU.orange }}>Your starting tools</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                      {tools.map((id) => {
                        const tool = KEBU_TOOLS.find((candidate) => candidate.id === id);
                        return tool ? <span key={id} className="text-[10px] font-semibold text-black">{tool.label}</span> : null;
                      })}
                    </div>
                  </div>
                  <button type="button" disabled={busy} onClick={() => void finish()} className="mt-7 rounded-lg px-6 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}>{busy ? "Saving your Kebu…" : editMode ? "Save my Kebu →" : firstTool ? `Start with ${firstTool.label} →` : "Open my Kebu →"}</button>
                  {error ? <p className="mt-3 text-xs font-semibold" style={{ color: KEBU.red }}>{error}</p> : null}
                </section>
              ) : null}
            </div>
          </div>

          {step > 0 && step < 5 ? (
            <footer className="sticky bottom-0 flex items-center justify-between border-t px-5 py-4 sm:px-8" style={{ borderColor: KEBU.borders.default, background: "rgba(255,252,248,.95)", backdropFilter: "blur(16px)" }}>
              <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} className="rounded-lg border px-4 py-2 text-xs font-semibold" style={{ borderColor: KEBU.borders.default }}>← Back</button>
              <button type="button" disabled={!canContinue()} onClick={() => setStep((current) => Math.min(5, current + 1))} className="rounded-lg bg-black px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-35">Continue →</button>
            </footer>
          ) : null}
        </main>

        <aside className="hidden min-h-screen border-l bg-[#F7F3EE] p-6 lg:flex lg:flex-col" style={{ borderColor: KEBU.borders.default }}>
          <div className="sticky top-6">
            <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-black/30">Your Kebu</p>
            <p className="mt-4 text-3xl leading-[.98] tracking-[-.035em]" style={{ fontFamily:"var(--font-fraunces)" }}>
              Different tools.<br/><span className="italic font-normal">One place to return to.</span>
            </p>
            <div className="mt-8 border-t border-black/[.08]">
              {[
                ["Personal","Private by default"],
                ["Business","Activated only when you want it"],
                ["Worlds","Open full screen, not as dashboard widgets"],
                ["Offline","Your work should remain useful with weak connectivity"],
              ].map(([title,detail])=>(
                <div key={title} className="border-b border-black/[.07] py-4">
                  <p className="text-[10px] font-semibold">{title}</p>
                  <p className="mt-1 text-[9px] leading-relaxed text-black/38">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
