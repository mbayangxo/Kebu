"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OpportunityOsShell } from "@/app/components/opportunity/opportunity-os-shell";
import { CountryExplorerMosaic, type CountryCardData } from "@/app/components/opportunity/country-explorer-card";
import { HopeStoryCard, PersonalizedPlanCard } from "@/app/components/opportunity/hope-story-card";
import { KEBU } from "@/lib/kebu-brand";
import type { OpportunityProfile } from "@/lib/opportunity/intake-schema";

type ForYouPayload = {
  needsIntake: boolean;
  redirect?: string;
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
      <OpportunityOsShell title="Opportunity OS" headline="Loading your Africa…" subhead="">
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Preparing personalized opportunities…
        </p>
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
        </div>
        {countries.length > 0 ? (
          <CountryExplorerMosaic countries={countries} />
        ) : (
          <p className="text-sm" style={{ color: KEBU.muted }}>
            No published country profiles yet — apply migration 009.
          </p>
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
