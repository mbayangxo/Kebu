"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Company = {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  note: string;
  orderCount: number;
  totalXof: number;
  createdAt: string;
};

function formatXof(n: number): string {
  if (!n) return "—";
  return `${Math.round(n).toLocaleString()} XOF`;
}

const EMPTY_FORM = {
  name: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  address: "",
  note: "",
};

export function ShopCompaniesPanel({ projectId }: { projectId: string }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Company | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/companies`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404 || (typeof data.error === "string" && /not found|table/i.test(data.error))) {
          setCompanies([]);
          setLoading(false);
          return;
        }
        setError(typeof data.error === "string" ? data.error : "Could not load companies.");
        return;
      }
      setCompanies(Array.isArray(data.companies) ? data.companies : []);
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
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/companies`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof data.error === "string" ? data.error : "Could not save company.");
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

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            B2B companies
          </p>
          <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
            Track wholesale clients, resellers, and corporate accounts separately from individual buyers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ background: KEBU.orange }}
        >
          {showForm ? "Cancel" : "+ Add company"}
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="space-y-3 rounded-2xl p-4"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
            New company account
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["name", "Company name *"],
                ["contactName", "Main contact"],
                ["contactPhone", "Phone / WhatsApp"],
                ["contactEmail", "Email"],
                ["address", "Address"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  {label}
                </label>
                <input
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: KEBU.border }}
                  value={form[field]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                  required={field === "name"}
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                Notes
              </label>
              <textarea
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
                rows={2}
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              />
            </div>
          </div>
          {saveError ? (
            <p className="text-xs" style={{ color: "#8B1E1E" }}>{saveError}</p>
          ) : null}
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
            style={{ background: KEBU.black }}
          >
            {saving ? "Saving…" : "Save company"}
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>Loading companies…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : companies.length === 0 ? (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            No companies yet
          </p>
          <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
            Add wholesale clients, resellers, and corporate buyers. Track their orders separately from retail.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ul className="space-y-2">
            {companies.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelected(selected?.id === c.id ? null : c)}
                  className="w-full rounded-xl border px-3 py-3 text-left transition-colors"
                  style={{
                    borderColor: selected?.id === c.id ? KEBU.orange : KEBU.border,
                    background: selected?.id === c.id ? "#fff8f3" : "#fff",
                  }}
                >
                  <p className="text-sm font-bold" style={{ color: KEBU.black }}>
                    {c.name}
                  </p>
                  {c.contactName ? (
                    <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
                      {c.contactName}{c.contactPhone ? ` · ${c.contactPhone}` : ""}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.faint }}>
                    {c.orderCount} orders{c.totalXof > 0 ? ` · ${formatXof(c.totalXof)}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <div
            className="min-h-[180px] rounded-xl border p-4"
            style={{ borderColor: KEBU.border, background: KEBU.cream }}
          >
            {!selected ? (
              <p className="text-sm" style={{ color: KEBU.muted }}>
                Tap a company to see full details.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-base font-bold" style={{ color: KEBU.black }}>
                  {selected.name}
                </p>
                {selected.contactName ? (
                  <p className="text-xs" style={{ color: KEBU.muted }}>
                    Contact: {selected.contactName}
                  </p>
                ) : null}
                {selected.contactPhone ? (
                  <p className="text-xs" style={{ color: KEBU.muted }}>
                    Phone: <a href={`tel:${selected.contactPhone}`} className="underline" style={{ color: KEBU.orange }}>{selected.contactPhone}</a>
                  </p>
                ) : null}
                {selected.contactEmail ? (
                  <p className="text-xs" style={{ color: KEBU.muted }}>
                    Email: {selected.contactEmail}
                  </p>
                ) : null}
                {selected.address ? (
                  <p className="text-xs" style={{ color: KEBU.muted }}>
                    Address: {selected.address}
                  </p>
                ) : null}
                {selected.note ? (
                  <p className="text-xs italic" style={{ color: KEBU.muted }}>
                    {selected.note}
                  </p>
                ) : null}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white px-3 py-2 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider opacity-50">Orders</p>
                    <p className="text-sm font-bold">{selected.orderCount}</p>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider opacity-50">Total spend</p>
                    <p className="text-sm font-bold">{formatXof(selected.totalXof)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
