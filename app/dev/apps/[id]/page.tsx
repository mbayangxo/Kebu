"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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

const PRICING_LABELS: Record<string, string> = {
  free:      "Free",
  paid:      "Paid (one-time)",
  recurring: "Subscription",
};

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

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl p-4"
      style={{ background: KEBU.white, border: `1px solid ${T.border}` }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: KEBU.muted }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: KEBU.black, fontFamily: "var(--font-fraunces)" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

export default function DevAppDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<DevApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/dev/apps/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((j) => { if (j) setApp(j.app); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppShell title="App">
        <div className="flex justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: KEBU.orange, borderTopColor: "transparent" }} />
        </div>
      </AppShell>
    );
  }

  if (notFound || !app) {
    return (
      <AppShell title="App not found">
        <div className="max-w-xl mx-auto px-5 py-20 text-center">
          <p className="text-base font-bold mb-2" style={{ color: KEBU.black }}>App not found</p>
          <p className="text-sm mb-6" style={{ color: KEBU.muted }}>This app doesn&apos;t exist or you don&apos;t have access.</p>
          <Link href="/dev/apps" className="text-sm font-semibold underline" style={{ color: KEBU.orange }}>← Back to Apps</Link>
        </div>
      </AppShell>
    );
  }

  const s = STATUS_STYLES[app.status] ?? STATUS_STYLES.draft;
  const priceDisplay =
    app.pricing === "free" ? "Free" :
    app.pricing === "paid" && app.price_xof ? `${app.price_xof.toLocaleString()} XOF` :
    app.pricing === "recurring" && app.price_xof ? `${app.price_xof.toLocaleString()} XOF/mo` :
    "—";

  const createdAt = new Date(app.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
  const updatedAt = new Date(app.updated_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

  return (
    <AppShell
      title={app.name}
      actions={
        app.status !== "published" ? (
          <Link
            href={`/dev/apps/${app.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-[0.97] hover:brightness-105"
            style={{ background: KEBU.orange, color: KEBU.white }}
          >
            Edit
          </Link>
        ) : undefined
      }
    >
      <div className="max-w-2xl mx-auto px-5 sm:px-8 lg:px-10 py-8 space-y-7">

        {/* Header */}
        <div>
          <Link href="/dev/apps" className="text-xs font-semibold mb-3 inline-flex items-center gap-1" style={{ color: KEBU.muted }}>
            ← Back to Apps
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
                {app.name}
              </h1>
              {app.tagline && (
                <p className="text-sm mt-1" style={{ color: KEBU.muted }}>{app.tagline}</p>
              )}
            </div>
            <span
              className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mt-1"
              style={{ background: s.bg, color: s.color }}
            >
              {s.label}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Installs" value={app.installs} />
          <StatTile label="Price" value={priceDisplay} />
          <StatTile label="Created" value={createdAt} />
          <StatTile label="Updated" value={updatedAt} />
        </div>

        {/* Details */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: KEBU.white, border: `1px solid ${T.border}` }}
        >
          <h2 className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: KEBU.muted }}>Details</h2>
          {[
            { label: "Category", value: CATEGORY_LABELS[app.category] ?? app.category },
            { label: "Pricing", value: PRICING_LABELS[app.pricing] ?? app.pricing },
            ...(app.price_xof ? [{ label: "Price", value: `${app.price_xof.toLocaleString()} XOF` }] : []),
            { label: "Status", value: s.label },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-4" style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: "12px" }}>
              <p className="text-xs font-semibold" style={{ color: KEBU.muted }}>{label}</p>
              <p className="text-sm font-semibold" style={{ color: KEBU.black }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        {app.status === "draft" && (
          <div
            className="rounded-2xl p-5"
            style={{ background: KEBU.white, border: `1px solid ${T.border}` }}
          >
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] mb-3" style={{ color: KEBU.muted }}>Next steps</h2>
            <p className="text-sm mb-4" style={{ color: KEBU.muted }}>
              Your app is in draft. Edit the details, then submit for review to publish to the Kebu marketplace.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href={`/dev/apps/${app.id}/edit`}
                className="rounded-xl px-5 py-2.5 text-sm font-bold transition-all active:scale-[0.97] hover:brightness-105"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                Edit app
              </Link>
              <Link href="/dev/apps" className="text-sm font-semibold" style={{ color: KEBU.muted }}>
                Back to list
              </Link>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
