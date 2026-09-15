"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { mySiteDetailHref } from "@/lib/navigation/product-nav";
import {
  formatXof,
  type CommerceAnalyticsSummary,
  type CommerceInsight,
} from "@/lib/shop/commerce-insights";

const PERIOD_OPTIONS: { label: string; days: number }[] = [
  { label: "Today", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "Year", days: 365 },
];

function severityColor(s: CommerceInsight["severity"]): string {
  if (s === "act") return KEBU.orange;
  if (s === "watch") return "#B45309";
  return KEBU.muted;
}

function downloadEarningsCsv(summary: CommerceAnalyticsSummary, title: string | null, days: number) {
  const rows = [
    ["Date", "Orders", "Paid orders"],
    ...summary.byDay.map((d) => [d.day, String(d.orders), String(d.paid)]),
    [],
    ["Summary"],
    ["Total orders", String(summary.orders.total)],
    ["Paid orders", String(summary.orders.paid)],
    ["Paid revenue (XOF)", String(summary.orders.revenuePaidXof)],
    ["Revenue at risk (XOF)", String(summary.orders.revenueAtRiskXof)],
    ["Period (days)", String(days)],
    ["Generated", summary.generatedAt],
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title ?? "shop").replace(/\s+/g, "-").toLowerCase()}-earnings-${days}d.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Owner shop analytics portal — real orders/carts/visits → patterns → next actions.
 */
