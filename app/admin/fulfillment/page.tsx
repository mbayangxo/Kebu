"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { JOKO_FULFILLMENT_STATUSES, type JokoFulfillmentStatus } from "@/lib/shop/joko-fulfillment";

type FulfillmentItem = {
  id: string;
  order_id: string;
  order_number: string | null;
  customer_name: string | null;
  commission_xof: number;
  status: JokoFulfillmentStatus;
  note: string | null;
  created_at: string;
};

const NEXT_STATUS: Record<JokoFulfillmentStatus, JokoFulfillmentStatus | null> = {
  awaiting_pickup: "picked_up",
  picked_up: "in_transit",
  in_transit: "delivered",
  delivered: null,
  failed_delivery: null,
  returned: null,
  cancelled: null,
};

const STATUS_LABEL: Record<JokoFulfillmentStatus, string> = {
  awaiting_pickup: "Awaiting pickup",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  failed_delivery: "Delivery failed",
  returned: "Returned",
  cancelled: "Cancelled",
};

// Satisfies the lint rule for exhaustiveness without a runtime cost — if a new
// status is ever added to the shared lib constant without updating the two
// records above, this throws at import time instead of silently rendering "undefined".
JOKO_FULFILLMENT_STATUSES.forEach((s) => {
  if (!(s in STATUS_LABEL) || !(s in NEXT_STATUS)) {
    throw new Error(`Fulfillment status "${s}" is missing from this page's STATUS_LABEL/NEXT_STATUS.`);
  }
});

function formatXof(n: number): string {
  return `${Math.round(n).toLocaleString()} XOF`;
}

export default function JokoFulfillmentQueuePage() {
  const [items, setItems] = useState<FulfillmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/fulfillment", { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(json.items)) {
        setError(json.error ?? "Could not load the fulfillment queue.");
        return;
      }
      setError(null);
      setItems(json.items);
    } catch {
      setError("Could not connect to the fulfillment queue. Please retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const scheduled = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(scheduled);
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

  async function setOutcome(item: FulfillmentItem, status: JokoFulfillmentStatus) {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/fulfillment/${item.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
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

  async function refundOrder(item: FulfillmentItem) {
    if (!window.confirm("Record a refund for this order? Only do this after you've actually issued the refund through the payment provider.")) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/shop-orders/${item.order_id}/refund`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Fulfillment outcome refund" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not record refund.");
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
        {loading ? <p role="status" className="text-sm text-muted">Loading fulfillment orders…</p> : null}
        {error ? (
          <div role="alert" className="text-red-700 text-sm">
            <p>{error}</p>
            <button type="button" disabled={loading} onClick={() => { setLoading(true); void load(); }} className="mt-2 underline disabled:opacity-50">Retry loading orders</button>
          </div>
        ) : null}

        {items.length === 0 && !error && !loading ? (
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
                <div className="flex flex-wrap gap-2 shrink-0">
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
                  {["awaiting_pickup", "picked_up", "in_transit"].includes(item.status) ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void setOutcome(item, "failed_delivery")}
                      className="rounded-full border border-amber-300 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 disabled:opacity-50"
                    >
                      Mark failed
                    </button>
                  ) : null}
                  {item.status === "delivered" ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void setOutcome(item, "returned")}
                      className="rounded-full border border-amber-300 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 disabled:opacity-50"
                    >
                      Mark returned
                    </button>
                  ) : null}
                  {item.status !== "cancelled" ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void setOutcome(item, "cancelled")}
                      className="rounded-full border border-red-300 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  ) : null}
                  {["failed_delivery", "returned", "cancelled"].includes(item.status) ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void refundOrder(item)}
                      className="rounded-full border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink disabled:opacity-50"
                    >
                      Record refund
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
