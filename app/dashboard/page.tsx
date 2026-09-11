"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { Skeleton } from "@/app/components/kebu-skeleton";
import { KEBU } from "@/lib/kebu-brand";
import { displayFirstName } from "@/lib/account/user-profile";
import type { HomeSummary, HomeUpdate, HomeSiteRow } from "@/lib/account/home-summary";
import { readStoredWorkspace } from "@/lib/navigation/kebu-workspace";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";

// ── Small stat tile ──────────────────────────────────────────────────────────

function StatTile({
  value,
  label,
  href,
  ctaLabel,
  accent,
}: {
  value: number;
  label: string;
  href: string;
  ctaLabel: string;
  accent?: string;
}) {
  const isEmpty = value === 0;
  const color = accent ?? KEBU.orange;
  return (
    <Link
      href={href}
      className="group block rounded-2xl p-5 transition-all hover:-translate-y-0.5"
      style={{
        background: KEBU.white,
        border: `2px solid ${KEBU.black}`,
        boxShadow: "3px 3px 0 rgba(10,10,10,0.9)",
      }}
    >
      {isEmpty ? (
        <p
          className="text-xs font-bold uppercase tracking-wide mb-3"
          style={{ color: KEBU.faint }}
        >
          {label}
        </p>
      ) : (
        <p
          className="text-3xl font-black leading-none mb-2"
          style={{ fontFamily: "var(--font-fraunces)", color }}
        >
          {value}
        </p>
      )}
      <p
        className="text-[11px] font-bold uppercase tracking-wider"
        style={{ color: isEmpty ? KEBU.orange : KEBU.black }}
      >
        {isEmpty ? ctaLabel : label}
      </p>
      {!isEmpty && (
        <span
          className="inline-block mt-3 text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: KEBU.red }}
        >
          Open →
        </span>
      )}
    </Link>
  );
}

// ── Onboarding checklist for brand-new users ─────────────────────────────────

const CHECKLIST = [
  { id: "intake", label: "Tell Kebu about yourself", href: "/welcome", sub: "3 min — personalises your whole experience" },
  { id: "site", label: "Build your first site", href: "/create/new", sub: "Pick a style → go live in minutes" },
  { id: "shop", label: "Add a product to your shop", href: "/create/new?type=store", sub: "Sell from day one — free with transaction fee" },
  { id: "business", label: "Register a Kebu business", href: "/business/register", sub: "Get your Kebu ID, unlock the B2B directory" },
  { id: "design", label: "Create a design in Studio", href: "/studio/new", sub: "Poster, flyer, social media — better than Canva" },
  { id: "opportunity", label: "Explore Opportunity OS", href: "/opportunity", sub: "Grants, fellowships, tenders curated for you" },
];

