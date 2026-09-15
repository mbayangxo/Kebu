"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

const D = {
  bg:      "#0D1117",
  surface: "#161B22",
  border:  "rgba(255,255,255,0.08)",
  muted:   "rgba(255,255,255,0.45)",
  faint:   "rgba(255,255,255,0.2)",
  text:    "#E6EDF3",
} as const;

const CATEGORIES = [
  "All",
  "Site Templates",
  "Business Tools",
  "Mobile Money",
  "AI Plugins",
  "Studio Templates",
  "Logistics",
] as const;

type Category = (typeof CATEGORIES)[number];
type AppStatus = "published" | "review" | "draft";

const STATUS_STYLES: Record<AppStatus, { bg: string; color: string; label: string }> = {
  published: { bg: "rgba(16,185,129,0.15)",  color: "#34D399", label: "Published" },
  review:    { bg: "rgba(245,158,11,0.15)",  color: "#FCD34D", label: "In Review" },
  draft:     { bg: "rgba(255,255,255,0.07)", color: D.muted,   label: "Draft"     },
};

const MOCK_APPS: {
  id: string;
  name: string;
  category: string;
  status: AppStatus;
  installs: number;
  revenue: number;
  updatedAt: string;
}[] = [];

function AppTableRow({ app }: { app: (typeof MOCK_APPS)[number] }) {
  const s = STATUS_STYLES[app.status];
  return (
    <div
      className="group grid items-center gap-4 px-5 py-3 transition-colors"
      style={{
        gridTemplateColumns: "1fr 140px 90px 90px 80px 100px",
        borderBottom: `1px solid ${D.border}`,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      <div className="min-w-0">
        <Link href={`/dev/apps/${app.id}`} className="text-sm font-semibold hover:underline" style={{ color: D.text }}>
          {app.name}
        </Link>
      </div>
      <p className="text-[11px]" style={{ color: D.muted }}>{app.category}</p>
      <span
        className="justify-self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
        style={{ background: s.bg, color: s.color }}
      >
        {s.label}
      </span>
      <p className="text-sm font-semibold tabular-nums text-right" style={{ color: D.text }}>
        {app.installs.toLocaleString()}
      </p>
      <p className="text-sm font-semibold tabular-nums text-right" style={{ color: D.text }}>
        {app.revenue === 0 ? "—" : `${app.revenue.toLocaleString()} XOF`}
      </p>
      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/dev/apps/${app.id}/edit`} className="text-[11px] font-semibold" style={{ color: KEBU.orange }}>
          Edit
        </Link>
        <span style={{ color: D.border }}>·</span>
        <button type="button" className="text-[11px] font-semibold" style={{ color: D.muted }}>
          Archive
        </button>
      </div>
    </div>
  );
}

export default function DevAppsPage() {
  const [category, setCategory] = useState<Category>("All");

  const filtered = MOCK_APPS.filter(
    (a) => category === "All" || a.category === category,
  );

  return (
    <AppShell title="Apps">
      <div className="min-h-full" style={{ background: D.bg }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: KEBU.orange }}>
                Developer Platform
              </p>
              <h1 className="text-xl font-black" style={{ fontFamily: "var(--font-fraunces)", color: D.text }}>
                Apps
              </h1>
            </div>
            <Link
              href="/dev/apps/new"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-[0.97] hover:brightness-105"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              + New App
            </Link>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.97]"
                style={{
                  background: category === c ? KEBU.orange : "rgba(255,255,255,0.06)",
                  color: category === c ? KEBU.white : D.muted,
                  border: `1px solid ${category === c ? KEBU.orange : D.border}`,
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {filtered.length > 0 ? (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${D.border}`, background: D.surface }}
            >
              <div
                className="grid px-5 py-2.5"
                style={{
                  gridTemplateColumns: "1fr 140px 90px 90px 80px 100px",
                  borderBottom: `1px solid ${D.border}`,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                {["App", "Category", "Status", "Installs", "Revenue", ""].map((h, i) => (
                  <p
                    key={i}
                    className={`text-[10px] font-bold uppercase tracking-[0.14em] ${i > 2 ? "text-right" : ""}`}
                    style={{ color: D.faint }}
                  >
                    {h}
                  </p>
                ))}
              </div>
              {filtered.map((app) => <AppTableRow key={app.id} app={app} />)}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-20 rounded-2xl text-center"
              style={{ border: `1.5px dashed ${D.border}`, background: D.surface }}
            >
              <span className="text-5xl mb-5">📦</span>
              <p className="text-base font-bold mb-1.5" style={{ color: D.text }}>
                {category === "All" ? "No apps yet" : `No ${category} apps yet`}
              </p>
              <p className="text-sm mb-6 max-w-sm" style={{ color: D.muted }}>
                Build an integration, template, or tool for Africa&apos;s growing Kebu ecosystem.
              </p>
              <Link
                href="/dev/apps/new"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all active:scale-[0.97] hover:brightness-105"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                Create your first app
              </Link>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}
