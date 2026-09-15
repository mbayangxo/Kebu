"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import {
  formatXof,
  type CommerceAnalyticsSummary,
} from "@/lib/shop/commerce-insights";
import { ShopSellerTrustBanner } from "@/app/components/shop/shop-seller-trust-banner";

function OrdersSparkChart({ data, days }: { data: { day: string; orders: number; paid: number }[]; days: number }) {
  if (data.length < 2) return null;

  const W = 400;
  const H = 72;
  const PAD = { top: 6, right: 2, bottom: 18, left: 2 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(1, ...data.map((d) => d.orders));

  // aggregate to max 60 points to keep SVG light
  const step = Math.ceil(data.length / 60);
  const pts = data
    .filter((_, i) => i % step === 0 || i === data.length - 1)
    .map((d, i, arr) => ({
      x: PAD.left + (i / Math.max(arr.length - 1, 1)) * cw,
      y: PAD.top + ch - (d.orders / maxVal) * ch,
      label: d.day.slice(5),
      v: d.orders,
    }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = [
    `M${pts[0].x.toFixed(1)},${(PAD.top + ch).toFixed(1)}`,
    ...pts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + ch).toFixed(1)}Z`,
  ].join(" ");

  const firstLabel = pts[0]?.label ?? "";
  const lastLabel = pts[pts.length - 1]?.label ?? "";
  const midLabel = days >= 30 && pts[Math.floor(pts.length / 2)]?.label;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      aria-label="Orders over time"
      style={{ display: "block" }}
    >
      <path d={area} fill={KEBU.orange} fillOpacity={0.1} />
      <path d={line} fill="none" stroke={KEBU.orange} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      {/* endpoint dot */}
      {pts[pts.length - 1] && (
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={3} fill={KEBU.orange} />
      )}
      {/* axis labels */}
      <text x={PAD.left} y={H - 2} fontSize={9} fill={KEBU.muted} textAnchor="start">{firstLabel}</text>
      {midLabel && (
        <text x={W / 2} y={H - 2} fontSize={9} fill={KEBU.muted} textAnchor="middle">{midLabel}</text>
      )}
      <text x={W - PAD.right} y={H - 2} fontSize={9} fill={KEBU.muted} textAnchor="end">{lastLabel}</text>
    </svg>
  );
}

const OVERVIEW_PERIODS: { label: string; days: number }[] = [
  { label: "Today", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "Year", days: 365 },
];

/**
 * Owner dashboard home for one store — how you’re doing, order sources, visitors.
 */
export function ShopOverviewPanel({ projectId }: { projectId: string }) {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<CommerceAnalyticsSummary | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/shop-analytics?days=${days}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load dashboard.");
        setSummary(null);
        return;
      }
      setTitle(typeof data.project?.title === "string" ? data.project.title : null);
      setSummary(data.summary as CommerceAnalyticsSummary);
    } catch {
      setError("Network error.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  const periodLabel = OVERVIEW_PERIODS.find((p) => p.days === days)?.label ?? `${days} days`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
            Overview dashboard
          </p>
          <h2 className="mt-1 text-lg font-bold" style={{ color: KEBU.black }}>
            {title ? `How ${title} is doing` : "How this shop is doing"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
            {periodLabel} · real orders and site visits — not demo numbers.
          </p>
        </div>
        <div
          className="flex rounded-full p-0.5"
          style={{ background: "#F4F4F4", border: `1px solid ${KEBU.border}` }}
          role="group"
          aria-label="Time period"
        >
          {OVERVIEW_PERIODS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setDays(opt.days)}
              className="rounded-full px-3 py-1 text-[10px] font-bold transition-colors"
              style={{
                background: days === opt.days ? KEBU.black : "transparent",
                color: days === opt.days ? "#fff" : KEBU.muted,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <ShopSellerTrustBanner projectId={projectId} />
      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Loading your store pulse…
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {summary && !loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Orders", String(summary.orders.total)],
                ["Paid", String(summary.orders.paid)],
                ["Paid revenue", formatXof(summary.orders.revenuePaidXof)],
                ["Pageviews", summary.traffic.pageviews == null ? "—" : String(summary.traffic.pageviews)],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl px-4 py-3"
                style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  {label}
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: KEBU.black }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {(summary.byDay ?? []).length >= 2 && (
            <section
              className="rounded-2xl px-4 pt-4 pb-2"
              style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  Orders over time
                </h3>
                <span className="text-[10px] tabular-nums" style={{ color: KEBU.muted }}>
                  {summary.orders.total} total · {summary.orders.paid} paid
                </span>
              </div>
              <div className="mt-2">
                <OrdersSparkChart data={summary.byDay} days={days} />
              </div>
            </section>
          )}

          {/* Visitor block — Shopify-style: big number, channel bar chart */}
          <section
            className="rounded-2xl p-5"
            style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: KEBU.muted }}>
                  Visitors
                </p>
                <p className="mt-0.5 text-[40px] font-black leading-none tabular-nums" style={{ color: KEBU.black }}>
                  {summary.traffic.pageviews == null ? "—" : summary.traffic.pageviews.toLocaleString()}
                </p>
                <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
                  {periodLabel}
                  {summary.traffic.orderPerView != null
                    ? ` · ${(summary.traffic.orderPerView * 100).toFixed(1)}% order rate`
                    : ""}
                </p>
              </div>
              {(summary.visitorSources?.countries ?? []).length > 0 && (
                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>Top country</p>
                  <p className="mt-0.5 text-base font-bold" style={{ color: KEBU.black }}>
                    {summary.visitorSources!.countries[0]!.country}
                  </p>
                  <p className="text-[10px]" style={{ color: KEBU.muted }}>
                    {summary.visitorSources!.countries[0]!.pct}%
                  </p>
                </div>
              )}
            </div>

            {/* Traffic sources — bar chart rows */}
            {(summary.visitorSources?.referrers ?? []).length > 0 ? (
              <div className="mt-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  Where they came from
                </p>
                <ul className="space-y-2.5">
                  {(summary.visitorSources?.referrers ?? []).slice(0, 8).map((r) => (
                    <li key={r.referrer}>
                      <div className="flex items-center justify-between mb-1 text-[12px]">
                        <span className="truncate font-medium" style={{ color: KEBU.black }}>
                          {r.referrer || "Direct / unknown"}
                        </span>
                        <span className="ml-2 shrink-0 tabular-nums" style={{ color: KEBU.muted }}>
                          {r.count} · {r.pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full" style={{ background: `${KEBU.orange}18` }}>
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${Math.max(2, r.pct)}%`, background: KEBU.orange }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (summary.visitorSources?.countries ?? []).length === 0 && summary.traffic.pageviews == null ? (
              <p className="mt-4 text-xs" style={{ color: KEBU.muted }}>
                Publish your site and start sharing — visit counts and referrers appear here automatically.
              </p>
            ) : null}

            {/* Country breakdown */}
            {(summary.visitorSources?.countries ?? []).length > 0 && (
              <div className="mt-5 border-t pt-4" style={{ borderColor: `${KEBU.border}` }}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  By country
                </p>
                <ul className="space-y-1">
                  {(summary.visitorSources?.countries ?? []).slice(0, 5).map((c) => (
                    <li key={c.country} className="flex items-center justify-between text-xs">
                      <span style={{ color: KEBU.black }}>{c.country}</span>
                      <span className="tabular-nums" style={{ color: KEBU.muted }}>{c.count} · {c.pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section
            className="rounded-2xl p-4"
            style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
          >
            <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Where orders came from
            </h3>
            {(summary.orderSources ?? []).length === 0 ? (
              <p className="mt-2 text-xs" style={{ color: KEBU.muted }}>
                No orders in this range yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {(summary.orderSources ?? []).map((s) => (
                  <li key={s.source}>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="capitalize font-medium" style={{ color: KEBU.black }}>{s.source}</span>
                      <span className="tabular-nums" style={{ color: KEBU.muted }}>{s.count} · {s.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full" style={{ background: `${KEBU.orange}18` }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.max(2, s.pct)}%`, background: KEBU.orange }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>
              Channels: web store · WhatsApp · share / QR · Wave · JOKO · social.
            </p>
          </section>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/shop/${projectId}?tab=analytics`}
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ background: KEBU.orange }}
            >
              Full analytics
            </Link>
            <Link
              href={`/shop/${projectId}?tab=orders`}
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ border: `1px solid ${KEBU.border}` }}
            >
              Orders
            </Link>
            <Link
              href={`/shop/${projectId}?tab=sell`}
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ border: `1px solid ${KEBU.border}` }}
            >
              Share / QR
            </Link>
          </div>

          {summary.insights[0] ? (
            <div
              className="rounded-2xl p-4"
              style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
                Next action
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: KEBU.black }}>
                {summary.insights[0].what}
              </p>
              <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
                {summary.insights[0].next}
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