function SetupChecklist({ summary }: { summary: HomeSummary }) {
  const done = new Set<string>();
  if (!summary.personalization.needsIntake) done.add("intake");
  if (summary.stats.sitesTotal > 0) done.add("site");
  if (summary.stats.storeProducts > 0) done.add("shop");
  if (summary.businesses.length > 0) done.add("business");
  if (summary.stats.createDesigns > 0) done.add("design");

  const pct = Math.round((done.size / CHECKLIST.length) * 100);
  if (pct >= 100) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: KEBU.orange }}>
          Get started
        </h2>
        <span className="text-[10px] font-bold" style={{ color: KEBU.faint }}>
          {done.size}/{CHECKLIST.length} done
        </span>
      </div>
      {/* Progress bar */}
      <div
        className="h-1.5 rounded-full mb-5 overflow-hidden"
        style={{ background: "rgba(10,10,10,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }}
        />
      </div>
      <div className="space-y-2">
        {CHECKLIST.map(({ id, label, href, sub }) => {
          const completed = done.has(id);
          return (
            <Link
              key={id}
              href={href}
              className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all hover:-translate-y-px"
              style={{
                background: completed ? "rgba(16,185,129,0.06)" : KEBU.white,
                border: `1px solid ${completed ? "rgba(16,185,129,0.2)" : KEBU.border}`,
                opacity: completed ? 0.7 : 1,
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: completed ? "#10B981" : "transparent",
                  border: `2px solid ${completed ? "#10B981" : KEBU.border}`,
                }}
              >
                {completed && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: completed ? KEBU.muted : KEBU.black }}>
                  {label}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: KEBU.faint }}>{sub}</p>
              </div>
              {!completed && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={KEBU.orange} strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── Recent sites strip ────────────────────────────────────────────────────────

function SiteRow({ site }: { site: HomeSiteRow }) {
  const live = site.status === "published";
  const isStore = site.projectType === "store";
  return (
    <Link
      href={isStore ? `/shop/${site.id}` : `/my-sites/${site.id}`}
      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:-translate-y-px"
      style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-black"
        style={{ background: isStore ? "#10B981" : KEBU.orange }}
      >
        {isStore ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 01-8 0" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: KEBU.black }}>{site.title}</p>
        <p className="text-[11px] truncate" style={{ color: KEBU.faint }}>
          {site.subdomain ? `${site.subdomain}.kebu.co` : (isStore ? "Store" : "Site")}
          {isStore && site.productCount > 0 ? ` · ${site.productCount} products` : ""}
        </p>
      </div>
      <span
        className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
        style={{
          background: live ? "rgba(16,185,129,0.1)" : "rgba(10,10,10,0.06)",
          color: live ? "#10B981" : KEBU.muted,
        }}
      >
        {live ? "Live" : "Draft"}
      </span>
    </Link>
  );
}

// ── Activity feed item ────────────────────────────────────────────────────────

const KIND_COLOR: Record<HomeUpdate["kind"], string> = {
  site: KEBU.orange,
  business: "#10B981",
  email: "#0EA5E9",
  create: "#9333EA",
  opportunity: KEBU.red,
  b2b: "#F59E0B",
};

function UpdateRow({ item }: { item: HomeUpdate }) {
  return (
    <Link
      href={item.href}
      className="flex gap-3 rounded-xl p-4 transition-all hover:-translate-y-px"
      style={{
        background: KEBU.white,
        border: `1px solid ${KEBU.border}`,
        borderLeft: `3px solid ${KIND_COLOR[item.kind]}`,
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate" style={{ color: KEBU.black }}>{item.title}</p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: KEBU.muted }}>{item.body}</p>
      </div>
      <svg
        className="shrink-0 self-center"
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke={KEBU.orange} strokeWidth="2.5" strokeLinecap="round"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KebuHomePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/home", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as { summary?: HomeSummary; error?: string };
      if (res.status === 401) { router.replace("/login?next=/dashboard"); return; }
      if (!res.ok || !data.summary) { setError(data.error ?? "Could not load your Kebu home."); return; }
      if (data.summary.personalization?.needsIntake) { router.replace("/welcome?next=/dashboard"); return; }
      if (!readStoredWorkspace()) { router.replace("/start?next=/dashboard"); return; }
      setSummary(data.summary);
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const first = displayFirstName(summary?.profile.name, summary?.profile.email);
  const isNew = summary
    ? summary.stats.sitesTotal === 0 && summary.businesses.length === 0
    : false;

  return (
    <AppShell title="Your Kebu">
      <div className="min-h-full">
        {/* ── Hero strip ───────────────────────────────────────── */}
        <div className="relative overflow-hidden" style={{ background: KEBU.black }}>
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background: `radial-gradient(ellipse 70% 100% at 100% 0%, ${KEBU.orange}, transparent 55%),
                           radial-gradient(ellipse 50% 80% at 0% 100%, ${KEBU.red}, transparent 50%)`,
            }}
          />
          <div className="relative max-w-5xl mx-auto px-5 lg:px-10 py-10 lg:py-14">
            {loading ? (
              <div className="flex items-center gap-5">
                <Skeleton width={64} height={64} radius={32} style={{ background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton height={10} width={80} style={{ background: "rgba(255,255,255,0.1)", marginBottom: 10 }} />
                  <Skeleton height={32} width="55%" style={{ background: "rgba(255,255,255,0.15)", marginBottom: 10 }} />
                  <Skeleton height={13} width="70%" style={{ background: "rgba(255,255,255,0.08)" }} />
                </div>
              </div>
            ) : error ? (
              <div className="rounded-xl p-4 text-sm" style={{ background: KEBU.red, color: KEBU.white }}>
                {error}{" "}
                <button type="button" className="underline font-bold" onClick={() => void load()}>Retry</button>
              </div>
            ) : summary ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                {summary.profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={summary.profile.avatarUrl}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover ring-4 ring-[#FF5500]"
                  />
                ) : (
                  <span
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white shrink-0"
                    style={{ background: KEBU.orange }}
                  >
                    {first.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-1" style={{ color: KEBU.orange }}>
                    Your Kebu
                  </p>
                  <h1
                    className="text-2xl lg:text-4xl font-black text-white"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {isNew ? `Welcome, ${first}` : `Hi, ${first}`}
                  </h1>
                  <p className="text-sm mt-2 max-w-xl" style={{ color: "rgba(255,255,255,0.72)" }}>
                    {isNew
                      ? "Let's set up your Kebu. Follow the checklist below — takes about 10 minutes."
                      : summary.personalization.exploreOnly
                      ? "Explore Africa, learn, build when you are ready."
                      : "Sites, store, opportunities — everything in one place."}
                  </p>
                  {summary.profile.afriqueId ? (
                    <p className="text-[11px] font-mono mt-2 font-bold" style={{ color: KEBU.orange }}>
                      {summary.profile.afriqueId}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }} />
        </div>

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-5 lg:px-10 py-8 lg:py-12">
          {loading ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} style={{ background: KEBU.white, border: `2px solid ${KEBU.black}`, borderRadius: 16, padding: "1.25rem" }}>
                    <Skeleton height={32} width="50%" style={{ marginBottom: 8 }} />
                    <Skeleton height={11} width="65%" />
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {summary ? (
            <>
              {/* Onboarding checklist (shown when user hasn't done things yet) */}
              {isNew ? (
                <SetupChecklist summary={summary} />
              ) : null}

              {/* Stat grid — hide when all zeros and user is new */}
              {!isNew ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                  <StatTile
                    value={summary.stats.sitesTotal}
                    label="Your sites"
                    href={MY_SITES_HREF}
                    ctaLabel="Build a site →"
                    accent={KEBU.orange}
                  />
                  <StatTile
                    value={summary.stats.sitesPublished}
                    label="Published"
                    href={`${MY_SITES_HREF}?filter=live`}
                    ctaLabel="Publish a site →"
                    accent={KEBU.red}
                  />
                  <StatTile
                    value={summary.stats.storeProducts}
                    label="Store products"
                    href={MY_SITES_HREF}
                    ctaLabel="Add a product →"
                  />
                  <StatTile
                    value={summary.stats.emailSubscribers}
                    label="Email subscribers"
                    href={summary.businesses[0] ? `/business/${summary.businesses[0].id}` : "/account"}
                    ctaLabel="Capture emails →"
                    accent="#0EA5E9"
                  />
                  <StatTile
                    value={summary.stats.createDesigns}
                    label="Studio designs"
                    href="/studio"
                    ctaLabel="Open Studio →"
                    accent="#9333EA"
                  />
                  <StatTile
                    value={summary.stats.countriesLive}
                    label="Countries live"
                    href="/opportunity/countries"
                    ctaLabel="Explore Africa →"
                    accent="#10B981"
                  />
                </div>
              ) : null}

              {/* Quick actions */}
              <section className="mb-10">
                <h2 className="text-[10px] font-black uppercase tracking-[0.24em] mb-4" style={{ color: KEBU.red }}>
                  Quick actions
                </h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Builder", href: "/create" },
                    { label: "Studio", href: "/studio" },
                    { label: "Businesses", href: "/business" },
                    { label: "Opportunity OS", href: "/opportunity" },
                    { label: "B2B directory", href: "/b2b" },
                    { label: "Countries", href: "/opportunity/countries" },
                    { label: "Account", href: "/account" },
                  ].map((a) => (
                    <Link
                      key={a.href}
                      href={a.href}
                      className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all hover:brightness-110"
                      style={{ background: KEBU.black, color: KEBU.white }}
                    >
                      {a.label}
                    </Link>
                  ))}
                </div>
              </section>

              {/* Recent sites */}
              {summary.sites.length > 0 ? (
                <section className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: KEBU.red }}>
                      Your sites
                    </h2>
                    <Link href={MY_SITES_HREF} className="text-[10px] font-bold" style={{ color: KEBU.orange }}>
                      All sites →
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {summary.sites.slice(0, 4).map((s) => (
                      <SiteRow key={s.id} site={s} />
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Business & KA score */}
              {summary.businesses.length > 0 ? (
                <section className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: KEBU.red }}>
                      Business & Kebu ID
                    </h2>
                    <Link href="/business" className="text-[10px] font-bold" style={{ color: KEBU.orange }}>
                      All businesses →
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {summary.businesses.map((b) => (
                      <Link
                        key={b.id}
                        href={`/business/${b.id}`}
                        className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all hover:-translate-y-px"
                        style={{ background: KEBU.black, borderLeft: `4px solid ${KEBU.orange}` }}
                      >
                        <div>
                          <p className="font-bold text-sm text-white">{b.name}</p>
                          <p className="text-[11px] font-mono font-bold mt-0.5" style={{ color: KEBU.orange }}>
                            {b.publicKebuId}
                          </p>
                        </div>
                        {b.readinessScore != null ? (
                          <div className="text-right">
                            <p className="text-2xl font-black" style={{ color: KEBU.orange }}>
                              {b.readinessScore}
                            </p>
                            <p className="text-[9px] font-bold uppercase" style={{ color: KEBU.faint }}>
                              readiness
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-bold uppercase" style={{ color: KEBU.orange }}>
                            Set up →
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Partial checklist for returning users who haven't finished */}
              {!isNew ? (
                <SetupChecklist summary={summary} />
              ) : null}

              {/* Activity feed */}
              {summary.updates.length > 0 ? (
                <section>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.24em] mb-4" style={{ color: KEBU.red }}>
                    Next steps
                  </h2>
                  <div className="space-y-2">
                    {summary.updates.map((u) => (
                      <UpdateRow key={u.id} item={u} />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
