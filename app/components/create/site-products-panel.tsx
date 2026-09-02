"use client";

import { useCallback, useEffect, useState } from "react";
import { SiteImageUpload } from "@/app/components/create/site-image-upload";
import type { ProjectProductRow } from "@/lib/create/project-products";

type ProductForm = {
  name: string;
  description: string;
  priceLabel: string;
  imageUrl: string;
  whatsappOrderMessage: string;
};

const emptyForm = (): ProductForm => ({
  name: "",
  description: "",
  priceLabel: "",
  imageUrl: "",
  whatsappOrderMessage: "",
});

export function SiteProductsPanel({
  projectId,
  merchantWhatsApp,
  onMerchantWhatsAppChange,
  onSyncedToSite,
}: {
  projectId: string;
  merchantWhatsApp?: string;
  onMerchantWhatsAppChange?: (phone: string) => void;
  onSyncedToSite?: (items: ProjectProductRow[]) => void;
}) {
  const [products, setProducts] = useState<ProjectProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/products`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not load products.");
        setProducts([]);
        return;
      }
      const rows = (data.products ?? []) as ProjectProductRow[];
      setProducts(rows);
      onSyncedToSite?.(rows);
    } catch {
      setError("Network error loading products.");
    } finally {
      setLoading(false);
    }
  }, [projectId, onSyncedToSite]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(row: ProjectProductRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      description: row.description,
      priceLabel: row.price_label,
      imageUrl: row.image_url,
      whatsappOrderMessage: row.whatsapp_order_message,
    });
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    setNote(null);
    try {
      const body = {
        name: form.name,
        description: form.description,
        priceLabel: form.priceLabel,
        imageUrl: form.imageUrl,
        whatsappOrderMessage: form.whatsappOrderMessage,
      };
      const res = editingId
        ? await fetch(`/api/projects/${projectId}/products/${editingId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/projects/${projectId}/products`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(data.error ?? "Could not save product.");
        return;
      }
      setForm(emptyForm());
      setEditingId(null);
      setNote(editingId ? "Product updated." : "Product added — publish to update your live shop.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(productId: string) {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setNote(data.error ?? "Could not delete product.");
        return;
      }
      if (editingId === productId) {
        setEditingId(null);
        setForm(emptyForm());
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] leading-relaxed" style={{ color: "#6B5B45" }}>
        Your shop catalog — upload photos from your computer. Customers order on WhatsApp (JOKO checkout for products
        comes in the next slice). Publish after changes.
      </p>

      <label className="block text-[10px] uppercase tracking-wider">
        WhatsApp for orders
        <input
          className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
          style={{ border: "1px solid #DDE0F0" }}
          placeholder="+221 77 000 00 00"
          value={merchantWhatsApp ?? ""}
          onChange={(e) => onMerchantWhatsAppChange?.(e.target.value)}
        />
      </label>
      <p className="text-[9px] opacity-60">Used on every product card — include country code.</p>

      {loading ? <p className="text-[10px] text-muted">Loading products…</p> : null}
      {error ? <p className="text-[10px] text-red-600">{error}</p> : null}

      {products.length > 0 ? (
        <ul className="space-y-2">
          {products.map((p) => (
            <li
              key={p.id}
              className="rounded-lg p-2 flex items-start gap-2"
              style={{ border: "1px solid #E8E6DF", background: "#FFFCF7" }}
            >
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{p.name}</p>
                {p.price_label ? <p className="text-[10px] opacity-70">{p.price_label}</p> : null}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button type="button" className="text-[10px] font-bold underline" onClick={() => startEdit(p)}>
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeProduct(p.id)}
                  className="text-[10px] text-red-600"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] opacity-60">No products yet — add your first item below.</p>
      )}

      <form onSubmit={(e) => void saveProduct(e)} className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider">
          {editingId ? "Edit product" : "Add product"}
        </p>
        <label className="block text-[10px] uppercase tracking-wider">
          Product name
          <input
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
            style={{ border: "1px solid #DDE0F0" }}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </label>
        <label className="block text-[10px] uppercase tracking-wider">
          Price label
          <input
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
            style={{ border: "1px solid #DDE0F0" }}
            placeholder="CFA 5,000"
            value={form.priceLabel}
            onChange={(e) => setForm((f) => ({ ...f, priceLabel: e.target.value }))}
          />
        </label>
        <label className="block text-[10px] uppercase tracking-wider">
          Description
          <textarea
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
            style={{ border: "1px solid #DDE0F0" }}
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>
        <SiteImageUpload
          projectId={projectId}
          kind="product"
          value={form.imageUrl}
          onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))}
          label="Product photo"
        />
        <label className="block text-[10px] uppercase tracking-wider">
          WhatsApp order message (optional)
          <input
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
            style={{ border: "1px solid #DDE0F0" }}
            placeholder="Hi — I want to order the blue shirt, size M"
            value={form.whatsappOrderMessage}
            onChange={(e) => setForm((f) => ({ ...f, whatsappOrderMessage: e.target.value }))}
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy || !form.name.trim()}
            className="flex-1 rounded-full py-2 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
            style={{ background: "#0A0A0A", color: "#fff" }}
          >
            {busy ? "Saving…" : editingId ? "Update product" : "Add product"}
          </button>
          {editingId ? (
            <button
              type="button"
              className="rounded-full px-3 py-2 text-[10px] font-bold uppercase"
              style={{ border: "1px solid #DDE0F0" }}
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm());
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {note ? (
        <p className="text-[10px]" style={{ color: note.includes("Could") ? "#B42318" : "#009E40" }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
