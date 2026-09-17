"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OpportunityOsShell } from "@/app/components/opportunity/opportunity-os-shell";
import { CountryExplorerMosaic, type CountryCardData } from "@/app/components/opportunity/country-explorer-card";
import { HopeStoryCard, PersonalizedPlanCard } from "@/app/components/opportunity/hope-story-card";
import { Skeleton } from "@/app/components/kebu-skeleton";
import { KEBU } from "@/lib/kebu-brand";
import type { OpportunityProfile } from "@/lib/opportunity/intake-schema";

type ForYouPayload = {
  needsIntake: boolean;
  needsEntitlement?: boolean;
  redirect?: string;
  message?: string;
  verifyHref?: string;
  exploreHref?: string;
  cardsHref?: string;
  entitlement?: { status: string };
  profile?: OpportunityProfile;
  plan?: {
    headline: string;
    summary: string;
    startSteps: string[];
    resourceHints: { label: string; detail: string }[];
  };
  countries?: CountryCardData[];
  stories?: Parameters<typeof HopeStoryCard>[0]["story"][];
};

export default function OpportunityOsHubPage() {
  const router = useRouter();
  const [data, setData] = useState<ForYouPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/opportunity/for-you", { credentials: "include" });
    const json = (await res.json().catch(() => ({}))) as ForYouPayload & { error?: string };
    if (res.status === 401) {
      router.replace("/login?next=/opportunity");
      return;
    }
    if (json.needsIntake) {
      setData({ needsIntake: true });
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <OpportunityOsShell title="Opportunity OS" headline="Opportunity OS" subhead="">
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl p-4" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                <Skeleton height={11} width="50%" style={{ marginBottom: 8 }} />
                <Skeleton height={32} width="65%" style={{ marginBottom: 6 }} />
                <Skeleton height={10} width="40%" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl p-4 flex gap-4" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                <Skeleton width={40} height={40} radius={20} style={{ flexShrink: 0 }} />
                <div className="flex-1">
                  <Skeleton height={13} width="60%" style={{ marginBottom: 8 }} />
                  <Skeleton height={11} width="80%" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </OpportunityOsShell>
    );
  }

  if (data?.needsIntake) {
    return (
      <OpportunityOsShell
        title="Opportunity OS"
        headline="First, tell us about you"
        subhead="We learn about you first — then countries, stories, grants, and plans match your goals. No business required."
        heroVisual={
          <div
            className="rounded-full w-48 h-48 mx-auto flex items-center justify-center text-6xl"
            style={{ background: `linear-gradient(135deg, ${KEBU.orange}33, ${KEBU.cream})` }}
          >
            🌍
          </div>
        }
      >
        <div className="max-w-lg">
          <ul className="space-y-3 mb-8 text-sm" style={{ color: KEBU.muted }}>
            <li>✓ What you want to do and what you enjoy</li>
            <li>✓ Grants, loans, jobs, tenders, construction — what you need</li>
            <li>✓ How much you can start with</li>
            <li>✓ African leaders & heritage — hope built on real stories</li>
          </ul>
          <Link
            href="/welcome?next=/opportunity"
            className="inline-flex rounded-full px-10 py-4 text-sm font-bold text-white"
            style={{ background: KEBU.orange }}
          >
            Tell Kebu about you — 3 minutes
          </Link>
        </div>
      </OpportunityOsShell>
    );
  }

  if (data?.needsEntitlement) {
    const isPending = data.entitlement?.status === "pending";
    return (
      <OpportunityOsShell
        title="Opportunity OS"
        headline="Your personal opportunity feed is ready."
        subhead="Grants, fellowships, and government tenders — filtered for your country, skills, and business stage. Verify once to unlock your feed."
        heroVisual={
          /* Blurred preview cards — show the value, create desire */
          <div className="relative select-none" aria-hidden>
            <div className="grid gap-2" style={{ filter: "blur(3px)", opacity: 0.55, pointerEvents: "none" }}>
              {[
                { label: "Grant", country: "KE", title: "Youth Innovation Fund", amount: "$45,000", tag: "15 days left", color: "#10B981" },
                { label: "Tender", country: "GH", title: "Gov't Digital Services", amount: "$120K", tag: "Open now", color: "#0EA5E9" },
                { label: "Fellowship", country: "NG", title: "EU Digital Fellowship", amount: "€18,000", tag: "8 days left", color: "#9333EA" },
              ].map((card) => (
                <div
                  key={card.title}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-black text-white"
                    style={{ background: card.color }}
                  >
                    {card.country}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-0.5" style={{ color: card.color }}>
                      {card.label}
                    </p>
                    <p className="text-sm font-bold truncate">{card.title}</p>
                    <p className="text-xs" style={{ color: KEBU.muted }}>{card.amount} · {card.tag}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Frosted glass unlock overlay */}
            <div
              className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3"
              style={{
                background: "rgba(255,251,247,0.72)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                border: `1px solid rgba(255,85,0,0.15)`,
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: KEBU.orange, boxShadow: "0 8px 24px rgba(255,85,0,0.35)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-center px-4" style={{ color: KEBU.black }}>
                Your matches are locked
              </p>
              <p className="text-[11px] text-center px-6 leading-relaxed" style={{ color: KEBU.muted }}>
                Verify your African identity to see opportunities filtered for you
              </p>
            </div>
          </div>
        }
      >
        {/* Value propositions */}
        <div className="max-w-lg space-y-8">
          <ul className="space-y-3">
            {[
              { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", text: "2,400+ grants, fellowships, and tenders from 54 African countries" },
              { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", text: "Filtered daily to your location, skills, and business stage" },
              { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", text: "Verify once — your access stays active forever" },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={KEBU.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <path d={item.icon} />
                </svg>
                <span className="text-sm leading-relaxed" style={{ color: KEBU.black }}>{item.text}</span>
              </li>
            ))}
          </ul>

          {isPending ? (
            <div
              className="rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{ background: `rgba(255,85,0,0.07)`, border: `1px solid rgba(255,85,0,0.2)` }}
            >
              <div className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: KEBU.orange }} />
              <div>
                <p className="text-sm font-bold" style={{ color: KEBU.black }}>Verification in review</p>
                <p className="text-xs mt-0.5" style={{ color: KEBU.muted }}>We'll notify you when access is granted — usually within 24 hours.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Link
                href={data.verifyHref ?? "/account#african-id"}
                className="flex items-center justify-between w-full rounded-2xl px-6 py-4 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: KEBU.orange, boxShadow: "0 8px 32px rgba(255,85,0,0.30)" }}
              >
                <span>Verify African Access</span>
                <span className="flex items-center gap-2 text-xs opacity-80">
                  Takes 60 seconds
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </span>
              </Link>
              <p className="text-xs text-center" style={{ color: KEBU.faint }}>
                No ID stored on our servers · African residents only ·{" "}
                <Link href={data.exploreHref ?? "/opportunity/countries"} className="underline" style={{ color: KEBU.orange }}>
                  Browse countries freely
                </Link>
              </p>
            </div>
          )}
        </div>
      </OpportunityOsShell>
    );
  }

  const profile = data?.profile;
  const plan = data?.plan;
  const countries = data?.countries ?? [];
  const stories = data?.stories ?? [];

  return (
    <OpportunityOsShell
      title="Opportunity OS"
      headline="Your Africa — filtered for you"
      subhead={
        profile?.enjoyDoing
          ? `Focused on what you told us you enjoy: “${profile.enjoyDoing.slice(0, 100)}${profile.enjoyDoing.length > 100 ? "…" : ""}”`
          : "Countries, resources, and stories matched to your goals."
      }
      heroVisual={
        <div className="grid grid-cols-2 gap-2 rotate-[-2deg]">
          {(profile?.interestPaths ?? []).slice(0, 4).map((p) => (
            <span
              key={p}
              className="rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-center"
              style={{ background: KEBU.orange, color: "#fff" }}
            >
              {p.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      }
    >
      {plan ? (
        <PersonalizedPlanCard
          headline={plan.headline}
          summary={plan.summary}
          startSteps={plan.startSteps}
          resourceHints={plan.resourceHints}
        />
      ) : null}

      {stories.length > 0 ? (
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
            Hope & heritage — people who built
          </h2>
          <p className="text-sm mb-6 max-w-2xl" style={{ color: KEBU.muted }}>
            African leaders and legacies matched to your interests. Trust labels on every story.
          </p>
          <ul className="grid md:grid-cols-2 gap-5">
            {stories.map((s) => (
              <li key={s.id}>
                <HopeStoryCard story={s} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
              Countries for you
            </h2>
            <p className="text-sm mt-1" style={{ color: KEBU.muted }}>
              Ranked by your interests and country picks — open for grants, programs, and resources.
            </p>
          </div>
          <Link href="/opportunity/countries" className="text-xs font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
            All countries →
          </Link>
          <Link href="/opportunity/listings" className="text-xs font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
            Programs & listings →
          </Link>
        </div>
        {countries.length > 0 ? (
          <CountryExplorerMosaic countries={countries} />
        ) : (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
          >
            <p className="text-3xl mb-3">🌍</p>
            <p className="font-bold mb-1" style={{ color: KEBU.black }}>Country profiles coming soon</p>
            <p className="text-sm" style={{ color: KEBU.muted }}>
              Kebu researchers are adding grants, programs, and opportunities country by country.
            </p>
            <Link
              href="/opportunity/listings"
              className="inline-block mt-4 text-sm font-bold underline"
              style={{ color: KEBU.orange }}
            >
              Browse all listings →
            </Link>
          </div>
        )}
      </section>

      <section
        className="rounded-3xl p-8 text-center"
        style={{ background: `linear-gradient(120deg, ${KEBU.black}, ${KEBU.orange})`, color: "#fff" }}
      >
        <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>
          Ready to build?
        </h2>
        <p className="text-sm opacity-90 mb-6 max-w-md mx-auto">
          Turn research into a real site, store, or business identity on Kebu.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/create" className="rounded-full bg-white text-black px-6 py-3 text-xs font-bold uppercase tracking-wider">
            Kebu Builder
          </Link>
          <Link href="/business/register" className="rounded-full border-2 border-white px-6 py-3 text-xs font-bold uppercase tracking-wider">
            Register business
          </Link>
        </div>
      </section>
    </OpportunityOsShell>
  );
}