export function ShopAnalyticsPanel({
  projectId,
  embedded = false,
}: {
  projectId: string;
  embedded?: boolean;
}) {
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
        setError(typeof data.error === "string" ? data.error : "Could not load analytics.");
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

  const maxDay = Math.max(1, ...(summary?.byDay.map((d) => d.orders) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {!embedded ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
              Shop intelligence
            </p>
          ) : null}
          <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
            {title ? `${title} · Analytics` : "Analytics"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
            Real orders, carts, and visits — what happened and what to do next.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period pill selector */}
          <div
            className="flex rounded-full p-0.5"
            style={{ background: "#F4F4F4", border: `1px solid ${KEBU.border}` }}
            role="group"
            aria-label="Time period"
          >
            {PERIOD_OPTIONS.map((opt) => (
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
          {summary ? (
            <button
              type="button"
              onClick={() => downloadEarningsCsv(summary, title, days)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black, background: "#fff" }}
              title="Download earnings CSV"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M12 3v12M8 11l4 4 4-4M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" />
              </svg>
              Download
            </button>
          ) : null}
          <Link
            href={mySiteDetailHref(projectId)}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
          >
            Site visits
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Learning from your shop data…
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
                ["At risk", formatXof(summary.orders.revenueAtRiskXof)],
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

          <div className="grid gap-4 lg:grid-cols-2">
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Insights
              </h3>
              <ul className="mt-2 space-y-3">
                {summary.insights.map((ins) => (
                  <li
                    key={ins.id}
                    className="rounded-2xl p-3"
                    style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: severityColor(ins.severity) }}
                    >
                      {ins.severity} · {ins.confidence} confidence
                    </p>
                    <p className="mt-1 text-sm font-semibold" style={{ color: KEBU.black }}>
                      {ins.what}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: KEBU.muted }}>
                      {ins.why}
                    </p>
                    <p className="mt-2 text-xs font-medium" style={{ color: KEBU.black }}>
                      Next: {ins.next}
                    </p>
                    {ins.href ? (
                      <Link
                        href={ins.href}
                        className="mt-2 inline-block text-[11px] font-bold uppercase tracking-wider underline"
                        style={{ color: KEBU.orange }}
                      >
                        Open
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  Orders by day
                </h3>
                {summary.byDay.length === 0 ? (
                  <p className="mt-2 text-xs" style={{ color: KEBU.muted }}>
                    No daily order activity in this range.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {summary.byDay.map((d) => (
                      <li key={d.day} className="flex items-center gap-2 text-xs">
                        <span className="w-24 shrink-0 font-mono opacity-70">{d.day}</span>
                        <span
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.max(8, Math.round((d.orders / maxDay) * 100))}%`,
                            background: KEBU.orange,
                            maxWidth: "70%",
                          }}
                          title={`${d.orders} orders, ${d.paid} paid`}
                        />
                        <span className="tabular-nums opacity-80">
                          {d.orders}
                          {d.paid ? ` · ${d.paid} paid` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  Where orders came from
                </h3>
                {(summary.orderSources ?? []).length === 0 ? (
                  <p className="mt-2 text-xs" style={{ color: KEBU.muted }}>
                    No order channels yet.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-xs">
                    {(summary.orderSources ?? []).map((s) => (
                      <li key={s.source} className="flex justify-between gap-2">
                        <span className="capitalize">{s.source}</span>
                        <span className="tabular-nums opacity-80">
                          {s.count} · {s.pct}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  Where visitors are from
                </h3>
                {(summary.visitorSources?.countries ?? []).length === 0 ? (
                  <p className="mt-2 text-xs" style={{ color: KEBU.muted }}>
                    No geography yet — publish and get visits.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-xs">
                    {(summary.visitorSources?.countries ?? []).slice(0, 6).map((c) => (
                      <li key={c.country} className="flex justify-between gap-2">
                        <span>{c.country}</span>
                        <span className="tabular-nums opacity-80">
                          {c.count} · {c.pct}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {(summary.visitorSources?.referrers ?? []).length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs opacity-90">
                    {(summary.visitorSources?.referrers ?? []).slice(0, 4).map((r) => (
                      <li key={r.referrer} className="flex justify-between gap-2">
                        <span className="truncate">{r.referrer}</span>
                        <span className="shrink-0 tabular-nums">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  How people chose to pay
                </h3>
                {summary.paymentMix.length === 0 ? (
                  <p className="mt-2 text-xs" style={{ color: KEBU.muted }}>
                    No payment preferences yet.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-xs">
                    {summary.paymentMix.map((p) => (
                      <li key={p.preference} className="flex justify-between gap-2">
                        <span>{p.preference}</span>
                        <span className="tabular-nums opacity-80">
                          {p.count} · {p.pct}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  Top products
                </h3>
                {summary.topProducts.length === 0 ? (
                  <p className="mt-2 text-xs" style={{ color: KEBU.muted }}>
                    No product sales in this range.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-xs">
                    {summary.topProducts.map((p) => (
                      <li key={p.name} className="flex justify-between gap-2">
                        <span className="truncate">{p.name}</span>
                        <span className="shrink-0 tabular-nums opacity-80">
                          {p.units} units · {p.orders} orders
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div
                className="rounded-2xl p-3 text-xs leading-relaxed"
                style={{ background: KEBU.cream, color: KEBU.muted }}
              >
                <p>
                  Carts: {summary.carts.openAbandoned} open abandoned · {summary.carts.convertedInRange}{" "}
                  converted · {summary.carts.recoveredInRange} recovered
                </p>
                <p className="mt-1">
                  Customers identified: {summary.customers.uniqueKeys}
                  {summary.customers.repeatKeys
                    ? ` · ${summary.customers.repeatKeys} repeat`
                    : ""}
                </p>
                <p className="mt-1">
                  Site pageviews:{" "}
                  {summary.traffic.pageviews == null
                    ? "not available (apply site analytics migration / publish)"
                    : summary.traffic.pageviews}
                  {summary.traffic.orderPerView != null
                    ? ` · ~${Math.round(summary.traffic.orderPerView * 10000) / 100}% order/view`
                    : ""}
                </p>
                {summary.traffic.funnel ? (
                  <p className="mt-1">
                    Funnel: {summary.traffic.funnel.productViews} product views →{" "}
                    {summary.traffic.funnel.addToCart} add to cart →{" "}
                    {summary.traffic.funnel.checkoutStart} checkout →{" "}
                    {summary.traffic.funnel.purchases} purchase
                  </p>
                ) : null}
                <p className="mt-2 text-[10px]">
                  Generated {new Date(summary.generatedAt).toLocaleString()} · data from Supabase
                </p>
              </div>
            </section>
          </div>
        </>
      ) : null}

      <section
        className="rounded-2xl p-4 sm:p-5"
        style={{ border: `1px solid ${KEBU.border}`, background: KEBU.cream }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
          Kebu Business Copilot
        </p>
        <h3 className="mt-1 text-base font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
          Ask · prioritize · act (when assigned)
        </h3>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          Copilot will read authorized shop + site data — not generic chat. Example:{" "}
          &ldquo;How is my business doing?&rdquo; &rarr; revenue, margin, traffic by country &rarr; prioritized
          actions &rarr; you confirm before Kebu executes campaigns, discounts, or localized pages.
        </p>
        <p className="mt-3 text-[11px]" style={{ color: KEBU.muted }}>
          Today: use Insights above and open linked tabs. Copilot execution coming soon.
        </p>
      </section>
    </div>
  );
}
