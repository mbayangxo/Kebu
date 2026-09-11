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

/* ── Design tokens ─────────────────────────────────────── */
const G = {
  forest: "#0D4A2E",      // deep green heading
  emerald: "#059669",     // active green
  jade: "#10B981",        // lighter green accent
  mint: "#D1FAE5",        // green tint on light bg
  sage: "#6EE7B7",        // mid green
  bg: "#F0FBF5",          // very light green page bg
  card: "#FFFFFF",
  border: "rgba(5,150,105,0.15)",
  muted: "#4B7A65",
  faint: "#8EB8A4",
} as const;

/* ── Stat tile ─────────────────────────────────────────── */
function StatTile({
  value,
  label,
  href,
  ctaLabel,
  icon,
  color = G.emerald,
}: {
  value: number;
  label: string;
  href: string;
  ctaLabel: string;
  icon: React.ReactNode;
  color?: string;
}) {
  const isEmpty = value === 0;
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1"
      style={{
        background: G.card,
        border: `1.5px solid ${G.border}`,
        boxShadow: "0 2px 12px rgba(5,150,105,0.07)",
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: isEmpty ? "rgba(0,0,0,0.04)" : `${color}18` }}
        >
          <span style={{ color: isEmpty ? G.faint : color }}>{icon}</span>
        </div>
        {!isEmpty && (
          <span
            className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color }}
          >
            Open →
          </span>
        )}
      </div>
      <div>
        {isEmpty ? (
          <p className="text-xl font-black mb-1" style={{ color: G.faint }}>—</p>
        ) : (
          <p className="text-3xl font-black leading-none mb-1" style={{ color, fontVariantNumeric: "tabular-nums" }}>
            {value}
          </p>
        )}
        <p className="text-[11px] font-semibold" style={{ color: isEmpty ? G.emerald : G.muted }}>
          {isEmpty ? ctaLabel : label}
        </p>
      </div>
    </Link>
  );
}

