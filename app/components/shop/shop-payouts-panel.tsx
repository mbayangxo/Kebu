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
  manual: "Manual",
  other: "Other",
  paystack: "Card (Paystack)",
  paypal: "PayPal",
  joko: "JOKO (Cauris)",
  whatsapp: "WhatsApp",
  cod: "Cash on delivery",
};

type PayoutRequestItem = {
  id: string;
  amountXof: number;
  method: string;
  status: "requested" | "processing" | "paid" | "failed" | "cancelled";
  requestedAt: string;
  processedAt: string | null;
  failureReason: string | null;
};

const STATUS_STYLE: Record<PayoutRequestItem["status"], { bg: string; fg: string; label: string }> = {
  requested: { bg: "#fef9c3", fg: "#854d0e", label: "Requested" },
  processing: { bg: "#dbeafe", fg: "#1e40af", label: "Processing" },
  paid: { bg: "#dcfce7", fg: "#166534", label: "Paid" },
  failed: { bg: "#fee2e2", fg: "#991b1b", label: "Failed" },
  cancelled: { bg: "#f3f4f6", fg: "#4b5563", label: "Cancelled" },
};

export function ShopPayoutsPanel({ projectId }: { projectId: string }) {
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [requests, setRequests] = useState<PayoutRequestItem[]>([]);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"wave" | "orange_money" | "bank_transfer" | "manual">("wave");
  const [phone, setPhone] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, requestsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/payouts?days=${days}`, { credentials: "include" }),
        fetch(`/api/projects/${projectId}/payouts/request`, { credentials: "include" }),
      ]);
      const summaryData = await summaryRes.json().catch(() => ({}));
      if (!summaryRes.ok) {
        setError(typeof summaryData.error === "string" ? summaryData.error : "Could not load payouts.");
        return;
      }
      setSummary(summaryData.summary as PayoutSummary);
      const requestsData = await requestsRes.json().catch(() => ({}));
      if (requestsRes.ok && Array.isArray(requestsData.items)) {
        setRequests(requestsData.items as PayoutRequestItem[]);
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitPayoutRequest() {
    setFormError(null);
    setFormNotice(null);
    const amountXof = Math.round(Number(amount));
    if (!Number.isFinite(amountXof) || amountXof <= 0) {
      setFormError("Enter a payout amount greater than zero.");
      return;
    }
    if (!phone.trim()) {
      setFormError("Enter the phone number or account to receive this payout.");
      return;
    }
    if (!accountName.trim()) {
      setFormError("Enter the name on the receiving account.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/payouts/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountXof,
          method,
          destinationPhone: phone.trim(),
          destinationAccountName: accountName.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Could not request payout.");
        return;
      }
      setFormNotice("Payout requested. Kebu Record reviews and sends it — you'll see the status update below.");
      setAmount("");
      setShowForm(false);
      void load();
    } catch {
      setFormError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  const availableXof = summary?.balance.availableXof ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            Payouts
          </p>
          <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
            Your Kebu balance from card, Wave, Orange Money, PayPal and JOKO checkout — plus revenue you
            collect directly via WhatsApp or cash on delivery.
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
          <div
            className="rounded-2xl p-5"
            style={{ background: KEBU.black, color: "#fff" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Kebu balance — available to withdraw</p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <p className="text-3xl font-bold tabular-nums">{formatXof(availableXof)}</p>
              <button
                type="button"
                disabled={availableXof <= 0}
                onClick={() => setShowForm((s) => !s)}
                className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                style={{ background: KEBU.orange, color: "#fff" }}
              >
                Request payout
              </button>
            </div>
            <p className="mt-2 text-xs opacity-70">
              Collected: {formatXof(summary.balance.collectedXof)} · Requested or paid out:{" "}
              {formatXof(summary.balance.requestedOrPaidXof)}
            </p>
          </div>

          {showForm ? (
            <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: KEBU.border, background: "#fff" }}>
              <p className="text-sm font-semibold" style={{ color: KEBU.black }}>Request a payout</p>
              {formError ? <p className="text-xs text-red-700">{formError}</p> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  <span className="block font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                    Amount (XOF, max {formatXof(availableXof)})
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={availableXof}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg px-3 py-2"
                    style={{ border: `1px solid ${KEBU.border}` }}
                  />
                </label>
                <label className="text-xs">
                  <span className="block font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                    Method
                  </span>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as typeof method)}
                    className="mt-1 w-full rounded-lg px-3 py-2"
                    style={{ border: `1px solid ${KEBU.border}` }}
                  >
                    <option value="wave">Wave</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="manual">Other (Kebu Record will contact you)</option>
                  </select>
                </label>
                <label className="text-xs">
                  <span className="block font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                    Receiving phone / account number
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg px-3 py-2"
                    style={{ border: `1px solid ${KEBU.border}` }}
                  />
                </label>
                <label className="text-xs">
                  <span className="block font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                    Name on receiving account
                  </span>
                  <input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="mt-1 w-full rounded-lg px-3 py-2"
                    style={{ border: `1px solid ${KEBU.border}` }}
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitPayoutRequest()}
                className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                style={{ background: KEBU.black }}
              >
                {submitting ? "Requesting…" : "Submit request"}
              </button>
            </div>
          ) : null}

          {formNotice ? (
            <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
              {formNotice}
            </p>
          ) : null}

          {requests.length > 0 ? (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Payout request history
              </h3>
              <ul className="mt-2 space-y-2">
                {requests.map((r) => {
                  const st = STATUS_STYLE[r.status];
                  return (
                    <li
                      key={r.id}
                      className="flex items-center justify-between rounded-xl border px-4 py-3"
                      style={{ borderColor: KEBU.border, background: "#fff" }}
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
                          {formatXof(r.amountXof)} · {METHOD_LABELS[r.method] ?? r.method}
                        </p>
                        <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
                          Requested {new Date(r.requestedAt).toLocaleDateString()}
                          {r.failureReason ? ` — ${r.failureReason}` : ""}
                        </p>
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: st.bg, color: st.fg }}
                      >
                        {st.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Revenue collected ({days} days)
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: KEBU.black }}>
              {formatXof(summary.totalPaidXof)}
            </p>
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
              How payouts actually work
            </p>
            <p className="mt-1">
              <strong>Card, Wave, Orange Money, PayPal and JOKO checkout:</strong> the customer pays into
              Kebu's own account, not yours directly. It shows up as your <strong>Kebu balance</strong> above
              — request a payout anytime and Kebu Record sends it to your phone or bank.
            </p>
            <p className="mt-1">
              <strong>WhatsApp order / cash on delivery:</strong> the customer pays you directly — Kebu never
              touches that money, so it is not part of your Kebu balance. Mark those orders paid once you've
              received payment.
            </p>
            <p className="mt-2 text-[10px]">
              Real bank/mobile-money transfer out of Kebu is processed by Kebu Record, not instantly — we are
              working on direct automatic disbursement.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
