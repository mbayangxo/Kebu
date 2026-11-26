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
        headline="Explore opportunities across Africa."
        subhead="Browse countries, programs, grants, fellowships and tenders now. Afri ID unlocks deeper personalization and protected actions when you are ready."
        heroVisual={
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href="/opportunity/listings" className="rounded-2xl border bg-white p-4 text-left transition hover:-translate-y-0.5" style={{ borderColor: KEBU.border }}>
              <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Open to browse</p>
              <p className="mt-2 text-lg font-bold">Programs & listings</p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: KEBU.muted }}>Search real opportunities without creating an Afri ID first.</p>
            </Link>
            <Link href="/opportunity/countries" className="rounded-2xl border bg-white p-4 text-left transition hover:-translate-y-0.5" style={{ borderColor: KEBU.border }}>
              <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Explore</p>
              <p className="mt-2 text-lg font-bold">Countries</p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: KEBU.muted }}>Move through Kebu by country, city and local opportunity context.</p>
            </Link>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-3xl border bg-white p-5 sm:p-7" style={{ borderColor: KEBU.border }}>
            <p className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: KEBU.orange }}>Browse first</p>
            <h2 className="mt-2 text-2xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>Afri ID is not the front door.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: KEBU.muted }}>
              You can explore Opportunity OS before verification. Afri ID is used when Kebu needs verified eligibility, protected application tools, or deeper personal matching.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/opportunity/listings" className="rounded-full bg-black px-5 py-3 text-[10px] font-black uppercase tracking-wide text-white">Browse listings →</Link>
              <Link href="/opportunity/countries" className="rounded-full border bg-white px-5 py-3 text-[10px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.border }}>Explore countries</Link>
              {data.cardsHref ? <Link href={data.cardsHref} className="rounded-full border bg-white px-5 py-3 text-[10px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.border }}>Opportunity cards</Link> : null}
            </div>
          </section>

          <aside className="rounded-3xl p-5" style={{ background: "rgba(255,85,0,.07)", border: "1px solid rgba(255,85,0,.18)" }}>
            <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Optional verification</p>
            <h2 className="mt-2 text-lg font-bold">{isPending ? "Afri ID review in progress" : "Unlock your full Opportunity OS"}</h2>
            <p className="mt-2 text-xs leading-5" style={{ color: KEBU.muted }}>
              {isPending
                ? "Keep browsing while your verification is reviewed."
                : "Create your Afri ID when you want verified eligibility, stronger matching and protected application features."}
            </p>
            {!isPending ? (
              <Link href={data.verifyHref ?? "/account#african-id"} className="mt-4 inline-flex rounded-full px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: KEBU.orange }}>
                Create Afri ID →
              </Link>
            ) : null}
          </aside>
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