/* ── Setup checklist ───────────────────────────────────── */
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
        <h2 className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: G.forest }}>
          Get started
        </h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: G.mint, color: G.forest }}>
          {done.size}/{CHECKLIST.length}
        </span>
      </div>
      <div className="h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: "rgba(5,150,105,0.1)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${G.emerald}, ${G.jade})` }}
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
                background: completed ? G.mint : G.card,
                border: `1px solid ${completed ? "rgba(16,185,129,0.25)" : G.border}`,
                opacity: completed ? 0.75 : 1,
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: completed ? G.jade : "transparent",
                  border: `2px solid ${completed ? G.jade : G.faint}`,
                }}
              >
                {completed && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: completed ? G.muted : G.forest }}>{label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: G.faint }}>{sub}</p>
              </div>
              {!completed && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.emerald} strokeWidth="2.5" strokeLinecap="round">
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

/* ── Site row ──────────────────────────────────────────── */
function SiteRow({ site }: { site: HomeSiteRow }) {
  const live = site.status === "published";
  const isStore = site.projectType === "store";
  return (
    <Link
      href={isStore ? `/shop/${site.id}` : `/my-sites/${site.id}`}
      className="flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all hover:-translate-y-px"
      style={{ background: G.card, border: `1.5px solid ${G.border}` }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: isStore ? `${G.jade}20` : `${KEBU.orange}15` }}
      >
        {isStore ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={G.emerald} strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 01-8 0" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={KEBU.orange} strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: G.forest }}>{site.title}</p>
        <p className="text-[11px] truncate mt-0.5" style={{ color: G.faint }}>
          {site.subdomain ? `${site.subdomain}.kebu.co` : (isStore ? "Store" : "Site")}
          {isStore && site.productCount > 0 ? ` · ${site.productCount} products` : ""}
        </p>
      </div>
      <span
        className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
        style={{
          background: live ? G.mint : "rgba(0,0,0,0.05)",
          color: live ? G.forest : G.faint,
        }}
      >
        {live ? "Live" : "Draft"}
      </span>
    </Link>
  );
}

/* ── Activity item ─────────────────────────────────────── */
const KIND_COLOR: Record<HomeUpdate["kind"], string> = {
  site: KEBU.orange,
  business: G.emerald,
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
        background: G.card,
        border: `1.5px solid ${G.border}`,
        borderLeft: `4px solid ${KIND_COLOR[item.kind]}`,
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate" style={{ color: G.forest }}>{item.title}</p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: G.muted }}>{item.body}</p>
      </div>
      <svg className="shrink-0 self-center" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.emerald} strokeWidth="2.5" strokeLinecap="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

/* ── Section header ────────────────────────────────────── */
function SectionHead({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: G.forest }}>
        {label}
      </h2>
      {action}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────── */
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
    <AppShell title="My Space">
      <div className="min-h-full" style={{ background: G.bg }}>

        {/* ── Header banner ──────────────────────────────── */}
        <div
          className="relative overflow-hidden"
          style={{ background: G.forest }}
        >
          {/* subtle texture lines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                repeating-linear-gradient(
                  135deg,
                  transparent,
                  transparent 40px,
                  rgba(255,255,255,0.025) 40px,
                  rgba(255,255,255,0.025) 41px
                )
              `,
            }}
          />
          <div className="relative max-w-6xl mx-auto px-6 lg:px-12 py-10 lg:py-14">
            {loading ? (
              <div className="flex items-center gap-5">
                <Skeleton width={60} height={60} radius={30} style={{ background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton height={10} width={80} style={{ background: "rgba(255,255,255,0.1)", marginBottom: 10 }} />
                  <Skeleton height={28} width="45%" style={{ background: "rgba(255,255,255,0.12)", marginBottom: 10 }} />
                  <Skeleton height={12} width="60%" style={{ background: "rgba(255,255,255,0.07)" }} />
                </div>
              </div>
            ) : error ? (
              <div className="rounded-xl p-4 text-sm" style={{ background: KEBU.red, color: KEBU.white }}>
                {error}{" "}
                <button type="button" className="underline font-bold ml-2" onClick={() => void load()}>Retry</button>
              </div>
            ) : summary ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                {summary.profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={summary.profile.avatarUrl}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover ring-2"
                    style={{ outlineColor: G.sage, outlineOffset: 2 }}
                  />
                ) : (
                  <span
                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white shrink-0"
                    style={{ background: G.emerald }}
                  >
                    {first.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-1" style={{ color: G.sage }}>
                    My Space
                  </p>
                  <h1 className="text-2xl lg:text-3xl font-black text-white">
                    {isNew ? `Welcome, ${first}` : `Hi, ${first}`}
                  </h1>
                  <p className="text-sm mt-1.5 max-w-xl" style={{ color: "rgba(255,255,255,0.65)" }}>
                    {isNew
                      ? "Let's set up your Kebu. Follow the checklist below — takes 10 minutes."
                      : summary.personalization.exploreOnly
                      ? "Explore Africa, learn, build when you are ready."
                      : "Sites, store, opportunities — everything in one place."}
                  </p>
                  {summary.profile.afriqueId ? (
                    <p className="text-[11px] font-mono mt-2 font-bold" style={{ color: G.sage }}>
                      {summary.profile.afriqueId}
                    </p>
                  ) : null}
                </div>

                {/* quick stats inline in header */}
                {!isNew && (
                  <div className="hidden sm:flex flex-col gap-1.5 shrink-0 items-end">
                    {summary.stats.sitesPublished > 0 && (
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: `${G.jade}25`, color: G.sage }}>
                        {summary.stats.sitesPublished} site{summary.stats.sitesPublished > 1 ? "s" : ""} live
                      </span>
                    )}
                    {summary.stats.storeProducts > 0 && (
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)" }}>
                        {summary.stats.storeProducts} products
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          {/* green accent stripe */}
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${G.emerald}, ${G.jade}, ${G.sage})` }} />
        </div>

        {/* ── Body ───────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-8 lg:py-12">

          {/* Quick actions — always first */}
          <div className="mb-10">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Builder", href: "/create", color: KEBU.orange },
                { label: "Studio", href: "/studio", color: "#9333EA" },
                { label: "Businesses", href: "/business", color: G.emerald },
                { label: "Opportunity OS", href: "/opportunity", color: KEBU.red },
                { label: "B2B directory", href: "/b2b", color: G.forest },
                { label: "Countries", href: "/opportunity/countries", color: G.muted },
                { label: "Account", href: "/account", color: G.muted },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all hover:brightness-110 hover:-translate-y-px"
                  style={{ background: `${a.color}18`, color: a.color, border: `1px solid ${a.color}30` }}
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} style={{ background: G.card, border: `1.5px solid ${G.border}`, borderRadius: 16, padding: "1.25rem" }}>
                  <Skeleton height={28} width="45%" style={{ marginBottom: 10, background: "rgba(5,150,105,0.08)" }} />
                  <Skeleton height={10} width="60%" style={{ background: "rgba(5,150,105,0.06)" }} />
                </div>
              ))}
            </div>
          ) : null}

          {summary ? (
            <div className="space-y-10">
              {/* Onboarding for new users */}
              {isNew ? <SetupChecklist summary={summary} /> : null}

              {/* Stat grid */}
              {!isNew ? (
                <section>
                  <SectionHead label="Overview" />
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatTile
                      value={summary.stats.sitesTotal}
                      label="Your sites"
                      href={MY_SITES_HREF}
                      ctaLabel="Build a site →"
                      color={KEBU.orange}
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                        </svg>
                      }
                    />
                    <StatTile
                      value={summary.stats.sitesPublished}
                      label="Published"
                      href={`${MY_SITES_HREF}?filter=live`}
                      ctaLabel="Publish a site →"
                      color={G.emerald}
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
                        </svg>
                      }
                    />
                    <StatTile
                      value={summary.stats.storeProducts}
                      label="Products"
                      href={MY_SITES_HREF}
                      ctaLabel="Add a product →"
                      color={G.jade}
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18" />
                        </svg>
                      }
                    />
                    <StatTile
                      value={summary.stats.emailSubscribers}
                      label="Subscribers"
                      href={summary.businesses[0] ? `/business/${summary.businesses[0].id}` : "/account"}
                      ctaLabel="Capture emails →"
                      color="#0EA5E9"
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                        </svg>
                      }
                    />
                    <StatTile
                      value={summary.stats.createDesigns}
                      label="Designs"
                      href="/studio"
                      ctaLabel="Open Studio →"
                      color="#9333EA"
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                        </svg>
                      }
                    />
                    <StatTile
                      value={summary.stats.countriesLive}
                      label="Countries"
                      href="/opportunity/countries"
                      ctaLabel="Explore Africa →"
                      color={G.forest}
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                        </svg>
                      }
                    />
                  </div>
                </section>
              ) : null}

              {/* Recent sites */}
              {summary.sites.length > 0 ? (
                <section>
                  <SectionHead
                    label="Your sites"
                    action={
                      <Link href={MY_SITES_HREF} className="text-[10px] font-bold" style={{ color: G.emerald }}>
                        All →
                      </Link>
                    }
                  />
                  <div className="space-y-2">
                    {summary.sites.slice(0, 4).map((s) => (
                      <SiteRow key={s.id} site={s} />
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Businesses */}
              {summary.businesses.length > 0 ? (
                <section>
                  <SectionHead
                    label="Business & Kebu ID"
                    action={
                      <Link href="/business" className="text-[10px] font-bold" style={{ color: G.emerald }}>
                        All →
                      </Link>
                    }
                  />
                  <div className="space-y-3">
                    {summary.businesses.map((b) => (
                      <Link
                        key={b.id}
                        href={`/business/${b.id}`}
                        className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all hover:-translate-y-px"
                        style={{
                          background: G.forest,
                          borderLeft: `4px solid ${G.jade}`,
                        }}
                      >
                        <div>
                          <p className="font-bold text-sm text-white">{b.name}</p>
                          <p className="text-[11px] font-mono font-bold mt-0.5" style={{ color: G.sage }}>
                            {b.publicKebuId}
                          </p>
                        </div>
                        {b.readinessScore != null ? (
                          <div className="text-right">
                            <p className="text-2xl font-black" style={{ color: G.jade }}>
                              {b.readinessScore}
                            </p>
                            <p className="text-[9px] font-bold uppercase" style={{ color: G.faint }}>
                              readiness
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-bold uppercase" style={{ color: G.sage }}>
                            Set up →
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Checklist for returning users */}
              {!isNew ? <SetupChecklist summary={summary} /> : null}

              {/* Next steps / activity */}
              {summary.updates.length > 0 ? (
                <section>
                  <SectionHead label="Next steps" />
                  <div className="space-y-2">
                    {summary.updates.map((u) => (
                      <UpdateRow key={u.id} item={u} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
