"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import type { PayoutSummary } from "@/app/api/projects/[id]/payouts/route";

function formatXof(n: number): string {
  if (!n) return "0 XOF";
  return `${Math.round(n).toLocaleString()} XOF`;
}

const METHOD_LABELS: Record<string, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  momo: "MTN MoMo",
  cash: "Cash",
  bank_transfer: "Bank transfer",
  other: "Other",
};

export function ShopPayoutsPanel({ projectId }: { projectId: string }) {
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/payouts?days=${days}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load payouts.");
        return;
      }
      setSummary(data.summary as PayoutSummary);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            Payouts
          </p>
          <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
            Revenue collected from paid orders. Wave, Orange Money, cash — all payment methods aggregated.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
            style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>6 months</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: KEBU.black }}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>Loading payout data…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : !summary ? null : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["Total paid in", formatXof(summary.totalPaidXof), KEBU.cream],
                ["Available to withdraw", formatXof(summary.pendingXof), "#f0fdf4"],
                ["Already paid out", formatXof(summary.paidOutXof), "#f8fafc"],
              ] as const
            ).map(([label, value, bg]) => (
              <div
                key={label}
                className="rounded-2xl px-4 py-3"
                style={{ background: bg, border: `1px solid ${KEBU.border}` }}
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

          {summary.weeks.length > 0 ? (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                By week
              </h3>
              <ul className="mt-2 space-y-2">
                {summary.weeks.map((week) => (
                  <li
                    key={week.week}
                    className="rounded-xl border px-4 py-3"
                    style={{ borderColor: KEBU.border, background: "#fff" }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
                          Week of {week.week}
                        </p>
                        <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
                          {week.orders} paid order{week.orders !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <p className="text-base font-bold tabular-nums" style={{ color: KEBU.black }}>
                        {formatXof(week.revenueXof)}
                      </p>
                    </div>
                    {week.methods.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {week.methods.map((m) => (
                          <span
                            key={m.label}
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ background: KEBU.cream, color: KEBU.muted }}
                          >
                            {METHOD_LABELS[m.label] ?? m.label} · {m.count} · {formatXof(m.amountXof)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
            >
              <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
                No paid orders in this range
              </p>
              <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
                Mark orders as paid in the Orders tab to see revenue here.
              </p>
            </div>
          )}

          <div
            className="rounded-2xl p-4 text-xs leading-relaxed"
            style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
          >
            <p className="font-semibold" style={{ color: KEBU.black }}>
              How payouts work
            </p>
            <p className="mt-1">
              <strong>Wave / Orange Money:</strong> money arrives in your mobile wallet instantly when
              customers pay. Withdraw anytime from the app. No processing delay.
            </p>
            <p className="mt-1">
              <strong>Cash:</strong> collected at delivery. Mark orders paid after you receive it.
            </p>
            <p className="mt-1">
              <strong>Bank transfer:</strong> typically 1-3 business days. Confirm with your bank.
            </p>
            <p className="mt-2 text-[10px]">
              Revenue shown = orders marked &ldquo;paid&rdquo; in the Orders tab. Disputes and refunds reduce
              actual received amount.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
