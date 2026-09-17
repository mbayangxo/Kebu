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

// ── Compact stat strip ────────────────────────────────────────────────────────

function StatStrip({
  stats,
  businesses,
}: {
  stats: HomeSummary["stats"];
  businesses: HomeSummary["businesses"];
}) {
  const items = [
    { value: stats.sitesTotal,       label: "Sites",       href: MY_SITES_HREF,                                                           accent: KEBU.orange },
    { value: stats.sitesPublished,   label: "Published",   href: `${MY_SITES_HREF}?filter=live`,                                          accent: KEBU.red    },
    { value: stats.storeProducts,    label: "Products",    href: MY_SITES_HREF,                                                           accent: "#10B981"   },
    { value: stats.emailSubscribers, label: "Subscribers", href: businesses[0] ? `/business/${businesses[0].id}` : "/account",            accent: "#0EA5E9"   },
    { value: stats.createDesigns,    label: "Designs",     href: "/studio",                                                               accent: "#9333EA"   },
    { value: stats.countriesLive,    label: "Countries",   href: "/opportunity/countries",                                                accent: "#10B981"   },
  ];

  return (
    <div
      className="flex flex-wrap overflow-hidden rounded-2xl mb-8"
      style={{ border: `1px solid ${KEBU.border}`, background: KEBU.white }}
    >
      {items.map((item, i) => (
        <Link
          key={item.label}
          href={item.href}
          className="flex-1 min-w-[80px] px-4 py-3.5 transition-colors"
          style={{ borderRight: i < items.length - 1 ? `1px solid ${KEBU.border}` : "none" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,85,0,0.035)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
        >
          <p
            className="text-xl font-black leading-none mb-1 tabular-nums"
            style={{ fontFamily: "var(--font-fraunces)", color: item.value > 0 ? item.accent : KEBU.faint }}
          >
            {item.value}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: KEBU.muted }}>
            {item.label}
          </p>
        </Link>
      ))}
    </div>
  );
}

// ── Onboarding checklist for brand-new users ─────────────────────────────────

