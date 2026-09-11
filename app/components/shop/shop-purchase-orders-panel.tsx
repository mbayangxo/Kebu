"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type POItem = {
  product_name: string;
  sku: string;
  quantity: number;
  unit_cost_xof?: number;
};

type PurchaseOrder = {
  id: string;
  po_number: string | null;
  supplier_name: string;
  supplier_contact: string;
  items: POItem[];
  total_amount_xof: number;
  status: "pending" | "received" | "cancelled";
  expected_at: string | null;
  received_at: string | null;
  note: string;
  created_at: string;
};

function formatXof(n: number): string {
  if (!n) return "—";
  return `${Math.round(n).toLocaleString()} XOF`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: "#fef9c3", color: "#92400e" },
  received: { bg: "#dcfce7", color: "#15803d" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
};

const EMPTY_ITEM: POItem = { product_name: "", sku: "", quantity: 1, unit_cost_xof: undefined };

export function ShopPurchaseOrdersPanel({ projectId }: { projectId: string }) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableReady, setTableReady] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Form state
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<POItem[]>([{ ...EMPTY_ITEM }]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/purchase-orders`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load purchase orders.");
        return;
      }
      setOrders(Array.isArray(data.purchaseOrders) ? data.purchaseOrders : []);
      setTableReady(data.tableReady !== false);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierName.trim() || items.some((i) => !i.product_name.trim())) return;
    setSaving(true);
    setSaveError(null);
    try {
      const totalXof = items.reduce((s, i) => s + (i.unit_cost_xof ?? 0) * i.quantity, 0);
      const res = await fetch(`/api/projects/${projectId}/purchase-orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_name: supplierName.trim(),
          supplier_contact: supplierContact.trim(),
          items,
          total_amount_xof: totalXof || undefined,
          expected_at: expectedAt || undefined,
          note,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof data.error === "string" ? data.error : "Could not create purchase order.");
        return;
      }
      setSupplierName("");
      setSupplierContact("");
      setExpectedAt("");
      setNote("");
      setItems([{ ...EMPTY_ITEM }]);
      setShowForm(false);
      void load();
    } catch {
      setSaveError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(poId: string, action: "receive" | "cancel") {
    setBusyId(poId);
    try {
      await fetch(`/api/projects/${projectId}/purchase-orders`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId, action }),
      });
      void load();
    } finally {
      setBusyId(null);
    }
  }

  function updateItem(idx: number, field: keyof POItem, value: string | number) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            Purchase orders
          </p>
          <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
            Track restocking orders to your suppliers. Know what&rsquo;s incoming and when.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ background: KEBU.orange }}
        >
          {showForm ? "Cancel" : "+ New PO"}
        </button>
      </div>

      {!tableReady ? (
        <div
          className="rounded-2xl p-4 text-sm"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="font-semibold" style={{ color: KEBU.black }}>
            Purchase orders table not set up yet
          </p>
          <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
            Ask Kebu support to run migration 061 (shop_purchase_orders table).
          </p>
        </div>
      ) : null}

      {showForm && tableReady ? (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="space-y-4 rounded-2xl p-4"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
            New purchase order
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Supplier name *
              </label>
              <input
                required
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Grossiste Marché Treichville"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Supplier contact
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                value={supplierContact}
                onChange={(e) => setSupplierContact(e.target.value)}
                placeholder="+225 07 00 00 00 00"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Expected delivery
              </label>
              <input
                type="date"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                value={expectedAt}
                min={today()}
                onChange={(e) => setExpectedAt(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Note
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Payment terms, delivery address…"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Items *
            </p>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    {idx === 0 ? (
                      <label className="mb-1 block text-[10px] uppercase tracking-wider opacity-60">Product</label>
                    ) : null}
                    <input
                      required
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      style={{ borderColor: KEBU.border }}
                      value={item.product_name}
                      onChange={(e) => updateItem(idx, "product_name", e.target.value)}
                      placeholder="Robe en wax…"
                    />
                  </div>
                  <div className="w-16">
                    {idx === 0 ? <label className="mb-1 block text-[10px] uppercase tracking-wider opacity-60">Qty</label> : null}
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      style={{ borderColor: KEBU.border }}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                  <div className="w-28">
                    {idx === 0 ? <label className="mb-1 block text-[10px] uppercase tracking-wider opacity-60">Unit cost (XOF)</label> : null}
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      style={{ borderColor: KEBU.border }}
                      value={item.unit_cost_xof ?? ""}
                      onChange={(e) => updateItem(idx, "unit_cost_xof", e.target.value ? Number(e.target.value) : 0)}
                      placeholder="0"
                    />
                  </div>
                  {items.length > 1 ? (
                    <button
                      type="button"
                      className="text-xs opacity-40 hover:opacity-100 pb-2"
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-2 text-[11px] font-bold underline"
              style={{ color: KEBU.orange }}
              onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
            >
              + Add item
            </button>
          </div>

          {saveError ? <p className="text-xs text-red-700">{saveError}</p> : null}
          <button
            type="submit"
            disabled={saving || !supplierName.trim()}
            className="rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
            style={{ background: KEBU.black }}
          >
            {saving ? "Creating…" : "Create purchase order"}
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>Loading purchase orders…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : orders.length === 0 ? (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            No purchase orders yet
          </p>
          <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
            Create a PO when you order stock from a supplier. Track delivery status and expected dates.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((po) => {
            const colors = STATUS_COLORS[po.status] ?? STATUS_COLORS.pending;
            return (
              <li
                key={po.id}
                className="rounded-2xl border"
                style={{ borderColor: KEBU.border, background: "#fff" }}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === po.id ? null : po.id)}
                  className="w-full px-4 py-3 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {po.po_number ? (
                          <span className="text-[10px] font-bold uppercase" style={{ color: KEBU.orange }}>
                            PO #{po.po_number}
                          </span>
                        ) : null}
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={colors}
                        >
                          {po.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-bold" style={{ color: KEBU.black }}>
                        {po.supplier_name}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
                        {po.items?.length ?? 0} item{(po.items?.length ?? 0) !== 1 ? "s" : ""}
                        {po.total_amount_xof ? ` · ${formatXof(po.total_amount_xof)}` : ""}
                        {po.expected_at ? ` · Expected ${po.expected_at}` : ""}
                      </p>
                    </div>
                    <span className="text-xs opacity-40">{expanded === po.id ? "▲" : "▼"}</span>
                  </div>
                </button>

                {expanded === po.id ? (
                  <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: KEBU.border }}>
                    {po.supplier_contact ? (
                      <p className="text-xs" style={{ color: KEBU.muted }}>
                        Contact: <a href={`tel:${po.supplier_contact}`} className="underline" style={{ color: KEBU.orange }}>{po.supplier_contact}</a>
                      </p>
                    ) : null}
                    {Array.isArray(po.items) && po.items.length > 0 ? (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left opacity-60">
                            <th className="pb-1">Product</th>
                            <th className="pb-1 text-right">Qty</th>
                            <th className="pb-1 text-right">Unit cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {po.items.map((item, i) => (
                            <tr key={i}>
                              <td className="py-0.5">{item.product_name}{item.sku ? ` (${item.sku})` : ""}</td>
                              <td className="py-0.5 text-right">{item.quantity}</td>
                              <td className="py-0.5 text-right">{item.unit_cost_xof ? formatXof(item.unit_cost_xof) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                    {po.note ? <p className="text-xs italic" style={{ color: KEBU.muted }}>{po.note}</p> : null}

                    {po.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === po.id}
                          onClick={() => void handleAction(po.id, "receive")}
                          className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                          style={{ background: "#16a34a" }}
                        >
                          Mark received
                        </button>
                        <button
                          type="button"
                          disabled={busyId === po.id}
                          onClick={() => void handleAction(po.id, "cancel")}
                          className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{ border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
