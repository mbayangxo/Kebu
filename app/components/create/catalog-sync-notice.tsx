"use client";

import type { CatalogSyncState } from "@/lib/create/catalog-sync-state";

export function CatalogSyncNotice({ status, busy, retry }: {
  status: CatalogSyncState | null;
  busy: boolean;
  retry: () => Promise<void>;
}) {
  if (status?.status !== "pending") return null;
  return (
    <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
      <p>{status.message}</p>
      <button type="button" className="mt-2 font-semibold underline disabled:opacity-50" disabled={busy}
        onClick={() => void retry()}>
        {busy ? "Syncing website draft…" : "Retry website sync"}
      </button>
    </div>
  );
}
