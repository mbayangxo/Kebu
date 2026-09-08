"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountWorkspaceContext } from "@/lib/account/workspace-context";

export function useKebuAccountContext() {
  const [context, setContext] = useState<AccountWorkspaceContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/workspace", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load workspace.");
        setContext(null);
        return;
      }
      setContext(data.context ?? null);
    } catch {
      setError("Network error.");
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const switchContext = useCallback(
    async (patch: { mode: "personal" } | { mode: "business"; businessId: string }) => {
      const res = await fetch("/api/me/workspace", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not switch workspace.");
      }
      setContext(data.context ?? null);
      return data.context as AccountWorkspaceContext;
    },
    [],
  );

  return { context, loading, error, reload: load, switchContext };
}
