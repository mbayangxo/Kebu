"use client";

import { useCallback, useEffect, useState } from "react";
import { SiteImageUpload } from "@/app/components/create/site-image-upload";
import type { ProjectProductRow } from "@/lib/create/project-products";
import { ProductVariantsEditor } from "@/app/components/shop/product-variants-editor";

type ProductForm = {
  name: string;
  description: string;
  priceLabel: string;
  priceXof: string;
  upc: string;
  sku: string;
  trackStock: boolean;
  stockQty: string;
  isSubscription: boolean;
  subscriptionInterval: "weekly" | "monthly" | "quarterly" | "yearly";
  imageUrl: string;
  whatsappOrderMessage: string;
};

const emptyForm = (): ProductForm => ({
  name: "",
  description: "",
  priceLabel: "",
  priceXof: "",
  upc: "",
  sku: "",
  trackStock: false,
  stockQty: "",
  isSubscription: false,
  subscriptionInterval: "monthly",
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
      priceXof: row.price_xof != null ? String(row.price_xof) : "",
      upc: row.upc ?? "",
      sku: row.sku ?? "",
      trackStock: Boolean(row.track_stock),
      stockQty: row.stock_qty != null ? String(row.stock_qty) : "",
      isSubscription: Boolean(row.is_subscription),
      subscriptionInterval: row.subscription_interval ?? "monthly",
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
      const xofRaw = form.priceXof.trim();
      const priceXof =
        xofRaw === ""
          ? null
          : Number.isFinite(Number(xofRaw))
            ? Math.max(0, Math.round(Number(xofRaw)))
            : null;
      const body = {
        name: form.name,
        description: form.description,
        priceLabel: form.priceLabel,
        priceXof,
        upc: form.upc.trim() || null,
        sku: form.sku.trim() || null,
        trackStock: form.trackStock,
        stockQty: form.trackStock
          ? Math.max(0, Math.round(Number(form.stockQty) || 0))
          : null,
        isSubscription: form.isSubscription,
        subscriptionInterval: form.isSubscription ? form.subscriptionInterval : null,
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
      <div>
        <h2 className="text-lg font-bold" style={{ color: "#0A0A0A" }}>
          Products
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "#6B5B45" }}>
          Add items like Shopify — name, price, photo. They sync to your website Shop page. Set how customers
          pay in the Payments tab.
        </p>
      </div>

      {onMerchantWhatsAppChange ? (
        <>
          <label className="block text-[10px] uppercase tracking-wider">
            WhatsApp for orders
            <input
              className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
              style={{ border: "1px solid #DDE0F0" }}
              placeholder="+221 77 000 00 00"
              value={merchantWhatsApp ?? ""}
              onChange={(e) => onMerchantWhatsAppChange(e.target.value)}
            />
          </label>
          <p className="text-[9px] opacity-60">Used on every product card — include country code.</p>
        </>
      ) : null}

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
                {p.price_xof != null ? (
                  <p className="text-[9px] opacity-50">JOKO: {p.price_xof.toLocaleString()} XOF</p>
                ) : null}
                {p.upc || p.sku ? (
                  <p className="text-[9px] font-mono opacity-50">
                    {p.upc ? `UPC ${p.upc}` : null}
                    {p.upc && p.sku ? " · " : null}
                    {p.sku ? `SKU ${p.sku}` : null}
                  </p>
                ) : null}
                {p.track_stock ? (
                  <p className="text-[9px] opacity-60">
                    Stock: {(p.stock_qty ?? 0) === 0 ? "sold out" : `${p.stock_qty} left`}
                  </p>
                ) : null}
                {p.is_subscription ? (
                  <p className="text-[9px] font-semibold" style={{ color: "#FF5500" }}>
                    Subscription · {p.subscription_interval ?? "monthly"}
                  </p>
                ) : null}
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
          Price in XOF (for JOKO pay)
          <input
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
            style={{ border: "1px solid #DDE0F0" }}
            placeholder="5000"
            inputMode="numeric"
            value={form.priceXof}
            onChange={(e) => setForm((f) => ({ ...f, priceXof: e.target.value.replace(/[^\d]/g, "") }))}
          />
        </label>
        <p className="text-[9px] opacity-60">
          Needed for live JOKO checkout. Paid only after the JOKO webhook confirms — never marked paid in the
          browser.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[10px] uppercase tracking-wider">
            UPC / barcode
            <input
              className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs font-mono"
              style={{ border: "1px solid #DDE0F0" }}
              placeholder="612345678901"
              value={form.upc}
              onChange={(e) =>
                setForm((f) => ({ ...f, upc: e.target.value.toUpperCase().replace(/\s+/g, "") }))
              }
            />
          </label>
          <label className="block text-[10px] uppercase tracking-wider">
            SKU
            <input
              className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs font-mono"
              style={{ border: "1px solid #DDE0F0" }}
              placeholder="TEE-BLK-M"
              value={form.sku}
              onChange={(e) =>
                setForm((f) => ({ ...f, sku: e.target.value.toUpperCase().replace(/\s+/g, "") }))
              }
            />
          </label>
        </div>
        <p className="text-[9px] opacity-60">Unique per shop. Shown on orders and WhatsApp.</p>
        <label className="flex items-center gap-2 text-[10px] font-semibold">
          <input
            type="checkbox"
            checked={form.trackStock}
            onChange={(e) => setForm((f) => ({ ...f, trackStock: e.target.checked }))}
          />
          Track stock for this product
        </label>
        {form.trackStock ? (
          <label className="block text-[10px] uppercase tracking-wider">
            Units in stock
            <input
              className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
              style={{ border: "1px solid #DDE0F0" }}
              inputMode="numeric"
              value={form.stockQty}
              onChange={(e) =>
                setForm((f) => ({ ...f, stockQty: e.target.value.replace(/[^\d]/g, "") }))
              }
              placeholder="0"
            />
          </label>
        ) : null}
        <p className="text-[9px] opacity-60">
          When tracking is on, place-order and cart checkout refuse sold-out items and reduce stock. Cancel
          restores stock.
        </p>
        <label className="flex items-center gap-2 text-[10px] font-semibold">
          <input
            type="checkbox"
            checked={form.isSubscription}
            onChange={(e) => setForm((f) => ({ ...f, isSubscription: e.target.checked }))}
          />
          Subscription product (recurring)
        </label>
        {form.isSubscription ? (
          <label className="block text-[10px] uppercase tracking-wider">
            Billing interval
            <select
              className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
              style={{ border: "1px solid #DDE0F0" }}
              value={form.subscriptionInterval}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  subscriptionInterval: e.target.value as ProductForm["subscriptionInterval"],
                }))
              }
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Every 3 months</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
        ) : null}
        <p className="text-[9px] opacity-60">
          Customers subscribe on your live site. Each period creates a pending order — you collect on WhatsApp,
          Wave, or JOKO (not silent card auto-charge).
        </p>
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

      {editingId ? (
        <ProductVariantsEditor
          projectId={projectId}
          productId={editingId}
          productName={form.name || "Product"}
        />
      ) : null}

      {note ? (
        <p className="text-[10px]" style={{ color: note.includes("Could") ? "#B42318" : "#009E40" }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
