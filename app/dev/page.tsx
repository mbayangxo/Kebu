"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

// ── Dark dev tokens ───────────────────────────────────────────────────────────
const D = {
  bg:      "#0D1117",
  surface: "#161B22",
  border:  "rgba(255,255,255,0.08)",
  muted:   "rgba(255,255,255,0.45)",
  faint:   "rgba(255,255,255,0.2)",
  text:    "#E6EDF3",
} as const;

// ── Status badge styles ───────────────────────────────────────────────────────
type AppStatus = "published" | "review" | "draft";
const STATUS: Record<AppStatus, { bg: string; color: string; label: string }> = {
  published: { bg: "rgba(16,185,129,0.15)",  color: "#34D399", label: "Published" },
  review:    { bg: "rgba(245,158,11,0.15)",  color: "#FCD34D", label: "In Review" },
  draft:     { bg: "rgba(255,255,255,0.07)", color: D.muted,   label: "Draft"     },
};

// ── Stat strip ────────────────────────────────────────────────────────────────
function StatStrip({
  items,
}: {
  items: { value: string | number; label: string; href?: string }[];
}) {
  return (
    <div
      className="flex flex-wrap overflow-hidden rounded-2xl mb-8"
      style={{ border: `1px solid ${D.border}`, background: D.surface }}
    >
      {items.map((item, i) => {
        const inner = (
          <div className="px-5 py-4">
            <p
              className="text-2xl font-black leading-none mb-1 tabular-nums"
              style={{ fontFamily: "var(--font-fraunces)", color: KEBU.orange }}
            >
              {item.value}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: D.muted }}>
              {item.label}
            </p>
          </div>
        );
        const style = {
          borderRight: i < items.length - 1 ? `1px solid ${D.border}` : "none",
          flex: "1 1 80px",
          minWidth: 80,
          transition: "background 120ms",
        };
        return item.href ? (
          <Link
            key={item.label}
            href={item.href}
            style={style}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,85,0,0.07)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
          >
            {inner}
          </Link>
        ) : (
          <div key={item.label} style={style}>{inner}</div>
        );
      })}
    </div>
  );
}

// ── App row ───────────────────────────────────────────────────────────────────
function AppRow({
  name,
  category,
  status,
  installs,
  revenue,
  href,
}: {
  name: string;
  category: string;
  status: AppStatus;
  installs: number;
  revenue: string;
  href: string;
}) {
  const s = STATUS[status];
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 px-5 py-3 transition-colors"
      style={{ borderBottom: `1px solid ${D.border}` }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: D.text }}>{name}</p>
        <p className="text-[11px] mt-0.5" style={{ color: D.muted }}>{category}</p>
      </div>
      <span
        className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
        style={{ background: s.bg, color: s.color }}
      >
        {s.label}
      </span>
      <p className="shrink-0 text-sm font-semibold tabular-nums w-14 text-right" style={{ color: D.text }}>
        {installs.toLocaleString()}
      </p>
      <p className="shrink-0 text-sm font-semibold tabular-nums w-20 text-right" style={{ color: D.text }}>
        {revenue}
      </p>
      <div className="shrink-0 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity w-20 justify-end">
        <Link
          href={`${href}/edit`}
          className="text-[11px] font-semibold"
          style={{ color: KEBU.orange }}
          onClick={(e) => e.stopPropagation()}
        >
          Edit
        </Link>
        <span style={{ color: D.border }}>·</span>
        <button type="button" className="text-[11px] font-semibold" style={{ color: D.muted }} onClick={(e) => e.stopPropagation()}>
          Archive
        </button>
      </div>
    </Link>
  );
}

