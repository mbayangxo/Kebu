"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

const T = { border: KEBU.border } as const;

const CATEGORY_LABELS: Record<string, string> = {
  site_template:   "Site Template",
  business_tool:   "Business Tool",
  mobile_money:    "Mobile Money",
  ai_plugin:       "AI Plugin",
  studio_template: "Studio Template",
  logistics:       "Logistics",
};

const FILTER_CATEGORIES = [
  "All",
  "Site Templates",
  "Business Tools",
  "Mobile Money",
  "AI Plugins",
  "Studio Templates",
  "Logistics",
] as const;

type FilterCategory = (typeof FILTER_CATEGORIES)[number];
type AppStatus = "published" | "review" | "draft";

const STATUS_STYLES: Record<AppStatus, { bg: string; color: string; label: string }> = {
  published: { bg: "rgba(16,185,129,0.1)",  color: "#059669", label: "Published" },
  review:    { bg: "rgba(245,158,11,0.1)",  color: "#D97706", label: "In Review" },
  draft:     { bg: "rgba(10,10,10,0.07)",   color: KEBU.muted, label: "Draft"    },
};

type DevApp = {
  id: string;
  name: string;
  tagline: string | null;
  category: string;
  pricing: string;
  price_xof: number | null;
  status: AppStatus;
  installs: number;
  created_at: string;
  updated_at: string;
};

function AppTableRow({ app }: { app: DevApp }) {
  const s = STATUS_STYLES[app.status] ?? STATUS_STYLES.draft;
  return (
    <div
      className="group grid items-center gap-4 px-5 py-3 transition-colors"
      style={{
        gridTemplateColumns: "1fr 140px 90px 90px 100px",
        borderBottom: `1px solid ${T.border}`,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,85,0,0.03)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      <div className="min-w-0">
        <Link href={`/dev/apps/${app.id}`} className="text-sm font-semibold hover:underline" style={{ color: KEBU.black }}>
          {app.name}
        </Link>
        {app.tagline && (
          <p className="text-[11px] truncate mt-0.5" style={{ color: KEBU.muted }}>{app.tagline}</p>
        )}
      </div>
      <p className="text-[11px]" style={{ color: KEBU.muted }}>{CATEGORY_LABELS[app.category] ?? app.category}</p>
      <span
        className="justify-self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
        style={{ background: s.bg, color: s.color }}
      >
        {s.label}
      </span>
      <p className="text-sm font-semibold tabular-nums text-right" style={{ color: KEBU.black }}>
        {app.installs.toLocaleString()}
      </p>
      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/dev/apps/${app.id}/edit`} className="text-[11px] font-semibold" style={{ color: KEBU.orange }}>
          Edit
        </Link>
        <span style={{ color: T.border }}>·</span>
        <Link href={`/dev/apps/${app.id}`} className="text-[11px] font-semibold" style={{ color: KEBU.muted }}>
          View
        </Link>
      </div>
    </div>
  );
}

const CATEGORY_FOR_FILTER: Record<FilterCategory, string | null> = {
  "All":              null,
  "Site Templates":   "site_template",
  "Business Tools":   "business_tool",
  "Mobile Money":     "mobile_money",
  "AI Plugins":       "ai_plugin",
  "Studio Templates": "studio_template",
  "Logistics":        "logistics",
};

export default function DevAppsPage() {
  const [category, setCategory] = useState<FilterCategory>("All");
  const [apps, setApps] = useState<DevApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dev/apps")
      .then((r) => r.json())
      .then((j) => setApps(j.apps ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filterKey = CATEGORY_FOR_FILTER[category];
  const filtered = filterKey
    ? apps.filter((a) => a.category === filterKey)
    : apps;

  return (
    <AppShell
      title="Apps"
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

        <div className="flex flex-wrap gap-1.5 mb-6">
          {FILTER_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.97]"
              style={{
                background: category === c ? KEBU.black : KEBU.white,
                color: category === c ? KEBU.white : KEBU.muted,
                border: `1px solid ${category === c ? KEBU.black : T.border}`,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: KEBU.orange, borderTopColor: "transparent" }} />
          </div>
        ) : filtered.length > 0 ? (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${T.border}`, background: KEBU.white }}
          >
            <div
              className="grid px-5 py-2.5"
              style={{
                gridTemplateColumns: "1fr 140px 90px 90px 100px",
                borderBottom: `1px solid ${T.border}`,
                background: "rgba(10,10,10,0.03)",
              }}
            >
              {["App", "Category", "Status", "Installs", ""].map((h, i) => (
                <p
                  key={i}
                  className={`text-[10px] font-bold uppercase tracking-[0.14em] ${i === 3 ? "text-right" : ""}`}
                  style={{ color: KEBU.muted }}
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
            style={{ border: `1.5px dashed ${T.border}`, background: KEBU.white }}
          >
            <span className="text-5xl mb-5">📦</span>
            <p className="text-base font-bold mb-1.5" style={{ color: KEBU.black }}>
              {category === "All" ? "No apps yet" : `No ${category} yet`}
            </p>
            <p className="text-sm mb-6 max-w-sm" style={{ color: KEBU.muted }}>
              Build an integration, template, or tool for Africa&apos;s growing Kebu ecosystem. Earn from every install.
            </p>
            <Link
              href="/dev/apps/new"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all active:scale-[0.97] hover:brightness-105"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              Create your first app
            </Link>
            <Link href="/dev" className="mt-4 text-xs font-semibold underline" style={{ color: KEBU.muted }}>
              What can you build?
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
