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

function severityColor(s: CommerceInsight["severity"]): string {
  if (s === "act") return KEBU.orange;
  if (s === "watch") return "#B45309";
  return KEBU.muted;
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
            Patterns from your real orders, carts, and site visits — what happened, why it matters, what to do
            next. No fake demo numbers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
            style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: KEBU.black }}
          >
            Refresh
          </button>
          <Link
            href={mySiteDetailHref(projectId)}
            className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
            style={{ border: `1px solid ${KEBU.border}` }}
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
          Copilot will read authorized shop + site data — not generic chat. Example: “How is my business doing?” →
          revenue, margin, traffic by country → prioritized actions → you confirm before Kebu executes campaigns,
          discounts, or localized pages.
        </p>
        <ul className="mt-3 space-y-2 text-xs" style={{ color: KEBU.black }}>
          <li>
            <strong>ACT</strong> Create Côte d&apos;Ivoire campaign —{" "}
            <span style={{ color: KEBU.muted }}>not implemented</span>
          </li>
          <li>
            <strong>ACT</strong> Translate store · localized landing page · shipping option —{" "}
            <span style={{ color: KEBU.muted }}>not implemented</span>
          </li>
          <li>
            <strong>ACT</strong> Launch Kebu Reach campaign —{" "}
            <span style={{ color: KEBU.muted }}>not implemented</span>
          </li>
        </ul>
        <p className="mt-3 text-[11px]" style={{ color: KEBU.muted }}>
          Today: use Insights above and open linked tabs. Copilot execution requires a dedicated slice with confirmation
          for money and destructive ops.
        </p>
      </section>
    </div>
  );
}
