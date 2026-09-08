"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProductVariantRow } from "@/lib/shop/product-variants";
import { KEBU } from "@/lib/kebu-brand";

type VariantForm = {
  name: string;
  option1: string;
  option2: string;
  option3: string;
  priceLabel: string;
  priceXof: string;
  sku: string;
  stockQty: string;
};

const emptyVariantForm = (): VariantForm => ({
  name: "",
  option1: "",
  option2: "",
  option3: "",
  priceLabel: "",
  priceXof: "",
  sku: "",
  stockQty: "",
});

export function ProductVariantsEditor({
  projectId,
  productId,
  productName,
}: {
  projectId: string;
  productId: string;
  productName: string;
}) {
  const [variants, setVariants] = useState<ProductVariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<VariantForm>(emptyVariantForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/products/${productId}/variants`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      setVariants((data.variants ?? []) as ProductVariantRow[]);
      if (!res.ok) setNote(data.error ?? "Could not load variants.");
    } finally {
      setLoading(false);
    }
  }, [projectId, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(row: ProductVariantRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      option1: row.option1,
      option2: row.option2,
      option3: row.option3,
      priceLabel: row.price_label,
      priceXof: row.price_xof != null ? String(row.price_xof) : "",
      sku: row.sku ?? "",
      stockQty: row.stock_qty != null ? String(row.stock_qty) : "",
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.option1.trim() && !form.name.trim()) return;
    setBusy(true);
    setNote(null);
    const xofRaw = form.priceXof.trim();
    const body = {
      name: form.name.trim() || form.option1.trim() || "Variant",
      option1: form.option1,
      option2: form.option2,
      option3: form.option3,
      priceLabel: form.priceLabel,
      priceXof: xofRaw === "" ? null : Math.max(0, Math.round(Number(xofRaw) || 0)),
      sku: form.sku.trim() || null,
      stockQty: form.stockQty.trim() === "" ? null : Math.max(0, Math.round(Number(form.stockQty) || 0)),
    };
    try {
      const res = editingId
        ? await fetch(`/api/projects/${projectId}/products/${productId}/variants/${editingId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/projects/${projectId}/products/${productId}/variants`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(data.error ?? "Could not save variant.");
        return;
      }
      setForm(emptyVariantForm());
      setEditingId(null);
      setNote(editingId ? "Variant updated." : "Variant added.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(variantId: string) {
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/products/${productId}/variants/${variantId}`, {
        method: "DELETE",
        credentials: "include",
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border p-3 space-y-3" style={{ borderColor: KEBU.border }}>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
        Variants — {productName}
      </p>
      {loading ? <p className="text-xs opacity-60">Loading variants…</p> : null}
      {note ? <p className="text-xs">{note}</p> : null}
      <form onSubmit={(e) => void save(e)} className="grid gap-2 sm:grid-cols-2">
        <input
          placeholder="Option 1 (e.g. Size M)"
          value={form.option1}
          onChange={(e) => setForm((f) => ({ ...f, option1: e.target.value }))}
          className="rounded-lg border px-2 py-1.5 text-xs"
        />
        <input
          placeholder="Option 2 (e.g. Blue)"
          value={form.option2}
          onChange={(e) => setForm((f) => ({ ...f, option2: e.target.value }))}
          className="rounded-lg border px-2 py-1.5 text-xs"
        />
        <input
          placeholder="Price label (8,000 XOF)"
          value={form.priceLabel}
          onChange={(e) => setForm((f) => ({ ...f, priceLabel: e.target.value }))}
          className="rounded-lg border px-2 py-1.5 text-xs"
        />
        <input
          placeholder="SKU (optional)"
          value={form.sku}
          onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          className="rounded-lg border px-2 py-1.5 text-xs"
        />
        <button
          type="submit"
          disabled={busy}
          className="sm:col-span-2 rounded-full py-2 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: KEBU.black }}
        >
          {busy ? "Saving…" : editingId ? "Update variant" : "Add variant"}
        </button>
      </form>
      <ul className="space-y-1">
        {variants.map((v) => (
          <li key={v.id} className="flex items-center justify-between text-xs border-t pt-2">
            <span>
              {[v.option1, v.option2, v.option3].filter(Boolean).join(" / ") || v.name}
              {v.price_label ? ` — ${v.price_label}` : ""}
            </span>
            <span className="flex gap-2">
              <button type="button" className="underline" onClick={() => startEdit(v)}>
                Edit
              </button>
              <button type="button" className="text-red-700" onClick={() => void remove(v.id)}>
                Delete
              </button>
            </span>
          </li>
        ))}
        {!loading && !variants.length ? (
          <li className="text-xs opacity-60">No variants — customers order the base product.</li>
        ) : null}
      </ul>
    </div>
  );
}
