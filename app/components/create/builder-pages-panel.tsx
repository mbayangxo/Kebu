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
  const [newSlug, setNewSlug] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [localBusy, setLocalBusy] = useState(false);

  const sorted = [...pages].sort((a, b) => a.sort_order - b.sort_order);
  const working = busy || localBusy;

  async function addPage() {
    const slug = normalizePageSlug(newSlug || newTitle);
    const title = newTitle.trim();
    if (!slug || !title) {
      onError("Page title and slug are required.");
      return;
    }
    if (!isValidPageSlug(slug)) {
      onError("Use lowercase letters, numbers, and hyphens only (e.g. shop, about-may).");
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
      setNewSlug("");
      await onRefresh();
      if (data.page?.id) {
        onSelectPage(data.page as BuilderPageRow);
      }
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
    <div className="rounded-2xl p-4 space-y-4" style={{ background: BUILDER.surface, border: `1px solid ${BUILDER.border}` }}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: BUILDER.orange }}>
          Pages
        </p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: BUILDER.muted }}>
          Add, rename, reorder, and delete pages. Changes save to your draft — publish when the live site should update.
        </p>
      </div>

      <ul className="space-y-2">
        {sorted.map((p, idx) => {
          const active = p.id === editPageId || p.slug === previewPageSlug;
          const editing = editingId === p.id;
          return (
            <li
              key={p.id}
              className="rounded-xl p-3"
              style={{
                background: active ? "#FFF4EC" : BUILDER.surfaceMuted,
                border: `1px solid ${active ? BUILDER.orange : BUILDER.border}`,
              }}
            >
              {editing ? (
                <div className="space-y-2">
                  <input
                    className="w-full text-xs rounded-lg px-2 py-1.5"
                    style={{ border: `1px solid ${BUILDER.border}` }}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Page title"
                    disabled={working}
                  />
                  <input
                    className="w-full text-xs rounded-lg px-2 py-1.5 font-mono"
                    style={{ border: `1px solid ${BUILDER.border}` }}
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    placeholder="slug"
                    disabled={working}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => void savePageEdit(p.id)}
                      className="rounded-full px-3 py-1 text-[10px] font-bold text-white"
                      style={{ background: BUILDER.orange }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => setEditingId(null)}
                      className="rounded-full px-3 py-1 text-[10px] font-semibold"
                      style={{ color: BUILDER.muted }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelectPage(p)}
                  >
                    <p className="text-xs font-semibold truncate" style={{ color: BUILDER.ink }}>
                      {p.title}
                    </p>
                    <p className="text-[10px] font-mono opacity-60">/{p.slug}</p>
                  </button>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      title="Move up"
                      disabled={working || idx === 0}
                      onClick={() => void movePage(p.id, "up")}
                      className="text-[10px] opacity-60 hover:opacity-100 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      disabled={working || idx === sorted.length - 1}
                      onClick={() => void movePage(p.id, "down")}
                      className="text-[10px] opacity-60 hover:opacity-100 disabled:opacity-30"
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
                      className="text-[10px] opacity-60 hover:opacity-100"
                    >
                      Edit
                    </button>
                    {sorted.length > 1 ? (
                      <button
                        type="button"
                        title="Delete"
                        disabled={working}
                        onClick={() => void removePage(p.id)}
                        className="text-[10px] text-red-600 opacity-70 hover:opacity-100"
                      >
                        Del
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="grid gap-2 pt-2 border-t" style={{ borderColor: BUILDER.border }}>
        <input
          className="w-full text-xs rounded-lg px-2 py-1.5"
          style={{ border: `1px solid ${BUILDER.border}` }}
          placeholder="Page title (e.g. Shop)"
          value={newTitle}
          onChange={(e) => {
            setNewTitle(e.target.value);
            if (!newSlug.trim()) setNewSlug(normalizePageSlug(e.target.value));
          }}
          disabled={working}
        />
        <input
          className="w-full text-xs rounded-lg px-2 py-1.5 font-mono"
          style={{ border: `1px solid ${BUILDER.border}` }}
          placeholder="slug (e.g. shop)"
          value={newSlug}
          onChange={(e) => setNewSlug(e.target.value)}
          disabled={working}
        />
        <button
          type="button"
          disabled={working || !newTitle.trim()}
          onClick={() => void addPage()}
          className="w-full rounded-full py-2 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: BUILDER.orange }}
        >
          {working ? "Saving…" : "Add page"}
        </button>
      </div>
    </div>
  );
}
