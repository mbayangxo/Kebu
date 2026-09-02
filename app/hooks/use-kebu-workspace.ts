"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  inferWorkspaceFromPath,
  readStoredWorkspace,
  storeWorkspace,
  type KebuWorkspace,
  workspaceHome,
} from "@/lib/navigation/kebu-workspace";

export function useKebuWorkspace() {
  const pathname = usePathname();
  const [workspace, setWorkspaceState] = useState<KebuWorkspace | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredWorkspace();
    const inferred = inferWorkspaceFromPath(pathname);
    const next = stored ?? inferred ?? null;
    setWorkspaceState(next);
    if (!stored && inferred) storeWorkspace(inferred);
    setReady(true);
  }, [pathname]);

  const setWorkspace = useCallback((ws: KebuWorkspace) => {
    storeWorkspace(ws);
    setWorkspaceState(ws);
  }, []);

  return {
    workspace,
    ready,
    homeHref: workspace ? workspaceHome(workspace) : "/start",
    setWorkspace,
  };
}
