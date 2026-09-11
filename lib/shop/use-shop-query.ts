"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

const cache = new Map<string, { data: unknown; ts: number }>();
const TTL_MS = 30_000; // 30 s

/**
 * Shared data-fetching hook for all shop panels.
 *
 * - Caches responses in memory for 30 s to avoid cold-network hits on every tab switch.
 * - Deduplicates in-flight requests to the same URL.
 * - Returns { data, loading, error, reload }.
 *
 * Usage:
 *   const { data, loading, error, reload } = useShopQuery<Expense[]>(
 *     `/api/projects/${projectId}/expenses`
 *   );
 */
export function useShopQuery<T>(url: string | null, opts?: { skip?: boolean }) {
  const [state, setState] = useState<QueryState<T>>({ data: null, loading: true, error: null });
  const inFlight = useRef<AbortController | null>(null);

  const load = useCallback(
    async (bust = false) => {
      if (!url || opts?.skip) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }

      if (!bust) {
        const cached = cache.get(url);
        if (cached && Date.now() - cached.ts < TTL_MS) {
          setState({ data: cached.data as T, loading: false, error: null });
          return;
        }
      }

      inFlight.current?.abort();
      const ctrl = new AbortController();
      inFlight.current = ctrl;

      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(url, { credentials: "include", signal: ctrl.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as T;
        if (!ctrl.signal.aborted) {
          cache.set(url, { data: json, ts: Date.now() });
          setState({ data: json, loading: false, error: null });
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
      }
    },
    [url, opts?.skip],
  );

  useEffect(() => {
    load();
    return () => { inFlight.current?.abort(); };
  }, [load]);

  const reload = useCallback(() => load(true), [load]);

  return { ...state, reload };
}

/** Invalidate the cache for a URL (call after a mutation). */
export function invalidateShopQuery(url: string) {
  cache.delete(url);
}
