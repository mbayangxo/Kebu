"use client";

import { useCallback, useEffect, useState } from "react";
import type { CollectionRow } from "@/lib/shop/product-collections";
import type { ProjectProductRow } from "@/lib/create/project-products";
import { KEBU } from "@/lib/kebu-brand";

type CollectionWithProducts = CollectionRow & { productIds: string[] };

export function ShopCollectionsPanel({ projectId, showStorefrontAisles }: {
  projectId: string;
  showStorefrontAisles: boolean;
}) {
  const [aislesEnabled, setAislesEnabled] = useState(showStorefrontAisles);
  const [savingAisles, setSavingAisles] = useState(false);
  const [collections, setCollections] = useState<CollectionWithProducts[]>([]);
  const [products, setProducts] = useState<ProjectProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [colRes, prodRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/collections`, { credentials: "include" }),
        fetch(`/api/projects/${projectId}/products`, { credentials: "include" }),
      ]);
      const colData = await colRes.json().catch(() => ({}));
      const prodData = await prodRes.json().catch(() => ({}));
      if (!colRes.ok || !prodRes.ok) {
        setError(colData.error ?? prodData.error ?? "Could not load collections and products.");
        return;
      }
      setCollections((colData.collections ?? []) as CollectionWithProducts[]);
      setProducts((prodData.products ?? []) as ProjectProductRow[]);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setName("");
    setDescription("");
    setSelectedProductIds([]);
    setEditingId(null);
  }

  function startEdit(c: CollectionWithProducts) {
    setEditingId(c.id);
    setName(c.name);
    setDescription(c.description);
    setSelectedProductIds(c.productIds);
  }

  function toggleProduct(productId: string) {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setNote(null);
    try {
      const body = { name, description, productIds: selectedProductIds };
      const res = editingId
        ? await fetch(`/api/projects/${projectId}/collections/${editingId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/projects/${projectId}/collections`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(data.error ?? "Could not save collection.");
        return;
      }
      const saved = data.collection as CollectionWithProducts;
      setCollections((current) => [...current.filter((collection) => collection.id !== saved.id), saved]
        .sort((left, right) => left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at)));
      resetForm();
      setNote(editingId ? "Collection updated." : "Collection created.");
    } catch {
      setNote("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function changeCollectionVisibility(collection: CollectionWithProducts) {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/collections/${collection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !collection.is_active }),
      });
      if (!response.ok) {
        setNote("Could not update collection visibility.");
        return;
      }
      const { collection: saved } = await response.json() as { collection: CollectionWithProducts };
      setCollections((current) => current.map((item) => item.id === saved.id ? saved : item));
      setNote(saved.is_active
        ? "Collection is available for the next publish."
        : "Collection is hidden from the next publish.");
    } catch {
      setNote("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCollection(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/collections/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setNote("Could not remove collection.");
        return;
      }
      setCollections((current) => current.filter((collection) => collection.id !== id));
      if (editingId === id) resetForm();
      setNote("Collection removed.");
    } catch {
      setNote("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAisleSetting(enabled: boolean) {
    setSavingAisles(true);
    setNote(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showStorefrontAisles: enabled }),
      });
      if (!response.ok) {
        setNote("Could not update storefront aisles.");
        return;
      }
      setAislesEnabled(enabled);
      setNote("Aisle setting saved. Publish your site to update the storefront.");
    } catch {
      setNote("Network error. Try again.");
    } finally {
      setSavingAisles(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm" style={{ color: KEBU.muted }}>
        Loading collections…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
          Collections
        </h2>
        <p className="text-sm mt-1" style={{ color: KEBU.muted }}>
          Group products for campaigns, seasons, or categories.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {note ? (
        <p role="status" className="rounded-xl px-3 py-2 text-xs" style={{ background: KEBU.cream }}>
          {note}
        </p>
      ) : null}

      <div className="rounded-2xl border p-4" style={{ borderColor: KEBU.border }}>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={aislesEnabled}
            disabled={savingAisles}
            onChange={(event) => void saveAisleSetting(event.target.checked)}
          />
          Show collections as storefront aisles
        </label>
        <p className="mt-2 text-sm" style={{ color: KEBU.muted }}>
          Shoppers can browse active collections after you publish your site.
        </p>
      </div>

      <form onSubmit={(e) => void save(e)} className="space-y-3 rounded-2xl border p-4" style={{ borderColor: KEBU.border }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
          {editingId ? "Edit collection" : "New collection"}
        </p>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Collection name"
          placeholder="Collection name"
          className="w-full rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: KEBU.border }}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Description"
          placeholder="Description (optional)"
          rows={2}
          className="w-full rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: KEBU.border }}
        />
        <div>
          <p className="text-xs font-bold mb-2">Products in this collection</p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                />
                {p.name}
              </label>
            ))}
            {!products.length ? (
              <p className="text-xs opacity-60">Add products first in the Products tab.</p>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: KEBU.black }}
          >
            {busy ? "Saving…" : editingId ? "Update" : "Create collection"}
          </button>
          {editingId ? (
            <button type="button" onClick={resetForm} className="text-xs underline opacity-70">
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <ul className="space-y-3">
        {collections.map((c) => (
          <li
            key={c.id}
            className="rounded-2xl border p-4 flex flex-wrap items-start justify-between gap-3"
            style={{ borderColor: KEBU.border }}
          >
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs font-mono opacity-50">/{c.slug}</p>
              {c.description ? <p className="text-sm mt-1 opacity-70">{c.description}</p> : null}
              <p className="text-xs mt-2 text-black/70">
                {c.productIds.length} product(s) · {c.is_active ? "Available for publishing" : "Hidden from storefront"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => startEdit(c)}
                className="rounded-full px-3 py-1 text-[10px] font-bold border"
                style={{ borderColor: KEBU.border }}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void changeCollectionVisibility(c)}
                className="rounded-full px-3 py-1 text-[10px] font-bold border"
                style={{ borderColor: KEBU.border }}
              >
                {c.is_active ? "Hide" : "Make available"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void removeCollection(c.id)}
                className="rounded-full px-3 py-1 text-[10px] font-bold border" style={{ color: "#8B1E1E" }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {!collections.length ? (
          <li className="text-sm opacity-60">No collections yet — create one above.</li>
        ) : null}
      </ul>
    </div>
  );
}
