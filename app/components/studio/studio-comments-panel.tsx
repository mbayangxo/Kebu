"use client";

import { useCallback, useEffect, useState } from "react";
import type { StudioDesignComment } from "@/lib/studio/design-comments";

export function StudioCommentsPanel({
  designId,
  userId,
  isOwner,
}: {
  designId: string;
  userId: string | null;
  isOwner: boolean;
}) {
  const [comments, setComments] = useState<StudioDesignComment[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/create/designs/${designId}/comments`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load comments.");
      return;
    }
    setComments(Array.isArray(data.comments) ? data.comments : []);
    setError(null);
  }, [designId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function post() {
    const text = body.trim();
    if (!text) {
      setError("Write a comment first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/create/designs/${designId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not post.");
        return;
      }
      setBody("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function setResolved(id: string, resolved: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/create/designs/${designId}/comments/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Update failed.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this comment?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/create/designs/${designId}/comments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Delete failed.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  const visible = comments.filter((c) => (showResolved ? true : !c.resolved_at));

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 space-y-3 max-h-[70vh] overflow-auto">
      <div>
        <h3 className="text-sm font-bold">Comments</h3>
        <p className="text-[11px] text-muted mt-0.5">Async feedback — not live cursors.</p>
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void post();
        }}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Leave feedback for collaborators…"
          className="w-full rounded-lg border border-black/10 px-2 py-1.5 text-xs"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
          style={{ background: "#0F0D33" }}
        >
          Post comment
        </button>
      </form>
      <label className="flex items-center gap-2 text-[11px]">
        <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
        Show resolved
      </label>
      {visible.length === 0 ? (
        <p className="text-xs opacity-60">No comments yet.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((c) => {
            const mine = userId && c.author_id === userId;
            return (
              <li key={c.id} className="rounded-lg border border-black/5 px-2 py-2 space-y-1">
                <p className={`text-xs whitespace-pre-wrap ${c.resolved_at ? "opacity-50 line-through" : ""}`}>
                  {c.body}
                </p>
                <p className="text-[10px] text-muted">{new Date(c.created_at).toLocaleString()}</p>
                <div className="flex flex-wrap gap-2">
                  {(isOwner || mine) && !c.resolved_at ? (
                    <button
                      type="button"
                      className="text-[11px] font-bold underline"
                      disabled={busy}
                      onClick={() => void setResolved(c.id, true)}
                    >
                      Resolve
                    </button>
                  ) : null}
                  {(isOwner || mine) && c.resolved_at ? (
                    <button
                      type="button"
                      className="text-[11px] font-bold underline"
                      disabled={busy}
                      onClick={() => void setResolved(c.id, false)}
                    >
                      Reopen
                    </button>
                  ) : null}
                  {isOwner || mine ? (
                    <button
                      type="button"
                      className="text-[11px] font-bold underline text-red-700"
                      disabled={busy}
                      onClick={() => void remove(c.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
