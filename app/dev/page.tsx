"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  border: KEBU.border,
  row: "rgba(10,10,10,0.025)",
  badge: {
    published: { bg: "rgba(16,185,129,0.1)", color: "#059669" },
    review:    { bg: "rgba(245,158,11,0.1)", color: "#D97706" },
    draft:     { bg: "rgba(10,10,10,0.07)",  color: KEBU.muted },
  },
} as const;

// ── Stat strip ────────────────────────────────────────────────────────────────
function StatStrip({
  items,
}: {
  items: { value: string | number; label: string; href?: string }[];
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-0 mb-8 rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${T.border}`, background: KEBU.white }}
    >
      {items.map((item, i) => {
        const el = (
          <div
            className="flex-1 px-5 py-4 min-w-[100px]"
            style={{
              borderRight: i < items.length - 1 ? `1px solid ${T.border}` : "none",
            }}
          >
            <p
              className="text-2xl font-black leading-none mb-1 tabular-nums"
              style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
            >
              {item.value}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: KEBU.muted }}>
              {item.label}
            </p>
          </div>
        );
        return item.href ? (
          <Link
            key={item.label}
            href={item.href}
            className="flex-1 min-w-[100px] transition-colors hover:bg-orange-50"
          >
            {el}
          </Link>
        ) : (
          <div key={item.label} className="flex-1 min-w-[100px]">{el}</div>
        );
      })}
    </div>
  );
}

// ── App row ───────────────────────────────────────────────────────────────────
type AppStatus = "published" | "review" | "draft";

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
  const badge = T.badge[status];
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 px-5 py-3.5 transition-colors"
      style={{ borderBottom: `1px solid ${T.border}` }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.row; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      {/* Name + category */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: KEBU.black }}>{name}</p>
        <p className="text-[11px] mt-0.5" style={{ color: KEBU.muted }}>{category}</p>
      </div>

      {/* Status */}
      <span
        className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
        style={{ background: badge.bg, color: badge.color }}
      >
        {status === "review" ? "In review" : status}
      </span>

      {/* Stats */}
      <p className="shrink-0 text-sm font-semibold tabular-nums w-16 text-right" style={{ color: KEBU.black }}>
        {installs.toLocaleString()}
      </p>
      <p className="shrink-0 text-sm font-semibold tabular-nums w-20 text-right" style={{ color: KEBU.black }}>
        {revenue}
      </p>

      {/* Hover actions */}
      <div
        className="shrink-0 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: 80 }}
      >
        <Link
          href={`${href}/edit`}
          className="text-[11px] font-semibold"
          style={{ color: KEBU.orange }}
          onClick={(e) => e.stopPropagation()}
        >
          Edit
        </Link>
        <span style={{ color: T.border }}>·</span>
        <button
          type="button"
          className="text-[11px] font-semibold"
          style={{ color: KEBU.muted }}
          onClick={(e) => e.stopPropagation()}
        >
          Archive
        </button>
      </div>
    </Link>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({
  icon,
  heading,
  sub,
  cta,
  ctaHref,
}: {
  icon: string;
  heading: string;
  sub: string;
  cta: string;
  ctaHref: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 rounded-2xl text-center"
      style={{ border: `1.5px dashed ${T.border}`, background: KEBU.white }}
    >
      <span className="text-4xl mb-4">{icon}</span>
      <p className="text-base font-bold mb-1" style={{ color: KEBU.black }}>{heading}</p>
      <p className="text-sm mb-6 max-w-xs" style={{ color: KEBU.muted }}>{sub}</p>
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold transition-all active:scale-[0.97]"
        style={{ background: KEBU.orange, color: KEBU.white }}
      >
        {cta}
      </Link>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DevOverviewPage() {
  // These will be fetched from API once the schema is in place
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

        {/* Stats */}
        <StatStrip
          items={[
            { value: apps.length, label: "Apps", href: "/dev/apps" },
            { value: 0, label: "Total installs" },
            { value: 0, label: "Assets", href: "/dev/assets" },
            { value: "$0", label: "Revenue (XOF)" },
          ]}
        />

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { label: "New app", href: "/dev/apps/new", primary: true },
            { label: "Upload asset", href: "/dev/assets" },
            { label: "API Keys", href: "/dev/api-keys" },
            { label: "Documentation", href: "/dev/docs" },
          ].map(({ label, href, primary }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl px-4 py-2 text-xs font-semibold transition-all active:scale-[0.97]"
              style={{
                background: primary ? KEBU.black : KEBU.white,
                color: primary ? KEBU.white : KEBU.black,
                border: primary ? "none" : `1px solid ${T.border}`,
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Apps section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-[11px] font-black uppercase tracking-[0.2em]"
              style={{ color: KEBU.orange }}
            >
              Your Apps
            </h2>
            {hasApps && (
              <Link href="/dev/apps" className="text-xs font-semibold" style={{ color: KEBU.muted }}>
                View all →
              </Link>
            )}
          </div>

          {hasApps ? (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${T.border}`, background: KEBU.white }}
            >
              {/* Table header */}
              <div
                className="grid px-5 py-2"
                style={{
                  gridTemplateColumns: "1fr 120px 64px 80px 80px",
                  borderBottom: `1px solid ${T.border}`,
                  background: "rgba(10,10,10,0.03)",
                }}
              >
                {["Name", "Status", "Installs", "Revenue", ""].map((h) => (
                  <p
                    key={h}
                    className="text-[10px] font-bold uppercase tracking-[0.14em] text-right first:text-left"
                    style={{ color: KEBU.muted }}
                  >
                    {h}
                  </p>
                ))}
              </div>
              {apps.map((app) => (
                <AppRow
                  key={app.id}
                  {...app}
                  href={`/dev/apps/${app.id}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="📦"
              heading="No apps yet"
              sub="Build an integration, template, or tool — and distribute it to every Kebu business on the continent."
              cta="Create your first app"
              ctaHref="/dev/apps/new"
            />
          )}
        </div>

        {/* Info strip */}
        <div
          className="rounded-2xl p-5"
          style={{ background: KEBU.white, border: `1px solid ${T.border}` }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] mb-3" style={{ color: KEBU.orange }}>
            What you can build
          </p>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
            {[
              ["Site Templates", "Sell designs in the Aesthetic Gallery"],
              ["Business Tools", "CRM, inventory, booking integrations"],
              ["Mobile Money", "Wave, Orange Money, MTN connectors"],
              ["AI Plugins", "Extend Yande AI for your use case"],
              ["Studio Templates", "Poster, flyer, brand kits"],
              ["Logistics", "Delivery & shipping integrations"],
            ].map(([name, desc]) => (
              <div key={name} className="flex items-baseline gap-2 py-1.5" style={{ borderBottom: `1px solid ${T.border}` }}>
                <p className="text-xs font-semibold shrink-0" style={{ color: KEBU.black }}>{name}</p>
                <p className="text-[11px] truncate" style={{ color: KEBU.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
