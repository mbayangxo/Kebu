"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type DraftOrder = {
  id: string;
  order_number: string | null;
  product_name: string;
  price_label: string;
  quantity: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_note: string;
  payment_preference: string | null;
  payment_status: string | null;
  amount_xof: number | null;
  status: string;
  created_at: string;
};

const EMPTY_FORM = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  customer_note: "",
  product_name: "",
  quantity: "1",
  price_label: "",
  amount_xof: "",
  payment_preference: "wave",
};

function formatXof(n: number | null): string {
  if (!n) return "—";
  return `${Math.round(n).toLocaleString()} XOF`;
}

export function ShopDraftOrdersPanel({ projectId }: { projectId: string }) {
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/draft-orders`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load drafts.");
        return;
      }
      setDrafts(Array.isArray(data.orders) ? data.orders : []);
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
    if (!form.customer_name.trim() || !form.product_name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/draft-orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: form.customer_name.trim(),
          customer_phone: form.customer_phone.trim(),
          customer_email: form.customer_email.trim() || undefined,
          customer_note: form.customer_note.trim(),
          product_name: form.product_name.trim(),
          quantity: Math.max(1, parseInt(form.quantity, 10) || 1),
          price_label: form.price_label.trim(),
          amount_xof: form.amount_xof ? Number(form.amount_xof) : undefined,
          payment_preference: form.payment_preference || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof data.error === "string" ? data.error : "Could not create draft.");
        return;
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      void load();
    } catch {
      setSaveError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(orderId: string, action: "confirm" | "cancel") {
    setBusyId(orderId);
    try {
      const res = await fetch(`/api/projects/${projectId}/draft-orders`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action, payment_status: action === "confirm" ? "paid" : undefined }),
      });
      if (res.ok) void load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            Draft orders
          </p>
          <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
            Enter orders taken by phone, WhatsApp, or in person. Confirm when payment is received.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ background: KEBU.orange }}
        >
          {showForm ? "Cancel" : "+ New draft"}
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="space-y-3 rounded-2xl p-4"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
            New draft order
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Customer name *
              </label>
              <input
                required
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                value={form.customer_name}
                onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                placeholder="Aminata Koné"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Phone / WhatsApp
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                value={form.customer_phone}
                onChange={(e) => setForm((p) => ({ ...p, customer_phone: e.target.value }))}
                placeholder="+225 07 00 00 00 00"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Product / service *
              </label>
              <input
                required
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                value={form.product_name}
                onChange={(e) => setForm((p) => ({ ...p, product_name: e.target.value }))}
                placeholder="Robe en wax taille M"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  Qty
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: KEBU.border }}
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  Amount (XOF)
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: KEBU.border }}
                  value={form.amount_xof}
                  onChange={(e) => setForm((p) => ({ ...p, amount_xof: e.target.value }))}
                  placeholder="25000"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Payment method
              </label>
              <select
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                value={form.payment_preference}
                onChange={(e) => setForm((p) => ({ ...p, payment_preference: e.target.value }))}
              >
                <option value="wave">Wave</option>
                <option value="orange_money">Orange Money</option>
                <option value="momo">MTN Mobile Money</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Note
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                value={form.customer_note}
                onChange={(e) => setForm((p) => ({ ...p, customer_note: e.target.value }))}
                placeholder="Colour preference, delivery address…"
              />
            </div>
          </div>
          {saveError ? <p className="text-xs text-red-700">{saveError}</p> : null}
          <button
            type="submit"
            disabled={saving || !form.customer_name.trim() || !form.product_name.trim()}
            className="rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
            style={{ background: KEBU.black }}
          >
            {saving ? "Creating…" : "Create draft"}
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>Loading drafts…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : drafts.length === 0 ? (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            No draft orders
          </p>
          <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
            Create a draft when a customer orders by phone, WhatsApp, or walk-in. Confirm after payment.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {drafts.map((o) => (
            <li
              key={o.id}
              className="rounded-2xl border px-4 py-3"
              style={{ borderColor: KEBU.border, background: "#fff" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: KEBU.black }}>
                    {o.customer_name}
                    {o.customer_phone ? (
                      <span className="ml-2 font-normal text-xs" style={{ color: KEBU.muted }}>
                        {o.customer_phone}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
                    {o.quantity}× {o.product_name}
                    {o.amount_xof ? ` · ${formatXof(o.amount_xof)}` : ""}
                    {o.payment_preference ? ` · ${o.payment_preference}` : ""}
                  </p>
                  {o.customer_note ? (
                    <p className="mt-0.5 text-xs italic" style={{ color: KEBU.faint }}>
                      {o.customer_note}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[10px] uppercase tracking-wider" style={{ color: KEBU.faint }}>
                    {new Date(o.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busyId === o.id}
                    onClick={() => void handleAction(o.id, "confirm")}
                    className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                    style={{ background: "#16a34a" }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    disabled={busyId === o.id}
                    onClick={() => void handleAction(o.id, "cancel")}
                    className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
