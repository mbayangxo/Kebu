"use client";

import { useState } from "react";
import { useShopQuery, invalidateShopQuery } from "@/lib/shop/use-shop-query";
import { PanelShell, SaveErrorBanner, TableNotReadyBanner } from "./panel-shell";

type Expense = {
  id: string;
  description: string;
  category: string;
  amount_xof: number;
  date: string;
  note: string;
  created_at: string;
};

type ApiResponse = {
  expenses: Expense[];
  tableReady: boolean;
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
  category: "inventory" as string,
  amount_xof: "",
  date: today(),
  note: "",
};

export function ShopExpensesPanel({ projectId }: { projectId: string }) {
  const url = `/api/projects/${projectId}/expenses`;
  const { data, loading, error, reload } = useShopQuery<ApiResponse>(url);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const expenses = data?.expenses ?? [];
  const tableReady = data?.tableReady !== false;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim() || !form.amount_xof) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(url, {
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
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError((body as { error?: string }).error ?? "Could not save expense.");
        return;
      }
      setForm({ ...EMPTY_FORM, date: today() });
      setShowForm(false);
      invalidateShopQuery(url);
      reload();
    } catch {
      setSaveError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`${url}?id=${id}`, { method: "DELETE", credentials: "include" });
      invalidateShopQuery(url);
      reload();
    } finally {
      setDeletingId(null);
    }
  }

  // Aggregate totals
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
          <p className="text-sm font-semibold kb-text-black">Business expenses</p>
          <p className="mt-0.5 text-xs kb-text-muted">
            Track what your business spends — stock, shipping, staff, rent. See what eats your margin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider kb-btn-primary"
        >
          {showForm ? "Cancel" : "+ Add expense"}
        </button>
      </div>

      {!tableReady && <TableNotReadyBanner migration="087_shop_expenses" />}

      {showForm && tableReady && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="space-y-3 rounded-2xl p-4 kb-bg-cream kb-border"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider kb-text-orange">
            Record expense
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="kb-label">Description *</label>
              <input
                required
                className="kb-input rounded-xl"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Payer le loyer du local"
              />
            </div>
            <div>
              <label className="kb-label">Category</label>
              <select
                className="kb-input rounded-xl"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              >
                {CATEGORIES.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="kb-label">Amount (XOF) *</label>
              <input
                required
                type="number"
                min={0}
                className="kb-input rounded-xl"
                value={form.amount_xof}
                onChange={(e) => setForm((p) => ({ ...p, amount_xof: e.target.value }))}
                placeholder="150000"
              />
            </div>
            <div>
              <label className="kb-label">Date</label>
              <input
                type="date"
                className="kb-input rounded-xl"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="kb-label">Note (optional)</label>
            <input
              className="kb-input rounded-xl"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="Receipt number, supplier name…"
            />
          </div>
          <SaveErrorBanner error={saveError} />
          <button
            type="submit"
            disabled={saving || !form.description.trim() || !form.amount_xof}
            className="kb-btn-primary rounded-full px-5 py-2 text-[11px] uppercase tracking-wider"
          >
            {saving ? "Saving…" : "Record expense"}
          </button>
        </form>
      )}

      <PanelShell
        loading={loading}
        error={error}
        empty={!loading && !error && expenses.length === 0 && tableReady}
        emptyMessage="No expenses recorded yet. Add your first — stock, shipping, rent — to see your real margin."
        emptyAction={
          <button
            type="button"
            className="kb-btn-primary rounded-full px-4 py-1.5 text-[11px] uppercase tracking-wider"
            onClick={() => setShowForm(true)}
          >
            + Add expense
          </button>
        }
      >
        <>
          {expenses.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl px-4 py-3" style={{ background: "#fef9c3", border: "1px solid #fde68a" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#92400e" }}>
                  Total expenses
                </p>
                <p className="mt-1 text-2xl font-bold kb-text-black">{formatXof(totalXof)}</p>
              </div>
              <div className="rounded-2xl px-4 py-3 kb-bg-cream kb-border">
                <p className="text-[10px] font-bold uppercase tracking-wider kb-text-muted">Top category</p>
                <p className="mt-1 text-sm font-bold kb-text-black">
                  {(() => {
                    const top = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0];
                    if (!top) return "—";
                    const label = CATEGORIES.find(([id]) => id === top[0])?.[1] ?? top[0];
                    return `${label} · ${formatXof(top[1])}`;
                  })()}
                </p>
              </div>
            </div>
          )}

          <ul className="space-y-2">
            {expenses.map((ex) => (
              <li
                key={ex.id}
                className="flex items-center gap-3 rounded-xl border px-3 py-2.5 kb-border kb-bg-white"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold kb-text-black">{ex.description}</p>
                  <p className="mt-0.5 text-xs kb-text-muted">
                    {CATEGORIES.find(([id]) => id === ex.category)?.[1] ?? ex.category}
                    {" · "}
                    {ex.date}
                  </p>
                  {ex.note && (
                    <p className="mt-0.5 text-xs italic kb-text-faint">{ex.note}</p>
                  )}
                </div>
                <p className="shrink-0 font-bold tabular-nums kb-text-black">{formatXof(ex.amount_xof)}</p>
                <button
                  type="button"
                  disabled={deletingId === ex.id}
                  onClick={() => void handleDelete(ex.id)}
                  className="shrink-0 text-[11px] opacity-40 hover:opacity-100 transition-opacity kb-text-muted"
                  aria-label="Delete expense"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      </PanelShell>
    </div>
  );
}
