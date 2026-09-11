"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { carrierLabel } from "@/lib/shop/carriers";

type ShippingOrder = {
  id: string;
  order_number: string | null;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  quantity: number;
  tracking_number: string | null;
  carrier: string | null;
  tracking_url: string | null;
  fulfilled_at: string | null;
  status: string;
  amount_xof: number | null;
  created_at: string;
};

function formatXof(n: number | null): string {
  if (!n) return "—";
  return `${Math.round(n).toLocaleString()} XOF`;
}

const CARRIER_LINKS: Record<string, string> = {
  dhl: "https://www.dhl.com/global-en/home/tracking.html",
  fedex: "https://www.fedex.com/en-us/tracking.html",
  ups: "https://www.ups.com/track",
  colissimo: "https://www.laposte.fr/particuliers/outils/suivre-un-envoi",
  gls: "https://gls-group.com/track",
  mondial_relay: "https://www.mondialrelay.fr/suivi-de-colis",
  chronopost: "https://www.chronopost.fr/fr/tracking-no-cms",
};

export function ShopShippingPanel({ projectId }: { projectId: string }) {
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"in-transit" | "all">("in-transit");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/orders`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load orders.");
        return;
      }
      const all: ShippingOrder[] = (Array.isArray(data.orders) ? data.orders : []).filter(
        (o: ShippingOrder) => o.tracking_number || o.status === "fulfilled",
      );
      setOrders(all);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = filter === "in-transit"
    ? orders.filter((o) => o.tracking_number && o.status === "fulfilled")
    : orders;

  const inTransitCount = orders.filter((o) => o.tracking_number && o.status === "fulfilled").length;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            Shipping & tracking
          </p>
          <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
            All fulfilled orders with tracking numbers. Share the link with customers directly.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ background: KEBU.black }}
        >
          Refresh
        </button>
      </div>

      <div className="flex gap-2">
        {(
          [
            ["in-transit", `In transit (${inTransitCount})`],
            ["all", `All fulfilled (${orders.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: filter === id ? KEBU.black : "transparent",
              color: filter === id ? "#fff" : KEBU.muted,
              border: filter === id ? "none" : `1px solid ${KEBU.border}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>Loading shipments…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : visible.length === 0 ? (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            {filter === "in-transit" ? "No shipments in transit" : "No fulfilled orders with tracking"}
          </p>
          <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
            When you mark orders as fulfilled with a tracking number in the Orders tab, they appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((o) => {
            const carrier = o.carrier ?? "";
            const genericTrackingUrl =
              o.tracking_url ||
              (carrier && CARRIER_LINKS[carrier]
                ? `${CARRIER_LINKS[carrier]}?${o.tracking_number ? `q=${encodeURIComponent(o.tracking_number)}` : ""}`
                : null);

            return (
              <li
                key={o.id}
                className="rounded-2xl border px-4 py-3"
                style={{ borderColor: KEBU.border, background: "#fff" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {o.order_number ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
                          #{o.order_number}
                        </span>
                      ) : null}
                      {o.tracking_number ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: "#dcfce7", color: "#15803d" }}
                        >
                          In transit
                        </span>
                      ) : (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: KEBU.cream, color: KEBU.muted }}
                        >
                          No tracking
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-bold" style={{ color: KEBU.black }}>
                      {o.customer_name}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
                      {o.quantity}× {o.product_name}
                      {o.amount_xof ? ` · ${formatXof(o.amount_xof)}` : ""}
                    </p>
                    {o.tracking_number ? (
                      <p className="mt-1 text-xs font-mono" style={{ color: KEBU.black }}>
                        {carrierLabel(o.carrier)} · {o.tracking_number}
                      </p>
                    ) : null}
                    {o.fulfilled_at ? (
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider" style={{ color: KEBU.faint }}>
                        Shipped {new Date(o.fulfilled_at).toLocaleDateString()}
                      </p>
                    ) : null}
                  </div>
                  {genericTrackingUrl ? (
                    <a
                      href={genericTrackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: KEBU.cream, color: KEBU.black, border: `1px solid ${KEBU.border}` }}
                    >
                      Track ↗
                    </a>
                  ) : null}
                </div>
                {o.customer_phone ? (
                  <div className="mt-2 flex gap-2">
                    <a
                      href={`https://wa.me/${o.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Votre commande ${o.order_number ? `#${o.order_number} ` : ""}est en cours de livraison${o.tracking_number ? ` · Suivi: ${o.tracking_number}` : ""}.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold uppercase tracking-wider underline"
                      style={{ color: "#16a34a" }}
                    >
                      WhatsApp customer
                    </a>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div
        className="rounded-2xl p-4 text-xs"
        style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
      >
        <p className="font-semibold" style={{ color: KEBU.black }}>
          Tip: add tracking numbers in Orders tab
        </p>
        <p className="mt-1">
          When fulfilling an order, paste the tracking number and select the carrier. Customers can track their
          shipment from the confirmation email or from the store confirmation page.
        </p>
      </div>
    </div>
  );
}
