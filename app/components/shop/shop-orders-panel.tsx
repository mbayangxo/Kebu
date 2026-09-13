"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { paymentPreferenceLabel } from "@/lib/create/site-commerce";
import { KEBU } from "@/lib/kebu-brand";
import { SHOP_CARRIERS, type ShopCarrierId } from "@/lib/shop/carriers";

type ShopOrder = {
  id: string;
  order_number?: string | null;
  product_name: string;
  product_upc?: string | null;
  product_sku?: string | null;
  price_label: string;
  quantity: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_note: string;
  is_gift?: boolean;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  recipient_email?: string | null;
  gift_message?: string | null;
  gift_public_id?: string | null;
  payment_preference?: string | null;
  payment_status?: string | null;
  amount_xof?: number | null;
  status: string;
  tracking_number?: string | null;
  carrier?: string | null;
  tracking_url?: string | null;
  fulfilled_at?: string | null;
  archived_at?: string | null;
  customer_notified_at?: string | null;
  created_at: string;
  items?: {
    product_name: string;
    product_upc?: string | null;
    product_sku?: string | null;
    price_label: string;
    quantity: number;
  }[];
};

type CarrierOpt = { id: string; label: string };
type FilterTab = "open" | "fulfill" | "done" | "all";

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pending:   { bg: "#FEF3C7", color: "#92400E" },
    contacted: { bg: "#DBEAFE", color: "#1E40AF" },
    fulfilled: { bg: "#D1FAE5", color: "#065F46" },
    cancelled: { bg: "#FEE2E2", color: "#991B1B" },
    archived:  { bg: "#F3F4F6", color: "#6B7280" },
    refunded:  { bg: "#EDE9FE", color: "#5B21B6" },
  };
  const s = map[status] ?? { bg: "#F4F4F4", color: "#555" };
  return (
    <span
      className="ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

function PayChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    paid:     { bg: "#D1FAE5", color: "#065F46" },
    unpaid:   { bg: "#FEF3C7", color: "#92400E" },
    refunded: { bg: "#EDE9FE", color: "#5B21B6" },
    partial:  { bg: "#DBEAFE", color: "#1E40AF" },
  };
  const s = map[status] ?? { bg: "#F4F4F4", color: "#555" };
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

