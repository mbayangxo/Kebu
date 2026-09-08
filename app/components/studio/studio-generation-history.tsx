"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type GenerationRun = {
  id: string;
  prompt: string;
  business_name: string;
  used_ai: boolean;
  fallback: boolean;
  design_ids: string[];
  created_at: string;
};

/** Recent Studio AI packs — reopen first design; history from migration 070. */
export function StudioGenerationHistory() {
  const [runs, setRuns] = useState<GenerationRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/studio/generate", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Could not load history.");
          setRuns([]);
          return;
        }
        setRuns(Array.isArray(data.runs) ? data.runs : []);
        setError(null);
      } catch {
        if (!cancelled) setError("Could not load history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm opacity-60">Loading AI history…</p>;
  }

  if (error) {
    return (
      <p className="text-sm rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
        {error}
      </p>
    );
  }

  if (!runs.length) {
    return (
      <p className="text-sm opacity-60">
        No AI campaigns yet.{" "}
        <Link href="/studio/new" className="underline">
          Generate a pack
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {runs.map((run) => {
        const firstId = run.design_ids?.[0];
        return (
          <li
            key={run.id}
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 flex flex-wrap items-start justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold line-clamp-2">{run.prompt}</p>
              <p className="text-[11px] opacity-60 mt-1">
                {new Date(run.created_at).toLocaleString()} · {run.design_ids?.length ?? 0} designs ·{" "}
                {run.used_ai ? "AI" : "Template fallback"}
                {run.business_name ? ` · ${run.business_name}` : ""}
              </p>
            </div>
            {firstId ? (
              <Link
                href={`/studio/${firstId}`}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-white"
                style={{ background: "#0F0D33" }}
              >
                Open pack
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
