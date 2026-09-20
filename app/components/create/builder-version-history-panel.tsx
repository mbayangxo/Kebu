"use client";

import { useCallback, useEffect, useState } from "react";
import { GalaxyButton, GalaxyEmptyState, GalaxyStatus } from "@/app/components/galaxy/editor-primitives";

type WebsiteVersion = {
  id: string;
  version_number: number;
  label: string | null;
  created_at: string;
  created_by: string | null;
};

export function BuilderVersionHistoryPanel({
  projectId,
  onRestored,
  onError,
}: {
  projectId: string;
  onRestored: () => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const [versions, setVersions] = useState<WebsiteVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = (await res.json()) as { versions?: WebsiteVersion[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Could not load version history.");
      setVersions(json.versions ?? []);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not load version history.");
    } finally {
      setLoading(false);
    }
  }, [onError, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function restore(version: WebsiteVersion) {
    if (restoringId) return;
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(
            `Restore version ${version.version_number} to your draft? Your current draft will be checkpointed first. Your live site will not change until you publish again.`,
          );
    if (!confirmed) return;

    setRestoringId(version.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions/restore`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ versionId: version.id }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not restore version.");
      await onRestored();
      await load();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not restore version.");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="space-y-3 px-3 py-3">
      <div>
        <p className="text-[13px] font-semibold text-black">Version history</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-black/50">
          Restore a prior draft safely. Kebu checkpoints your current draft first, and your live site stays unchanged until you publish again.
        </p>
      </div>

      {loading ? (
        <GalaxyStatus tone="neutral">Loading versions…</GalaxyStatus>
      ) : versions.length === 0 ? (
        <GalaxyEmptyState title="No saved versions yet" detail="Kebu will show recoverable draft checkpoints here as you work." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-black/[.08] bg-white">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{ borderTop: index === 0 ? undefined : "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-black/80">
                  {version.label || `Version ${version.version_number}`}
                </p>
                <p className="mt-0.5 text-[10px] text-black/45">
                  v{version.version_number} · {new Date(version.created_at).toLocaleString()}
                </p>
              </div>
              <GalaxyButton
                disabled={Boolean(restoringId)}
                onClick={() => void restore(version)}
              >
                {restoringId === version.id ? "Restoring…" : "Restore"}
              </GalaxyButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