export function ShopOrdersPanel({
  projectId,
  embedded = false,
}: {
  projectId: string;
  embedded?: boolean;
}) {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [carriers, setCarriers] = useState<CarrierOpt[]>([...SHOP_CARRIERS]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("open");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState<1 | 2 | null>(null);
  const [demoHint, setDemoHint] = useState<string | null>(null);
  const [draft, setDraft] = useState<
    Record<
      string,
      { tracking: string; carrier: ShopCarrierId | ""; notify: "sms" | "whatsapp" | "sms_whatsapp" | "email" | "all" | "none" }
    >
  >({});

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
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      if (Array.isArray(data.carriers) && data.carriers.length) {
        setCarriers(data.carriers);
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filter === "all") return true;
      if (filter === "open") return o.status === "pending" || o.status === "contacted";
      if (filter === "fulfill") {
        return (
          (o.status === "pending" || o.status === "contacted") &&
          o.status !== "archived" &&
          o.status !== "cancelled"
        );
      }
      if (filter === "done") {
        return o.status === "fulfilled" || o.status === "archived" || o.status === "cancelled";
      }
      return true;
    });
  }, [orders, filter]);

  function draftFor(order: ShopOrder) {
    return (
      draft[order.id] ?? {
        tracking: order.tracking_number ?? "",
        carrier: (order.carrier as ShopCarrierId) || "dhl",
        notify: "whatsapp" as const,
      }
    );
  }

  async function runDemo(which: 1 | 2) {
    setDemoBusy(which);
    setDemoHint(null);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/orders/demo`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ which }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Demo order failed.");
        return;
      }
      setDemoHint(typeof data.hint === "string" ? data.hint : `Demo ${which} ready.`);
      setFilter("open");
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setDemoBusy(null);
    }
  }

  async function patchOrder(
    orderId: string,
    body: Record<string, unknown>,
  ): Promise<{ whatsappHref?: string | null; emailed?: boolean } | null> {
    setBusyId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/orders`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not update order.");
        return null;
      }
      await load();
      return {
        whatsappHref: typeof data.whatsappHref === "string" ? data.whatsappHref : null,
        emailed: data.emailed === true,
      };
    } catch {
      setError("Network error.");
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function fulfill(order: ShopOrder) {
    const d = draftFor(order);
    const result = await patchOrder(order.id, {
      action: "fulfill",
      trackingNumber: d.tracking.trim() || null,
      carrier: d.carrier || "pickup",
      notifyVia: d.notify,
    });
    if (result?.whatsappHref) {
      window.open(result.whatsappHref, "_blank", "noopener,noreferrer");
    }
  }

  async function emailOnly(order: ShopOrder) {
    const d = draftFor(order);
    await patchOrder(order.id, {
      action: "status",
      status: order.status === "pending" ? "contacted" : order.status,
      emailCustomer: true,
      notifyVia: "email",
      trackingNumber: d.tracking.trim() || order.tracking_number || null,
      carrier: d.carrier || order.carrier || null,
    });
  }

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "open", label: "Open" },
    { id: "fulfill", label: "To fulfill" },
    { id: "done", label: "Done" },
    { id: "all", label: "All" },
  ];

  return (
    <section className={embedded ? "" : "mt-10"}>
      {!embedded ? (
        <>
          <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
            Orders
          </h2>
          <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
            Open orders → fulfill with tracking + carrier. Default: WhatsApp the buyer (SMS optional — delivery
            can be unreliable in some networks).
          </p>
        </>
      ) : (
        <p className="mb-4 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          Open vs to-fulfill: add tracking + carrier, then notify by SMS (default), WhatsApp, or email.
          Money status stays separate (paid via webhook).
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: filter === t.id ? KEBU.orange : KEBU.cream,
              color: filter === t.id ? "#fff" : KEBU.black,
              border: `1px solid ${KEBU.border}`,
            }}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          disabled={demoBusy !== null}
          onClick={() => void runDemo(1)}
          className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
          style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
        >
          {demoBusy === 1 ? "…" : "Demo order 1"}
        </button>
        <button
          type="button"
          disabled={demoBusy !== null}
          onClick={() => void runDemo(2)}
          className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
          style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
        >
          {demoBusy === 2 ? "…" : "Demo order 2"}
        </button>
      </div>
      {demoHint ? (
        <p className="mb-3 text-xs" style={{ color: KEBU.muted }}>
          {demoHint}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-3 text-sm" style={{ color: KEBU.muted }}>
          Loading orders…
        </p>
      ) : error ? (
        <p className="mt-3 text-sm text-red-700">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="mt-3 text-sm" style={{ color: KEBU.muted }}>
          No orders in this view.
        </p>
      ) : (
        <ul className="mt-2 space-y-3">
          {filtered.map((order) => {
            const d = draftFor(order);
            const open =
              order.status === "pending" || order.status === "contacted";
            return (
              <li
                key={order.id}
                className="rounded-xl px-3 py-3 text-sm"
                style={{ border: `1px solid ${KEBU.border}`, background: KEBU.cream }}
              >
                <p className="font-semibold">
                  {order.order_number ? (
                    <span className="font-mono text-[11px] tracking-wide opacity-80">
                      {order.order_number} ·{" "}
                    </span>
                  ) : null}
                  {order.quantity}× {order.product_name}{" "}
                  {order.price_label ? <span className="opacity-70">· {order.price_label}</span> : null}
                  <StatusChip status={order.status} />
                </p>
                {order.items && order.items.length > 1 ? (
                  <ul className="mt-1 space-y-0.5 text-[11px] opacity-80">
                    {order.items.map((it, i) => (
                      <li key={`${order.id}-line-${i}`}>
                        {it.quantity}× {it.product_name}
                        {it.price_label ? ` · ${it.price_label}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-1 text-xs">
                  {order.customer_name} · {order.customer_phone}
                  {order.customer_email ? ` · ${order.customer_email}` : ""}
                  {order.payment_preference ? (
                    <span className="opacity-70">
                      {" "}
                      · Pay: {paymentPreferenceLabel(order.payment_preference)}
                    </span>
                  ) : null}
                  {order.payment_status ? (
                    <> · <PayChip status={order.payment_status} /></>
                  ) : null}
                </p>
                {order.is_gift ? (
                  <p className="mt-1 text-xs font-medium" style={{ color: KEBU.orange }}>
                    Gift for {order.recipient_name}
                    {order.recipient_phone ? ` · ${order.recipient_phone}` : ""}
                    {order.recipient_email ? ` · ${order.recipient_email}` : ""}
                    {order.gift_public_id ? (
                      <>
                        {" · "}
                        <a
                          href={`/g/${order.gift_public_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          Gift link
                        </a>
                      </>
                    ) : null}
                  </p>
                ) : null}
                {order.is_gift && order.gift_message ? (
                  <p className="mt-1 text-xs opacity-80">Gift note: {order.gift_message}</p>
                ) : null}
                {order.customer_note ? (
                  <p className="mt-1 text-xs opacity-80">{order.customer_note}</p>
                ) : null}
                {order.tracking_number || order.tracking_url ? (
                  <p className="mt-1 text-[11px]">
                    Track: {order.carrier ? `${order.carrier} · ` : ""}
                    {order.tracking_number}
                    {order.tracking_url ? (
                      <>
                        {" "}
                        ·{" "}
                        <a
                          href={order.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                          style={{ color: KEBU.orange }}
                        >
                          Open link
                        </a>
                      </>
                    ) : null}
                    {order.customer_notified_at ? (
                      <span className="opacity-60"> · customer notified</span>
                    ) : null}
                  </p>
                ) : null}
                <p className="mt-1 text-[10px] uppercase tracking-wider opacity-50">
                  {new Date(order.created_at).toLocaleString()}
                </p>

                {open ? (
                  <div
                    className="mt-3 space-y-2 rounded-lg p-2"
                    style={{ background: "#fff", border: `1px solid ${KEBU.border}` }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                      Fulfill
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider">
                        Carrier
                        <select
                          className="ml-1 rounded-md border px-1 py-1 text-xs normal-case tracking-normal"
                          value={d.carrier}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [order.id]: {
                                ...d,
                                carrier: e.target.value as ShopCarrierId,
                              },
                            }))
                          }
                        >
                          {carriers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex-1 text-[10px] font-bold uppercase tracking-wider min-w-[140px]">
                        Tracking #
                        <input
                          className="mt-0.5 w-full rounded-md border px-2 py-1 text-xs normal-case tracking-normal font-mono"
                          value={d.tracking}
                          placeholder="Paste tracking number"
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [order.id]: { ...d, tracking: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className="text-[10px] font-bold uppercase tracking-wider">
                        Notify
                        <select
                          className="ml-1 rounded-md border px-1 py-1 text-xs normal-case tracking-normal"
                          value={d.notify}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [order.id]: {
                                ...d,
                                notify: e.target.value as typeof d.notify,
                              },
                            }))
                          }
                        >
                          <option value="whatsapp">WhatsApp only</option>
                          <option value="sms_whatsapp">SMS + WhatsApp</option>
                          <option value="sms">SMS (text)</option>
                          <option value="email">Email</option>
                          <option value="all">SMS + WhatsApp + email</option>
                          <option value="none">Don&apos;t notify</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => void fulfill(order)}
                        className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                        style={{ background: KEBU.orange }}
                      >
                        Fulfill + send track link
                      </button>
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() =>
                          void patchOrder(order.id, { action: "status", status: "fulfilled", notifyVia: "none" })
                        }
                        className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                        style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
                      >
                        Mark fulfilled
                      </button>
                      <button
                        type="button"
                        disabled={busyId === order.id || order.payment_status === "refunded"}
                        onClick={() => {
                          if (!window.confirm("Mark this order as refunded?")) return;
                          void patchOrder(order.id, { action: "refund" });
                        }}
                        className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600 disabled:opacity-40"
                        style={{ border: "1px solid #FECACA", background: "#fff" }}
                      >
                        Refund
                      </button>
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => void patchOrder(order.id, { action: "archive" })}
                        className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                        style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        disabled={busyId === order.id || !order.customer_email}
                        title={
                          order.customer_email
                            ? "Email the customer about this order"
                            : "No email on this order"
                        }
                        onClick={() => void emailOnly(order)}
                        className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40"
                        style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
                      >
                        Email client
                      </button>
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() =>
                          void patchOrder(order.id, { action: "status", status: "contacted" })
                        }
                        className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                        style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
                      >
                        Mark contacted
                      </button>
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() =>
                          void patchOrder(order.id, { action: "status", status: "cancelled" })
                        }
                        className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-700 disabled:opacity-50"
                        style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
