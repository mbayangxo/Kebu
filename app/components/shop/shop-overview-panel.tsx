"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import {
  formatXof,
  type CommerceAnalyticsSummary,
} from "@/lib/shop/commerce-insights";
import { ShopSellerTrustBanner } from "@/app/components/shop/shop-seller-trust-banner";

/**
 * Owner dashboard home for one store — how you’re doing, order sources, visitors.
 */
export function ShopOverviewPanel({ projectId }: { projectId: string }) {
  const [summary, setSummary] = useState<CommerceAnalyticsSummary | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/shop-analytics?days=30`, {
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
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
          Owner dashboard
        </p>
        <h2 className="mt-1 text-lg font-bold" style={{ color: KEBU.black }}>
          {title ? `How ${title} is doing` : "How this shop is doing"}
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          Last 30 days from real orders and site visits — not demo numbers. Switch stores anytime from the
          header.
        </p>
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

          <div className="grid gap-4 lg:grid-cols-2">
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
                <ul className="mt-2 space-y-1.5 text-xs">
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
              <p className="mt-3 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>
                Channels: web store · WhatsApp · share / QR · Wave · JOKO · social.
              </p>
            </section>

            <section
              className="rounded-2xl p-4"
              style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
            >
              <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Where visitors are from
              </h3>
              {(summary.visitorSources?.countries ?? []).length === 0 ? (
                <p className="mt-2 text-xs" style={{ color: KEBU.muted }}>
                  Publish the site and get visits — country comes from edge headers when available; referrer from
                  the browser.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-xs">
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
                <>
                  <h4
                    className="mt-4 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: KEBU.muted }}
                  >
                    Referrers
                  </h4>
                  <ul className="mt-1 space-y-1 text-xs">
                    {(summary.visitorSources?.referrers ?? []).slice(0, 5).map((r) => (
                      <li key={r.referrer} className="flex justify-between gap-2">
                        <span className="truncate">{r.referrer}</span>
                        <span className="shrink-0 tabular-nums opacity-80">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          </div>

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
