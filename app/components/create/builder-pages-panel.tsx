"use client";

import { useState } from "react";
import { BUILDER } from "@/lib/create/builder-ui";
import { isValidPageSlug, normalizePageSlug } from "@/lib/create/builder-pages";

export type BuilderPageRow = {
  id: string;
  slug: string;
  title: string;
  sort_order: number;
  parent_id?: string | null;
};

export function BuilderPagesPanel({
  projectId,
  pages,
  editPageId,
  previewPageSlug,
  busy = false,
  onSelectPage,
  onRefresh,
  onPagesChange,
  onError,
}: {
  projectId: string;
  pages: BuilderPageRow[];
  editPageId: string;
  previewPageSlug: string;
  busy?: boolean;
  onSelectPage: (page: BuilderPageRow) => void;
  onRefresh: () => Promise<void>;
  /** Optimistic local ordering: page movement must never blank/reload the whole Builder. */
  onPagesChange: (pages: BuilderPageRow[]) => void;
  onError: (message: string | null) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editParentId, setEditParentId] = useState<string>("");
  const [localBusy, setLocalBusy] = useState(false);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);

  const sorted = [...pages].sort((a, b) => a.sort_order - b.sort_order);
  const working = busy || localBusy;

  async function addPage() {
    const title = newTitle.trim();
    const slug = normalizePageSlug(title);
    if (!slug || !title) { onError("Page title is required."); return; }
    if (!isValidPageSlug(slug)) { onError("Use letters, numbers, and hyphens only."); return; }
    setLocalBusy(true);
    onError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { onError(typeof data.error === "string" ? data.error : "Could not add page."); return; }
      setNewTitle(""); setAdding(false);
      await onRefresh();
      if (data.page?.id) onSelectPage(data.page as BuilderPageRow);
    } catch { onError("Network error while adding page."); }
    finally { setLocalBusy(false); }
  }

  async function removePage(pageId: string) {
    if (!confirm("Delete this page and all its sections?")) return;
    setLocalBusy(true); onError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { onError(typeof data.error === "string" ? data.error : "Could not delete page."); return; }
      await onRefresh();
    } catch { onError("Network error while deleting page."); }
    finally { setLocalBusy(false); }
  }

  async function savePageEdit(pageId: string) {
    const title = editTitle.trim();
    const slug = normalizePageSlug(editSlug);
    if (!title || !slug) { onError("Title and slug are required."); return; }
    if (!isValidPageSlug(slug)) { onError("Invalid slug format."); return; }
    setLocalBusy(true); onError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, title, slug, parentId: editParentId || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { onError(typeof data.error === "string" ? data.error : "Could not update page."); return; }
      setEditingId(null);
      await onRefresh();
      if (data.page) onSelectPage(data.page as BuilderPageRow);
    } catch { onError("Network error while updating page."); }
    finally { setLocalBusy(false); }
  }

  async function persistPageOrder(next: BuilderPageRow[], previous: BuilderPageRow[]) {
    const normalized = next.map((page, index) => ({ ...page, sort_order: index }));
    onPagesChange(normalized);
    setLocalBusy(true);
    onError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: normalized.map((page) => page.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onPagesChange(previous);
        onError(typeof data.error === "string" ? data.error : "Could not reorder pages. Your previous order was restored.");
        return;
      }
      const confirmed = Array.isArray(data.pages) ? (data.pages as BuilderPageRow[]) : normalized;
      onPagesChange(confirmed);
    } catch {
      onPagesChange(previous);
      onError("Network error while reordering. Your previous order was restored.");
    } finally {
      setLocalBusy(false);
    }
  }

  async function movePage(pageId: string, direction: "up" | "down") {
    const idx = sorted.findIndex((p) => p.id === pageId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const next = [...sorted];
    [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
    await persistPageOrder(next.map((page, index) => ({ ...page, sort_order: index })), sorted);
  }

  async function dropPage(targetPageId: string) {
    const sourceId = draggedPageId;
    setDraggedPageId(null);
    if (!sourceId || sourceId === targetPageId) return;
    const from = sorted.findIndex((page) => page.id === sourceId);
    const to = sorted.findIndex((page) => page.id === targetPageId);
    if (from < 0 || to < 0) return;
    const next = [...sorted];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    await persistPageOrder(next.map((page, index) => ({ ...page, sort_order: index })), sorted);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: BUILDER.border }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: BUILDER.muted }}>Pages</p>
        <button
          type="button"
          disabled={working}
          onClick={() => { setAdding((v) => !v); setEditingId(null); }}
          className="text-[10px] font-bold"
          style={{ color: BUILDER.orange }}
        >
          {adding ? "Cancel" : "+ New page"}
        </button>
      </div>

      {/* Add page form */}
      {adding ? (
        <div className="px-3 py-2 border-b space-y-1.5" style={{ borderColor: BUILDER.border, background: BUILDER.surfaceMuted }}>
          <input
            className="w-full rounded px-2 py-1 text-xs"
            style={{ border: `1px solid ${BUILDER.border}` }}
            placeholder="Page title (e.g. About, Shop…)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void addPage(); if (e.key === "Escape") setAdding(false); }}
            disabled={working}
            autoFocus
          />
          <button
            type="button"
            disabled={working || !newTitle.trim()}
            onClick={() => void addPage()}
            className="w-full rounded py-1 text-[11px] font-bold text-white disabled:opacity-40"
            style={{ background: BUILDER.ink }}
          >
            {working ? "Adding…" : "Add page"}
          </button>
        </div>
      ) : null}

      {/* Page list */}
      <ul>
        {sorted.map((p, idx) => {
          const active = p.id === editPageId || p.slug === previewPageSlug;
          const editing = editingId === p.id;
          return (
            <li
              key={p.id}
              draggable={!working && !editing}
              onDragStart={(event) => {
                setDraggedPageId(p.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                if (!draggedPageId || draggedPageId === p.id) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                void dropPage(p.id);
              }}
              onDragEnd={() => setDraggedPageId(null)}
              style={{
                borderBottom: `1px solid ${BUILDER.border}`,
                opacity: draggedPageId === p.id ? 0.45 : 1,
                cursor: working || editing ? "default" : "grab",
              }}
            >
              {editing ? (
                /* Inline edit form */
                <div className="px-3 py-2 space-y-1.5" style={{ background: BUILDER.surfaceMuted }}>
                  <input
                    className="w-full rounded px-2 py-1 text-xs"
                    style={{ border: `1px solid ${BUILDER.border}` }}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title"
                    disabled={working}
                    autoFocus
                  />
                  <input
                    className="w-full rounded px-2 py-1 font-mono text-[10px]"
                    style={{ border: `1px solid ${BUILDER.border}` }}
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    placeholder="slug"
                    disabled={working}
                  />
                  <label className="block text-[9px] font-bold uppercase tracking-wider" style={{ color: BUILDER.muted }}>
                    Parent page
                    <select className="mt-1 w-full rounded px-2 py-1 text-xs normal-case font-normal" style={{ border: `1px solid ${BUILDER.border}` }}
                      value={editParentId} onChange={(e) => setEditParentId(e.target.value)} disabled={working}>
                      <option value="">Top level</option>
                      {sorted.filter((candidate) => candidate.id !== p.id).map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>{candidate.title}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-2">
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
                /* Compact single-line row */
                <div
                  className="group flex items-center gap-1 px-3"
                  style={{
                    background: active ? "#EEF2FF" : "transparent",
                    borderLeft: active ? `3px solid ${BUILDER.orange}` : "3px solid transparent",
                    paddingLeft: active ? "9px" : "12px",
                  }}
                >
                  <span
                    aria-hidden
                    className="shrink-0 select-none text-[12px]"
                    style={{ color: BUILDER.muted }}
                    title="Drag to reorder"
                  >
                    ⋮⋮
                  </span>
                  {/* Page title — clicking selects the page to edit */}
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate py-2 text-left text-[12px] font-medium"
                    style={{ color: active ? BUILDER.ink : "#3A3A3A" }}
                    onClick={() => onSelectPage(p)}
                    title={`/${p.slug}`}
                  >
                    {p.parent_id ? "↳ " : ""}{p.title}
                  </button>

                  {/* Hover actions — inline single row */}
                  <div className="flex shrink-0 items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ minWidth: 0 }}>
                    <button
                      type="button"
                      title="Move up"
                      disabled={working || idx === 0}
                      onClick={(e) => { e.stopPropagation(); void movePage(p.id, "up"); }}
                      className="px-1 py-1.5 text-[11px] disabled:opacity-20 leading-none"
                      style={{ color: BUILDER.muted }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      disabled={working || idx === sorted.length - 1}
                      onClick={(e) => { e.stopPropagation(); void movePage(p.id, "down"); }}
                      className="px-1 py-1.5 text-[11px] disabled:opacity-20 leading-none"
                      style={{ color: BUILDER.muted }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      title="Rename / change slug"
                      disabled={working}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(p.id);
                        setEditTitle(p.title);
                        setEditSlug(p.slug);
                        setEditParentId(p.parent_id ?? "");
                        setAdding(false);
                      }}
                      className="px-1 py-1.5 text-[11px] leading-none"
                      style={{ color: BUILDER.muted }}
                      aria-label="Rename page"
                    >
                      ✎
                    </button>
                    {sorted.length > 1 ? (
                      <button
                        type="button"
                        title="Delete page"
                        disabled={working}
                        onClick={(e) => { e.stopPropagation(); void removePage(p.id); }}
                        className="px-1 py-1.5 text-[12px] font-bold leading-none"
                        style={{ color: "#DC2626" }}
                        aria-label="Delete page"
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
    </div>
  );
}
