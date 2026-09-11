"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Expense = {
  id: string;
  description: string;
  category: string;
  amount_xof: number;
  date: string;
  note: string;
  created_at: string;
};

const CATEGORIES = [
  ["inventory", "Stock / Inventory"],
  ["shipping", "Shipping & delivery"],
  ["marketing", "Marketing & ads"],
  ["salary", "Salaries / Staff"],
  ["rent", "Rent / Space"],
  ["utilities", "Utilities"],
  ["equipment", "Equipment / Tools"],
  ["fees", "Platform / Bank fees"],
  ["other", "Other"],
] as const;

function formatXof(n: number): string {
  if (!n) return "—";
  return `${Math.round(n).toLocaleString()} XOF`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  description: "",
  category: "inventory" as Expense["category"],
  amount_xof: "",
  date: today(),
  note: "",
};

export function ShopExpensesPanel({ projectId }: { projectId: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableReady, setTableReady] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/expenses`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load expenses.");
        return;
      }
      setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
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
    if (!form.description.trim() || !form.amount_xof) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/expenses`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description.trim(),
          category: form.category,
          amount_xof: Number(form.amount_xof),
          date: form.date,
          note: form.note.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof data.error === "string" ? data.error : "Could not save expense.");
        return;
      }
      setForm({ ...EMPTY_FORM, date: today() });
      setShowForm(false);
      void load();
    } catch {
      setSaveError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/projects/${projectId}/expenses?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      void load();
    } finally {
      setDeletingId(null);
    }
  }

  // Aggregate totals by category
  const byCategory: Record<string, number> = {};
  let totalXof = 0;
  for (const ex of expenses) {
    byCategory[ex.category] = (byCategory[ex.category] ?? 0) + ex.amount_xof;
    totalXof += ex.amount_xof;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            Business expenses
          </p>
          <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
            Track what your business spends — stock, shipping, staff, rent. See what eats your margin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ background: KEBU.orange }}
        >
          {showForm ? "Cancel" : "+ Add expense"}
        </button>
      </div>

      {!tableReady ? (
        <div
          className="rounded-2xl p-4 text-sm"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="font-semibold" style={{ color: KEBU.black }}>
            Expenses table not set up yet
          </p>
          <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
            Ask Kebu support to run migration 060 (shop_expenses table). Once set up, all your expenses save
            directly to your Kebu account.
          </p>
        </div>
      ) : null}

      {showForm && tableReady ? (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="space-y-3 rounded-2xl p-4"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
            Record expense
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Description *
              </label>
              <input
                required
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Payer le loyer du local"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Category
              </label>
              <select
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              >
                {CATEGORIES.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Amount (XOF) *
              </label>
              <input
                required
                type="number"
                min={0}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                value={form.amount_xof}
                onChange={(e) => setForm((p) => ({ ...p, amount_xof: e.target.value }))}
                placeholder="150000"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Date
              </label>
              <input
                type="date"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Note (optional)
            </label>
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: KEBU.border }}
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="Receipt number, supplier name…"
            />
          </div>
          {saveError ? <p className="text-xs text-red-700">{saveError}</p> : null}
          <button
            type="submit"
            disabled={saving || !form.description.trim() || !form.amount_xof}
            className="rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
            style={{ background: KEBU.black }}
          >
            {saving ? "Saving…" : "Record expense"}
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>Loading expenses…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : (
        <>
          {expenses.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: "#fef9c3", border: `1px solid #fde68a` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#92400e" }}>
                  Total expenses
                </p>
                <p className="mt-1 text-2xl font-bold" style={{ color: KEBU.black }}>
                  {formatXof(totalXof)}
                </p>
              </div>
              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  Top category
                </p>
                <p className="mt-1 text-sm font-bold" style={{ color: KEBU.black }}>
                  {(() => {
                    const top = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0];
                    if (!top) return "—";
                    const label = CATEGORIES.find(([id]) => id === top[0])?.[1] ?? top[0];
                    return `${label} · ${formatXof(top[1])}`;
                  })()}
                </p>
              </div>
            </div>
          ) : null}

          {expenses.length === 0 ? (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
            >
              <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
                No expenses recorded yet
              </p>
              <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
                Add your first expense above — stock purchases, shipping fees, rent — so you can see
                your real profit margin.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {expenses.map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                  style={{ borderColor: KEBU.border, background: "#fff" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
                      {ex.description}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
                      {CATEGORIES.find(([id]) => id === ex.category)?.[1] ?? ex.category}
                      {" · "}
                      {ex.date}
                    </p>
                    {ex.note ? (
                      <p className="mt-0.5 text-xs italic" style={{ color: KEBU.faint }}>
                        {ex.note}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 font-bold tabular-nums" style={{ color: KEBU.black }}>
                    {formatXof(ex.amount_xof)}
                  </p>
                  <button
                    type="button"
                    disabled={deletingId === ex.id}
                    onClick={() => void handleDelete(ex.id)}
                    className="shrink-0 text-[11px] opacity-40 hover:opacity-100 transition-opacity"
                    style={{ color: KEBU.muted }}
                    aria-label="Delete expense"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
