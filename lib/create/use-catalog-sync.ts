"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { catalogSyncStateSchema, CATALOG_SYNC_PENDING, type CatalogSyncState } from "@/lib/create/catalog-sync-state";

export function useCatalogSync(projectId: string) {
  const [state, setState] = useState<{ projectId: string; status: CatalogSyncState } | null>(null);
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
  const generation = useRef(0);
  const currentProject = useRef(projectId);
  useLayoutEffect(() => { currentProject.current = projectId; }, [projectId]);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const record = useCallback((value: unknown) => {
    if (currentProject.current !== projectId) return;
    generation.current++;
    setBusyProjectId(null);
    const parsed = catalogSyncStateSchema.safeParse(value);
    setState({ projectId, status: parsed.success ? parsed.data : CATALOG_SYNC_PENDING });
  }, [projectId]);
  const check = useCallback(async (retry = false) => {
    if (!projectId) return;
    const request = ++generation.current;
    let status: CatalogSyncState = {
      status: "pending", message: "Could not confirm the website draft sync. Retry sync before publishing.",
    };
    try {
      const response = await fetch(`/api/projects/${projectId}/catalog-sync`, {
        method: retry ? "POST" : "GET", credentials: "include", cache: "no-store",
      });
      const data: unknown = await response.json();
      const parsed = catalogSyncStateSchema.safeParse(
        data && typeof data === "object" && "catalogSync" in data ? data.catalogSync : undefined,
      );
      if (response.ok && parsed.success) status = parsed.data;
    } catch {
      // Catalog writes are not repeated when only their website projection is uncertain.
    } finally {
      if (request === generation.current) {
        setState({ projectId, status });
        setBusyProjectId(null);
      }
    }
  }, [projectId]);
  useEffect(() => {
    void check();
    return invalidate;
  }, [check, invalidate]);
  return {
    status: state?.projectId === projectId ? state.status : null,
    busy: Boolean(projectId) && busyProjectId === projectId,
    record,
    retry: () => { setBusyProjectId(projectId); return check(true); },
  };
}
