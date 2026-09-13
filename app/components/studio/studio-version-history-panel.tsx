"use client";

import { useCallback, useEffect, useState } from "react";
import type { StudioDesignVersionMeta } from "@/lib/studio/design-versions";

export function StudioVersionHistoryPanel({
  designId,
  canEdit,
  onRestored,
}: {
  designId: string;
  canEdit: boolean;
  onRestored: () => void;
}) {
  const [versions, setVersions] = useState<StudioDesignVersionMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [missingMigration, setMissingMigration] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/create/designs/${designId}/versions`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 503) {
      setMissingMigration(true);
      setVersions([]);
      setError("Version history is not available yet.");
      return;
    }
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load versions.");
      return;
    }
    setMissingMigration(false);
    setVersions(Array.isArray(data.versions) ? data.versions : []);
    setError(null);
  }, [designId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveNamed() {
    if (!canEdit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/create/designs/${designId}/versions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || "Named version" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save version.");
        return;
      }
      setLabel("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function restore(versionId: string) {
    if (!canEdit) return;
    if (!window.confirm("Restore this version? Your current canvas is saved first as “Before restore”.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/create/designs/${designId}/versions/restore`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Restore failed.");
        return;
      }
      onRestored();
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 space-y-3 max-h-[70vh] overflow-auto">
      <div>
        <h3 className="text-sm font-bold">Version history</h3>
        <p className="text-[11px] text-muted mt-0.5">
          Autosave checkpoints (~90s) plus named saves. Undo in the editor is separate.
        </p>
      </div>

      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {missingMigration ? null : (
        <>
          {canEdit ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void saveNamed();
              }}
            >
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Name this version"
                maxLength={120}
                className="flex-1 rounded-lg border border-black/10 px-2 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
                style={{ background: "#0F0D33" }}
              >
                Save
              </button>
            </form>
          ) : null}

          {versions.length === 0 ? (
            <p className="text-xs opacity-60">No saved versions yet. Keep editing — checkpoints appear after autosave.</p>
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-black/5 px-2 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {v.label || (v.source === "auto" ? "Autosave" : v.source)}
                    </p>
                    <p className="text-[10px] text-muted">
                      {new Date(v.created_at).toLocaleString()} · {v.source}
                    </p>
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="text-[11px] font-bold underline shrink-0"
                      onClick={() => void restore(v.id)}
                    >
                      Restore
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