const CHECKLIST = [
  {
    id: "intake",
    label: "Tell Kebu about yourself",
    href: "/welcome",
    sub: "3 min — personalises your whole experience",
    icon: "🌍",
    cta: "Personalize",
  },
  {
    id: "site",
    label: "Build your first site",
    href: "/create/new",
    sub: "Pick a style → go live in minutes",
    icon: "🌐",
    cta: "Build a site",
  },
  {
    id: "shop",
    label: "Add a product to your shop",
    href: "/create/new?type=store",
    sub: "Sell from day one — free with transaction fee",
    icon: "🛍️",
    cta: "Add product",
  },
  {
    id: "business",
    label: "Register a Kebu business",
    href: "/business/register",
    sub: "Get your Kebu ID, unlock the B2B directory",
    icon: "💼",
    cta: "Register",
  },
  {
    id: "design",
    label: "Create a design in Studio",
    href: "/studio/new",
    sub: "Poster, flyer, social media — better than Canva",
    icon: "🎨",
    cta: "Open Studio",
  },
  {
    id: "opportunity",
    label: "Explore Opportunity OS",
    href: "/opportunity",
    sub: "Grants, fellowships, tenders curated for you",
    icon: "✨",
    cta: "Explore",
  },
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

  const pending = CHECKLIST.filter(({ id }) => !done.has(id));
  const completed = CHECKLIST.filter(({ id }) => done.has(id));

  return (
    <section className="mb-10">
      {/* Header + progress */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: KEBU.orange }}>
          Get started
        </h2>
        <span className="text-[10px] font-bold" style={{ color: KEBU.faint }}>
          {done.size}/{CHECKLIST.length} done
        </span>
      </div>
      <div
        className="h-1.5 rounded-full mb-6 overflow-hidden"
        style={{ background: "rgba(10,10,10,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }}
        />
      </div>

      {/* Visual action cards for pending items */}
      {pending.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {pending.map(({ id, label, href, sub, icon, cta }) => (
            <Link
              key={id}
              href={href}
              className="group block rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{
                background: KEBU.white,
                border: `1px solid ${KEBU.border}`,
              }}
            >
              <span className="text-2xl block mb-3">{icon}</span>
              <p className="text-sm font-bold mb-1" style={{ color: KEBU.black }}>{label}</p>
              <p className="text-[11px] mb-4 leading-relaxed" style={{ color: KEBU.muted }}>{sub}</p>
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-bold rounded-full px-3 py-1.5"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                {cta}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Compact completed rows */}
      {completed.length > 0 && (
        <div className="space-y-1.5">
          {completed.map(({ id, label, href, icon }) => (
            <Link
              key={id}
              href={href}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5"
              style={{
                background: "rgba(16,185,129,0.05)",
                border: "1px solid rgba(16,185,129,0.15)",
                opacity: 0.75,
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "#10B981" }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-base leading-none">{icon}</span>
              <p className="text-sm font-semibold" style={{ color: KEBU.muted }}>{label}</p>
            </Link>
          ))}
        </div>
      )}
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
      className="flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all hover:-translate-y-px"
      style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: isStore ? "#10B981" : KEBU.orange }}
      >
        {isStore ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 01-8 0" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: KEBU.black }}>{site.title}</p>
        <p className="text-[10px] truncate" style={{ color: KEBU.faint }}>
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
      className="flex gap-3 rounded-xl px-4 py-3 transition-all hover:-translate-y-px"
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

        {/* ── Compact hero strip ───────────────────────────────── */}
        <div style={{ background: KEBU.black }}>
          <div className="max-w-5xl mx-auto px-5 lg:px-10 py-3.5 flex items-center gap-3">
            {loading ? (
              <>
                <Skeleton width={32} height={32} radius={16} style={{ background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
                <Skeleton height={12} width={140} style={{ background: "rgba(255,255,255,0.12)" }} />
              </>
            ) : error ? (
              <div className="rounded-lg px-3 py-1.5 text-xs" style={{ background: KEBU.red, color: KEBU.white }}>
                {error}{" "}
                <button type="button" className="underline font-bold" onClick={() => void load()}>Retry</button>
              </div>
            ) : summary ? (
              <>
                {summary.profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={summary.profile.avatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-[#FF5500] shrink-0"
                  />
                ) : (
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                    style={{ background: KEBU.orange }}
                  >
                    {first.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.24em] leading-none mb-0.5" style={{ color: KEBU.orange }}>
                    Your Kebu
                  </p>
                  <p className="text-sm font-black text-white leading-tight truncate">
                    {isNew ? `Welcome, ${first}` : `Hi, ${first}`}
                  </p>
                </div>
                {summary.profile.afriqueId && (
                  <p className="text-[10px] font-mono font-bold shrink-0 hidden sm:block" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {summary.profile.afriqueId}
                  </p>
                )}
              </>
            ) : null}
          </div>
          <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }} />
        </div>

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-5 lg:px-10 py-7 lg:py-10">

          {loading ? (
            <>
              {/* Compact strip skeleton */}
              <div
                className="flex overflow-hidden rounded-2xl mb-8"
                style={{ border: `1px solid ${KEBU.border}`, background: KEBU.white }}
              >
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="flex-1 px-4 py-3.5"
                    style={{ borderRight: i < 6 ? `1px solid ${KEBU.border}` : "none" }}
                  >
                    <Skeleton height={22} width="50%" style={{ marginBottom: 6 }} />
                    <Skeleton height={10} width="70%" />
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

              {/* Compact stat strip — hide when brand new */}
              {!isNew ? (
                <StatStrip stats={summary.stats} businesses={summary.businesses} />
              ) : null}

              {/* Quick actions */}
              <section className="mb-8">
                <h2 className="text-[10px] font-black uppercase tracking-[0.24em] mb-3" style={{ color: KEBU.red }}>
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
                      className="rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-[0.97] hover:brightness-110"
                      style={{ background: KEBU.black, color: KEBU.white }}
                    >
                      {a.label}
                    </Link>
                  ))}
                </div>
              </section>

              {/* Recent sites */}
              {summary.sites.length > 0 ? (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: KEBU.red }}>
                      Your sites
                    </h2>
                    <Link href={MY_SITES_HREF} className="text-[10px] font-bold" style={{ color: KEBU.orange }}>
                      All sites →
                    </Link>
                  </div>
                  <div className="space-y-1.5">
                    {summary.sites.slice(0, 4).map((s) => (
                      <SiteRow key={s.id} site={s} />
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Business & KA score */}
              {summary.businesses.length > 0 ? (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: KEBU.red }}>
                      Business & Kebu ID
                    </h2>
                    <Link href="/business" className="text-[10px] font-bold" style={{ color: KEBU.orange }}>
                      All businesses →
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {summary.businesses.map((b) => (
                      <Link
                        key={b.id}
                        href={`/business/${b.id}`}
                        className="flex items-center justify-between rounded-xl px-4 py-3 transition-all hover:-translate-y-px"
                        style={{ background: KEBU.black, borderLeft: `3px solid ${KEBU.orange}` }}
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-white truncate">{b.name}</p>
                          <p className="text-[10px] font-mono font-bold mt-0.5" style={{ color: KEBU.orange }}>
                            {b.publicKebuId}
                          </p>
                        </div>
                        {b.readinessScore != null ? (
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-xl font-black" style={{ color: KEBU.orange }}>
                              {b.readinessScore}
                            </p>
                            <p className="text-[9px] font-bold uppercase" style={{ color: KEBU.faint }}>
                              readiness
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-bold uppercase shrink-0 ml-3" style={{ color: KEBU.orange }}>
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
                  <h2 className="text-[10px] font-black uppercase tracking-[0.24em] mb-3" style={{ color: KEBU.red }}>
                    Next steps
                  </h2>
                  <div className="space-y-1.5">
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
