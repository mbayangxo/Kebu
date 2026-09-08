"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";
import { formatXof } from "@/lib/shop/commerce-insights";

type ProjectRow = {
  id: string;
  title: string;
  project_type: string;
  status: string;
  subdomain?: string | null;
  updated_at: string;
};

type Pulse = {
  orders: number;
  paidRevenue: string;
  pageviews: string;
};

/**
 * Kebu Shop — separate from the website builder.
 * Hub lists every storefront with a 30-day pulse so you can switch and compare.
 */
export default function ShopHubPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [pulse, setPulse] = useState<Record<string, Pulse>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/shop");
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load shops.");
        setProjects([]);
        return;
      }
      const rows = (Array.isArray(data.projects) ? data.projects : []) as ProjectRow[];
      const shops = rows.filter((p) => p.project_type === "website");
      setProjects(shops);

      const next: Record<string, Pulse> = {};
      await Promise.all(
        shops.slice(0, 12).map(async (p) => {
          try {
            const a = await fetch(`/api/projects/${p.id}/shop-analytics?days=30`, {
              credentials: "include",
            });
            const body = await a.json().catch(() => ({}));
            if (!a.ok || !body.summary) return;
            const s = body.summary as {
              orders: { total: number; revenuePaidXof: number };
              traffic: { pageviews: number | null };
            };
            next[p.id] = {
              orders: s.orders.total,
              paidRevenue: formatXof(s.orders.revenuePaidXof),
              pageviews: s.traffic.pageviews == null ? "—" : String(s.traffic.pageviews),
            };
          } catch {
            /* pulse optional */
          }
        }),
      );
      setPulse(next);
    } catch {
      setError("Network error. Retry.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell title="Kebu Shop">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
          Sell · separate from the website builder
        </p>
        <h1
          className="mt-2 text-3xl font-bold"
          style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
        >
          Your shops
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          Each store has its own dashboard, analytics, orders, and team. Open one to run it — switch stores
          anytime from the header.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/create"
            className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
            style={{ background: KEBU.cream, color: KEBU.black, border: `1px solid ${KEBU.border}` }}
          >
            Website builder
          </Link>
          <Link
            href="/create/new"
            className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
            style={{ background: KEBU.black }}
          >
            New site to sell from
          </Link>
        </div>

        {error ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {loading ? (
          <p className="mt-8 text-sm" style={{ color: KEBU.muted }}>
            Loading your shops…
          </p>
        ) : projects.length === 0 ? (
          <div
            className="mt-8 rounded-2xl p-6 text-center"
            style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
          >
            <p className="font-semibold" style={{ color: KEBU.black }}>
              No storefront yet
            </p>
            <p className="mt-2 text-sm" style={{ color: KEBU.muted }}>
              Create a website first, then open Shop to add products.
            </p>
            <Link
              href="/create/new"
              className="mt-4 inline-block rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white"
              style={{ background: KEBU.orange }}
            >
              Create a site
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {projects.map((p) => {
              const stats = pulse[p.id];
              return (
                <li
                  key={p.id}
                  className="rounded-2xl bg-white px-4 py-4"
                  style={{ border: `1px solid ${KEBU.border}` }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold truncate" style={{ color: KEBU.black }}>
                        {p.title}
                      </p>
                      <p className="text-xs font-mono mt-0.5" style={{ color: KEBU.muted }}>
                        {p.subdomain ? `${p.subdomain}.kebu.africa` : "No address yet"} · {p.status}
                      </p>
                      {stats ? (
                        <p className="mt-2 text-xs tabular-nums" style={{ color: KEBU.muted }}>
                          30d · {stats.orders} orders · {stats.paidRevenue} paid · {stats.pageviews}{" "}
                          views
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/shop/${p.id}?tab=overview`}
                        className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
                        style={{ background: KEBU.orange }}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href={`/create/${p.id}`}
                        className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
                        style={{ background: KEBU.black, color: KEBU.white }}
                      >
                        Edit website
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
