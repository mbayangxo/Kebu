"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
type Company = {
  id: string;
  name: string;
  kebuId: string;
  role: string;
  activeProjects: number;
  blockedProjects: number;
  myOpenTasks: number;
  myOpenHR: number;
};
export default function Page() {
  const [rows, setRows] = useState<Company[]>([]),
    [stamp, setStamp] = useState(""),
    [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/businesses/portfolio", { cache: "no-store" }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setRows(d.companies);
      setStamp(d.refreshedAt);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load your companies.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <AppShell title="My companies">
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <h1 className="text-3xl font-semibold">My companies</h1>
        <p>
          Each company keeps its own people, files and permissions. This view
          includes only your current company memberships; it does not claim
          shared ownership.
        </p>
        <button
          className="min-h-11 underline"
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh companies
        </button>
        {error && <p role="alert">{error}</p>}
        {loading ? (
          <p role="status">Loading companies…</p>
        ) : (
          rows.map((row) => (
            <article className="rounded-2xl border bg-white p-5" key={row.id}>
              <h2 className="text-xl font-semibold">
                <Link
                  className="underline"
                  href={`/business/${row.id}/workplace`}
                >
                  {row.name}
                </Link>
              </h2>
              <p>
                {row.kebuId} · {row.role}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  [row.activeProjects, "Active projects"],
                  [row.blockedProjects, "Blocked projects"],
                  [row.myOpenTasks, "My open tasks"],
                  [row.myOpenHR, "My open HR requests"],
                ].map(([n, label]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd className="text-2xl font-semibold">{n}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))
        )}
        {!loading && !error && !rows.length && (
          <p>
            No active company memberships.{" "}
            <Link href="/business/new" className="underline">
              Create a business
            </Link>
          </p>
        )}
        {stamp && (
          <p className="text-sm">
            Refreshed {new Date(stamp).toLocaleString()}
          </p>
        )}
      </main>
    </AppShell>
  );
}
