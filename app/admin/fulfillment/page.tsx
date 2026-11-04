"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type FulfillmentItem = {
  id: string;
  order_id: string;
  order_number: string | null;
  customer_name: string | null;
  commission_xof: number;
  status: "awaiting_pickup" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  note: string | null;
  created_at: string;
};

const NEXT_STATUS: Record<FulfillmentItem["status"], FulfillmentItem["status"] | null> = {
  awaiting_pickup: "picked_up",
  picked_up: "in_transit",
  in_transit: "delivered",
  delivered: null,
  cancelled: null,
};

const STATUS_LABEL: Record<FulfillmentItem["status"], string> = {
  awaiting_pickup: "Awaiting pickup",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function formatXof(n: number): string {
  return `${Math.round(n).toLocaleString()} XOF`;
}

export default function JokoFulfillmentQueuePage() {
  const [items, setItems] = useState<FulfillmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/fulfillment", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not load the fulfillment queue.");
      return;
    }
    setError(null);
    setItems(Array.isArray(json.items) ? json.items : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function advance(item: FulfillmentItem) {
    const next = NEXT_STATUS[item.status];
    if (!next) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/fulfillment/${item.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not update status.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(item: FulfillmentItem) {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/fulfillment/${item.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not cancel.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-warm-ivory">
      <div className="bg-deep-green text-ivory py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-2">Internal · Team only</p>
          <h1 className="font-display text-3xl font-bold">Joko Fulfillment queue</h1>
          <p className="text-ivory/70 text-sm mt-2 max-w-2xl">
            Orders where a seller asked Kebu to pick up and deliver instead of self-fulfilling. This page is the
            real workflow tool for the physical steps — update a row only after a team member has actually done
            that step. Nothing here is automated or simulated.
          </p>
          <Link href="/admin/record" className="underline text-ivory/80 text-sm mt-4 inline-block">
            ← Kebu Record
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-4">
        {error ? <p className="text-red-700 text-sm">{error}</p> : null}

        {items.length === 0 && !error ? (
          <p className="text-sm text-muted">No orders currently awaiting Joko Fulfillment pickup or delivery.</p>
        ) : null}

        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">
                    {item.order_number ? `#${item.order_number}` : item.order_id.slice(0, 8)}
                    {item.customer_name ? ` · ${item.customer_name}` : ""}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    Kebu commission: {formatXof(item.commission_xof)} · created {new Date(item.created_at).toLocaleString()}
                  </p>
                  <span className="inline-block mt-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  {NEXT_STATUS[item.status] ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void advance(item)}
                      className="rounded-full bg-deep-green px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                    >
                      Mark {STATUS_LABEL[NEXT_STATUS[item.status]!]}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void cancel(item)}
                    className="rounded-full border border-red-300 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
