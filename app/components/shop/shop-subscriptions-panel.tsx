"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { labelSubscriptionInterval } from "@/lib/shop/subscriptions";

type Sub = {
  id: string;
  productId: string;
  customerName: string;
  customerPhone: string;
  interval: string;
  priceXof: number;
  status: string;
  nextBillingAt: string | null;
};

export function ShopSubscriptionsPanel({ projectId }: { projectId: string }) {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/subscriptions`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setSubs(Array.isArray(data.subscriptions) ? data.subscriptions : []);
    else setError(typeof data.error === "string" ? data.error : "Could not load subscriptions.");
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(subscriptionId: string, status: "active" | "paused" | "cancelled") {
    setBusyId(subscriptionId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/subscriptions`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not update subscription.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
        Subscriptions
      </h2>
      <p className="text-sm" style={{ color: KEBU.muted }}>
        Recurring products from your catalog. When a period is due, Kebu creates a pending order — you collect
        payment on WhatsApp, Wave, or JOKO (no silent card auto-charge).
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {subs.length === 0 && !error ? (
        <p className="text-sm opacity-70">
          No subscribers yet. Mark a product as Subscription in Shop → Products, publish, then customers can
          subscribe on your live site.
        </p>
      ) : null}
      <ul className="space-y-2">
        {subs.map((s) => (
          <li key={s.id} className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: KEBU.border }}>
            <p className="font-semibold">
              {s.customerName} · {labelSubscriptionInterval(s.interval)} ·{" "}
              {s.priceXof.toLocaleString()} XOF
            </p>
            <p className="text-xs opacity-70">
              {s.customerPhone} · {s.status}
              {s.nextBillingAt
                ? ` · next ${new Date(s.nextBillingAt).toLocaleDateString()}`
                : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {s.status === "active" ? (
                <>
                  <button
                    type="button"
                    className="text-[10px] font-bold disabled:opacity-40"
                    disabled={busyId === s.id}
                    onClick={() => void setStatus(s.id, "paused")}
                  >
                    Pause
                  </button>
                  <button
                    type="button"
                    className="text-[10px] font-bold text-red-600 disabled:opacity-40"
                    disabled={busyId === s.id}
                    onClick={() => void setStatus(s.id, "cancelled")}
                  >
                    Cancel
                  </button>
                </>
              ) : null}
              {s.status === "paused" ? (
                <>
                  <button
                    type="button"
                    className="text-[10px] font-bold disabled:opacity-40"
                    disabled={busyId === s.id}
                    onClick={() => void setStatus(s.id, "active")}
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    className="text-[10px] font-bold text-red-600 disabled:opacity-40"
                    disabled={busyId === s.id}
                    onClick={() => void setStatus(s.id, "cancelled")}
                  >
                    Cancel
                  </button>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
