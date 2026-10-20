"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PayoutRow = {
  id: string;
  developerName: string;
  amountCents: number;
  currency: string;
  method: "wave" | "orange_money";
  destinationPhone: string;
  destinationAccountName: string;
  status: string;
  requestedAt: string;
};

function formatAmount(cents: number, currency: string): string {
  return `${Math.round(cents).toLocaleString()} ${currency}`;
}

export default function AdminDeveloperPayoutsPage() {
  const [items, setItems] = useState<PayoutRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/developer-payouts", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load payouts.");
      return;
    }
    setError(null);
    setItems(Array.isArray(data.items) ? data.items : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function process(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/developer-payouts/${id}/process`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not process this payout automatically.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not process this payout automatically.");
    } finally {
      setBusyId(null);
    }
  }

  async function markPaid(id: string) {
    if (!confirm("Confirm you actually sent this money outside the app before marking it paid.")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/developer-payouts/${id}/mark-paid`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not mark this payout paid.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not mark this payout paid.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-[920px] px-4 py-8 sm:px-7">
      <div className="mb-6">
        <Link href="/admin/record" className="text-[11px] font-semibold text-black/45">← Kebu Record</Link>
        <h1 className="mt-2 text-3xl font-black tracking-[-.03em]">Developer payouts</h1>
        <p className="mt-1 text-sm text-black/55">Pending and processing requests across every Kebu developer marketplace.</p>
      </div>

      {error ? <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">{error}</div> : null}

      {items === null ? (
        <p className="text-sm text-black/55">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-black/55">Nothing pending.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id} className="rounded-2xl border border-black/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{p.developerName} — {formatAmount(p.amountCents, p.currency)}</p>
                  <p className="mt-0.5 text-[11px] text-black/50">
                    {p.method === "wave" ? "Wave" : "Orange Money"} · {p.destinationPhone} · {p.destinationAccountName} · requested {new Date(p.requestedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busyId === p.id} onClick={() => void process(p.id)} className="rounded-full border border-black/15 px-3 py-1.5 text-[10px] font-black uppercase disabled:opacity-40">
                    Attempt automatic
                  </button>
                  <button type="button" disabled={busyId === p.id} onClick={() => void markPaid(p.id)} className="rounded-full bg-black px-3 py-1.5 text-[10px] font-black uppercase text-white disabled:opacity-40">
                    Mark sent manually
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