// ── Empty state illustration ──────────────────────────────────────────────────
function DevEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Abstract illustration — stacked UI mockup cards */}
      <div className="relative w-64 h-44 mb-8 select-none" aria-hidden>
        {/* Back card */}
        <div
          className="absolute rounded-xl"
          style={{
            width: 180, height: 120,
            top: 8, left: 8,
            background: "rgba(255,85,0,0.07)",
            border: `1px solid rgba(255,85,0,0.18)`,
            transform: "rotate(-4deg)",
          }}
        >
          <div className="px-4 pt-4 space-y-2">
            <div className="h-2 rounded-full w-3/4" style={{ background: "rgba(255,85,0,0.25)" }} />
            <div className="h-2 rounded-full w-1/2" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="h-2 rounded-full w-2/3" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
        </div>
        {/* Mid card */}
        <div
          className="absolute rounded-xl"
          style={{
            width: 200, height: 130,
            top: 20, left: 28,
            background: D.surface,
            border: `1px solid rgba(255,85,0,0.28)`,
            transform: "rotate(2deg)",
          }}
        >
          <div className="px-4 pt-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 rounded" style={{ background: KEBU.orange }} />
              <div className="h-2 rounded-full w-2/3" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>
            <div className="h-2 rounded-full w-full" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="h-2 rounded-full w-4/5" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="h-6 rounded-lg w-1/3 mt-3" style={{ background: KEBU.orange, opacity: 0.7 }} />
          </div>
        </div>
        {/* Front accent dot */}
        <div
          className="absolute w-3 h-3 rounded-full"
          style={{ bottom: 16, right: 24, background: KEBU.orange, boxShadow: "0 0 12px rgba(255,85,0,0.6)" }}
        />
      </div>

      <p className="text-base font-bold mb-2" style={{ color: D.text }}>
        Build apps for Kebu
      </p>
      <p className="text-sm mb-1 max-w-xs leading-relaxed" style={{ color: D.muted }}>
        Extend Kebu&apos;s functionality and distribute your app to every business on the continent.
      </p>
      <p className="text-xs mb-8" style={{ color: D.faint }}>
        Sites · Commerce · Messaging · Opportunity OS
      </p>

      <Link
        href="/dev/apps/new"
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all active:scale-[0.97] hover:brightness-110"
        style={{ background: KEBU.orange, color: KEBU.white }}
      >
        Create your first app
      </Link>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DevOverviewPage() {
  const apps: {
    id: string;
    name: string;
    category: string;
    status: AppStatus;
    installs: number;
    revenue: string;
  }[] = [];

  const hasApps = apps.length > 0;

  return (
    <AppShell title="Developer Platform">
      {/* Full dark background for dev section */}
      <div className="min-h-full" style={{ background: D.bg }}>

        {/* ── Dev top bar ───────────────────────────────────────── */}
        <div style={{ borderBottom: `1px solid ${D.border}` }}>
          <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className="w-6 h-6 rounded flex items-center justify-center text-white shrink-0"
                style={{ background: KEBU.orange }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                </svg>
              </span>
              <p className="text-sm font-bold" style={{ color: D.text }}>Kebu Dev</p>
            </div>
            <div className="flex items-center gap-2">
              {[
                { label: "Apps",    href: "/dev/apps"     },
                { label: "Assets",  href: "/dev/assets"   },
                { label: "API Keys",href: "/dev/api-keys" },
                { label: "Docs",    href: "/dev/docs"     },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/5"
                  style={{ color: D.muted }}
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/dev/apps/new"
                className="ml-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.97] hover:brightness-110"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                + New App
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10 py-8">

          {hasApps ? (
            <>
              {/* Stats */}
              <StatStrip
                items={[
                  { value: apps.length, label: "Apps",           href: "/dev/apps"     },
                  { value: 0,           label: "Total installs"                         },
                  { value: 0,           label: "Assets",         href: "/dev/assets"   },
                  { value: "0 XOF",     label: "Revenue"                                },
                ]}
              />

              {/* Apps table */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
                    Your Apps
                  </h2>
                  <Link href="/dev/apps" className="text-xs font-semibold" style={{ color: D.muted }}>
                    View all →
                  </Link>
                </div>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ border: `1px solid ${D.border}`, background: D.surface }}
                >
                  <div
                    className="flex items-center gap-4 px-5 py-2.5"
                    style={{ borderBottom: `1px solid ${D.border}`, background: "rgba(255,255,255,0.02)" }}
                  >
                    {["App", "Status", "Installs", "Revenue", ""].map((h) => (
                      <p key={h} className="text-[10px] font-bold uppercase tracking-[0.14em] flex-1" style={{ color: D.faint }}>
                        {h}
                      </p>
                    ))}
                  </div>
                  {apps.map((app) => (
                    <AppRow key={app.id} {...app} href={`/dev/apps/${app.id}`} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <DevEmptyState />
          )}

          {/* Quick links row — always visible */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${D.border}`, background: D.surface }}
          >
            {[
              {
                icon: "🔑",
                title: "Get API credentials",
                desc: "Create an app, then generate API keys to call Kebu's REST + webhook APIs.",
                cta: "API Keys",
                href: "/dev/api-keys",
              },
              {
                icon: "📦",
                title: "Upload assets",
                desc: "Fonts, icons, images, and templates for your apps and the Aesthetic Gallery.",
                cta: "Assets",
                href: "/dev/assets",
              },
              {
                icon: "📖",
                title: "Read the docs",
                desc: "API reference, webhooks, OAuth scopes, rate limits.",
                cta: "Documentation",
                href: "/dev/docs",
              },
            ].map((item, i, arr) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-4 px-5 py-4 transition-colors"
                style={{ borderBottom: i < arr.length - 1 ? `1px solid ${D.border}` : "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
              >
                <span className="text-xl shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: D.text }}>{item.title}</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: D.muted }}>{item.desc}</p>
                </div>
                <span className="shrink-0 text-xs font-bold" style={{ color: KEBU.orange }}>{item.cta} →</span>
              </Link>
            ))}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
