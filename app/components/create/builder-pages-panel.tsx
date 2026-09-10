"use client";

import { useState } from "react";
import { BUILDER } from "@/lib/create/builder-ui";
import { isValidPageSlug, normalizePageSlug } from "@/lib/create/builder-pages";

export type BuilderPageRow = {
  id: string;
  slug: string;
  title: string;
  sort_order: number;
};

/** Slim Shopify-style pages list — no oversized cards. */
export function BuilderPagesPanel({
  projectId,
  pages,
  editPageId,
  previewPageSlug,
  busy = false,
  onSelectPage,
  onRefresh,
  onError,
}: {
  projectId: string;
  pages: BuilderPageRow[];
  editPageId: string;
  previewPageSlug: string;
  busy?: boolean;
  onSelectPage: (page: BuilderPageRow) => void;
  onRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [localBusy, setLocalBusy] = useState(false);

  const sorted = [...pages].sort((a, b) => a.sort_order - b.sort_order);
  const working = busy || localBusy;

  async function addPage() {
    const title = newTitle.trim();
    const slug = normalizePageSlug(title);
    if (!slug || !title) {
      onError("Page title is required.");
      return;
    }
    if (!isValidPageSlug(slug)) {
      onError("Use letters, numbers, and hyphens only.");
      return;
    }
    setLocalBusy(true);
    onError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(typeof data.error === "string" ? data.error : "Could not add page.");
        return;
      }
      setNewTitle("");
      setAdding(false);
      await onRefresh();
      if (data.page?.id) onSelectPage(data.page as BuilderPageRow);
    } catch {
      onError("Network error while adding page.");
    } finally {
      setLocalBusy(false);
    }
  }

  async function removePage(pageId: string) {
    if (!confirm("Delete this page and all its sections?")) return;
    setLocalBusy(true);
    onError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(typeof data.error === "string" ? data.error : "Could not delete page.");
        return;
      }
      await onRefresh();
    } catch {
      onError("Network error while deleting page.");
    } finally {
      setLocalBusy(false);
    }
  }

  async function savePageEdit(pageId: string) {
    const title = editTitle.trim();
    const slug = normalizePageSlug(editSlug);
    if (!title || !slug) {
      onError("Title and slug are required.");
      return;
    }
    if (!isValidPageSlug(slug)) {
      onError("Invalid slug format.");
      return;
    }
    setLocalBusy(true);
    onError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, title, slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(typeof data.error === "string" ? data.error : "Could not update page.");
        return;
      }
      setEditingId(null);
      await onRefresh();
      if (data.page) onSelectPage(data.page as BuilderPageRow);
    } catch {
      onError("Network error while updating page.");
    } finally {
      setLocalBusy(false);
    }
  }

  async function movePage(pageId: string, direction: "up" | "down") {
    const idx = sorted.findIndex((p) => p.id === pageId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx]!;
    const b = sorted[swapIdx]!;
    setLocalBusy(true);
    onError(null);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/projects/${projectId}/pages`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: a.id, sortOrder: b.sort_order }),
        }),
        fetch(`/api/projects/${projectId}/pages`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: b.id, sortOrder: a.sort_order }),
        }),
      ]);
      if (!resA.ok || !resB.ok) {
        onError("Could not reorder pages.");
        return;
      }
      await onRefresh();
    } catch {
      onError("Network error while reordering.");
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: BUILDER.muted }}>
          Pages
        </p>
        <button
          type="button"
          disabled={working}
          onClick={() => setAdding((v) => !v)}
          className="text-[10px] font-bold"
          style={{ color: BUILDER.orange }}
        >
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      <ul className="space-y-0.5">
        {sorted.map((p, idx) => {
          const active = p.id === editPageId || p.slug === previewPageSlug;
          const editing = editingId === p.id;
          return (
            <li key={p.id}>
              {editing ? (
                <div className="space-y-1.5 rounded-md p-2" style={{ background: BUILDER.surfaceMuted }}>
                  <input
                    className="w-full rounded px-2 py-1 text-xs"
                    style={{ border: `1px solid ${BUILDER.border}` }}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    disabled={working}
                  />
                  <input
                    className="w-full rounded px-2 py-1 font-mono text-[10px]"
                    style={{ border: `1px solid ${BUILDER.border}` }}
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    disabled={working}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => void savePageEdit(p.id)}
                      className="text-[10px] font-bold"
                      style={{ color: BUILDER.orange }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => setEditingId(null)}
                      className="text-[10px]"
                      style={{ color: BUILDER.muted }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="group flex items-center gap-1 rounded-md px-2 py-1.5"
                  style={{
                    background: active ? "#F4F4F5" : "transparent",
                    outline: active ? `1px solid ${BUILDER.border}` : undefined,
                  }}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelectPage(p)}
                  >
                    <p
                      className="truncate text-[12px] font-medium leading-tight"
                      style={{ color: BUILDER.ink }}
                    >
                      {p.title}
                    </p>
                    <p className="truncate font-mono text-[9px]" style={{ color: BUILDER.faint }}>
                      /{p.slug}
                    </p>
                  </button>
                  <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      title="Move up"
                      disabled={working || idx === 0}
                      onClick={() => void movePage(p.id, "up")}
                      className="px-1 text-[10px] disabled:opacity-30"
                      style={{ color: BUILDER.muted }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      disabled={working || idx === sorted.length - 1}
                      onClick={() => void movePage(p.id, "down")}
                      className="px-1 text-[10px] disabled:opacity-30"
                      style={{ color: BUILDER.muted }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      title="Rename"
                      disabled={working}
                      onClick={() => {
                        setEditingId(p.id);
                        setEditTitle(p.title);
                        setEditSlug(p.slug);
                      }}
                      className="px-1 text-[10px]"
                      style={{ color: BUILDER.muted }}
                    >
                      Edit
                    </button>
                    {sorted.length > 1 ? (
                      <button
                        type="button"
                        title="Delete"
                        disabled={working}
                        onClick={() => void removePage(p.id)}
                        className="px-1 text-[10px] text-red-600"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="space-y-1.5 border-t pt-2" style={{ borderColor: BUILDER.border }}>
          <input
            className="w-full rounded-md px-2 py-1.5 text-xs"
            style={{ border: `1px solid ${BUILDER.border}` }}
            placeholder="Page title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={working}
            autoFocus
          />
          <button
            type="button"
            disabled={working || !newTitle.trim()}
            onClick={() => void addPage()}
            className="w-full rounded-md py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
            style={{ background: BUILDER.ink }}
          >
            {working ? "Saving…" : "Add page"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
