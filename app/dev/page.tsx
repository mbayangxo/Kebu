"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

const T = {
  border: KEBU.border,
  rowHover: "rgba(255,85,0,0.03)",
} as const;

type AppStatus = "published" | "review" | "draft";

const STATUS: Record<AppStatus, { bg: string; color: string; label: string }> = {
  published: { bg: "rgba(16,185,129,0.1)",  color: "#059669", label: "Published" },
  review:    { bg: "rgba(245,158,11,0.1)",  color: "#D97706", label: "In Review" },
  draft:     { bg: "rgba(10,10,10,0.07)",   color: KEBU.muted, label: "Draft"    },
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
      style={{ border: `1px solid ${T.border}`, background: KEBU.white }}
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
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: KEBU.muted }}>
              {item.label}
            </p>
          </div>
        );
        const style = {
          borderRight: i < items.length - 1 ? `1px solid ${T.border}` : "none",
          flex: "1 1 80px",
          minWidth: 80,
          transition: "background 120ms",
        };
        return item.href ? (
          <Link
            key={item.label}
            href={item.href}
            style={style}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,85,0,0.04)"; }}
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
      style={{ borderBottom: `1px solid ${T.border}` }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.rowHover; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: KEBU.black }}>{name}</p>
        <p className="text-[11px] mt-0.5" style={{ color: KEBU.muted }}>{category}</p>
      </div>
      <span
        className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
        style={{ background: s.bg, color: s.color }}
      >
        {s.label}
      </span>
      <p className="shrink-0 text-sm font-semibold tabular-nums w-14 text-right" style={{ color: KEBU.black }}>
        {installs.toLocaleString()}
      </p>
      <p className="shrink-0 text-sm font-semibold tabular-nums w-20 text-right" style={{ color: KEBU.black }}>
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
        <span style={{ color: T.border }}>·</span>
        <button type="button" className="text-[11px] font-semibold" style={{ color: KEBU.muted }} onClick={(e) => e.stopPropagation()}>
          Archive
        </button>
      </div>
    </Link>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function DevEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Kebu-branded illustration — layered app cards */}
      <div className="relative w-56 h-40 mb-8 select-none" aria-hidden>
        {/* Back card */}
        <div
          className="absolute rounded-2xl"
          style={{
            width: 160, height: 108,
            top: 8, left: 0,
            background: KEBU.bright,
            border: `1.5px solid ${T.border}`,
            transform: "rotate(-5deg)",
          }}
        >
          <div className="px-4 pt-4 space-y-2">
            <div className="h-2 rounded-full w-3/4" style={{ background: "rgba(10,10,10,0.1)" }} />
            <div className="h-2 rounded-full w-1/2" style={{ background: "rgba(10,10,10,0.07)" }} />
          </div>
        </div>
        {/* Front card */}
        <div
          className="absolute rounded-2xl"
          style={{
            width: 176, height: 118,
            top: 16, left: 24,
            background: KEBU.white,
            border: `1.5px solid ${KEBU.orange}`,
            boxShadow: "0 4px 20px rgba(255,85,0,0.12)",
          }}
        >
          <div className="px-4 pt-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 rounded" style={{ background: KEBU.orange }} />
              <div className="h-2 rounded-full w-2/3" style={{ background: "rgba(10,10,10,0.12)" }} />
            </div>
            <div className="h-2 rounded-full w-full" style={{ background: "rgba(10,10,10,0.07)" }} />
            <div className="h-2 rounded-full w-4/5" style={{ background: "rgba(10,10,10,0.05)" }} />
            <div className="h-6 rounded-lg w-1/3 mt-1" style={{ background: KEBU.orange, opacity: 0.85 }} />
          </div>
        </div>
        {/* Orange glow dot */}
        <div
          className="absolute w-3 h-3 rounded-full"
          style={{ bottom: 12, right: 16, background: KEBU.orange, boxShadow: "0 0 10px rgba(255,85,0,0.5)" }}
        />
      </div>

      <p className="text-base font-bold mb-1.5" style={{ color: KEBU.black }}>
        Build apps for Kebu
      </p>
      <p className="text-sm mb-1 max-w-xs leading-relaxed" style={{ color: KEBU.muted }}>
        Extend Kebu&apos;s functionality and distribute your app to every business on the continent.
      </p>
      <p className="text-[11px] mb-8" style={{ color: KEBU.faint }}>
        Sites · Commerce · Messaging · Opportunity OS
      </p>
      <Link
        href="/dev/apps/new"
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all active:scale-[0.97] hover:brightness-105"
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
    <AppShell
      title="Developer Platform"
      actions={
        <Link
          href="/dev/apps/new"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-[0.97] hover:brightness-105"
          style={{ background: KEBU.orange, color: KEBU.white }}
        >
          + New App
        </Link>
      }
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Section nav */}
        <div className="flex items-center gap-1 mb-8 -mx-1">
          {[
            { label: "Overview", href: "/dev"           },
            { label: "Apps",     href: "/dev/apps"      },
            { label: "Assets",   href: "/dev/assets"    },
            { label: "API Keys", href: "/dev/api-keys"  },
            { label: "Docs",     href: "/dev/docs"      },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ color: KEBU.muted }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(10,10,10,0.05)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
            >
              {label}
            </Link>
          ))}
        </div>

        {hasApps ? (
          <>
            <StatStrip
              items={[
                { value: apps.length, label: "Apps",          href: "/dev/apps"    },
                { value: 0,           label: "Total installs"                       },
                { value: 0,           label: "Assets",        href: "/dev/assets"  },
                { value: "0 XOF",     label: "Revenue"                              },
              ]}
            />

            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
                  Your Apps
                </h2>
                <Link href="/dev/apps" className="text-xs font-semibold" style={{ color: KEBU.muted }}>
                  View all →
                </Link>
              </div>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${T.border}`, background: KEBU.white }}
              >
                <div
                  className="flex items-center gap-4 px-5 py-2.5"
                  style={{ borderBottom: `1px solid ${T.border}`, background: "rgba(10,10,10,0.03)" }}
                >
                  {["App", "Status", "Installs", "Revenue", ""].map((h) => (
                    <p key={h} className="text-[10px] font-bold uppercase tracking-[0.14em] flex-1" style={{ color: KEBU.muted }}>
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

        {/* Quick links — always visible */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${T.border}`, background: KEBU.white }}
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
              desc: "API reference, webhooks, OAuth scopes, and rate limits.",
              cta: "Documentation",
              href: "/dev/docs",
            },
          ].map((item, i, arr) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 px-5 py-4 transition-colors"
              style={{ borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,85,0,0.03)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
            >
              <span className="text-xl shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: KEBU.black }}>{item.title}</p>
                <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: KEBU.muted }}>{item.desc}</p>
              </div>
              <span className="shrink-0 text-xs font-bold" style={{ color: KEBU.orange }}>{item.cta} →</span>
            </Link>
          ))}
        </div>

      </div>
    </AppShell>
  );
}
