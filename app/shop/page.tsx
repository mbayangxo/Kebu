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
  pendingOrders: number;
};

function SkeletonCard() {
  return (
    <li
      className="rounded-2xl px-4 py-4 animate-pulse"
      style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded w-2/5" style={{ background: KEBU.border }} />
          <div className="h-3 rounded w-1/3" style={{ background: KEBU.border }} />
          <div className="h-3 rounded w-1/2" style={{ background: KEBU.border }} />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-full" style={{ background: KEBU.border }} />
          <div className="h-8 w-24 rounded-full" style={{ background: KEBU.border }} />
        </div>
      </div>
    </li>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "live" ? "#10B981" : status === "draft" ? KEBU.muted : KEBU.orange;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
      {status}
    </span>
  );
}

function waShareHref(subdomain: string, productName?: string): string {
  const url = `https://${subdomain}.kebu.africa`;
  const text = productName ? `Check out ${productName}: ${url}` : `Shop at ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function ShopCard({ p, stats }: { p: ProjectRow; stats: Pulse | undefined }) {
  const hasPending = (stats?.pendingOrders ?? 0) > 0;
  const url = p.subdomain ? `${p.subdomain}.kebu.africa` : null;

  return (
    <li
      className="rounded-2xl px-4 py-4"
      style={{
        background: KEBU.white,
        border: hasPending ? `1.5px solid ${KEBU.orange}` : `1px solid ${KEBU.border}`,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold truncate" style={{ color: KEBU.black }}>
              {p.title}
            </p>
            <StatusDot status={p.status} />
            {hasPending && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                {stats!.pendingOrders} pending
              </span>
            )}
          </div>

          {url && (
            <p className="text-[11px] font-mono mt-0.5" style={{ color: KEBU.muted }}>
              {url}
            </p>
          )}

          {stats ? (
            <div className="mt-2 flex flex-wrap gap-3">
              <span className="text-xs tabular-nums font-semibold" style={{ color: KEBU.black }}>
                {stats.paidRevenue}
              </span>
              <span className="text-xs tabular-nums" style={{ color: KEBU.muted }}>
                {stats.orders} orders
              </span>
              <span className="text-xs tabular-nums" style={{ color: KEBU.muted }}>
                {stats.pageviews} views
              </span>
              <span className="text-[10px]" style={{ color: KEBU.faint }}>
                30 days
              </span>
            </div>
          ) : (
            <div className="mt-2 h-3 rounded w-2/5 animate-pulse" style={{ background: KEBU.border }} />
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href={`/shop/${p.id}?tab=orders`}
            className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
            style={{ background: KEBU.orange, color: KEBU.white }}
          >
            Orders
          </Link>
          <Link
            href={`/shop/${p.id}?tab=overview`}
            className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
            style={{ background: KEBU.black, color: KEBU.white }}
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Quick actions row */}
      <div className="mt-3 pt-3 flex flex-wrap gap-3" style={{ borderTop: `1px solid ${KEBU.border}` }}>
        <Link
          href={`/shop/${p.id}?tab=products`}
          className="text-[11px] font-semibold"
          style={{ color: KEBU.muted }}
        >
          + Add product
        </Link>
        <Link
          href={`/create/${p.id}`}
          className="text-[11px] font-semibold"
          style={{ color: KEBU.muted }}
        >
          Edit site
        </Link>
        {url && (
          <a
            href={waShareHref(p.subdomain!)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: "#25D366" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.524 3.657 1.435 5.164L2.016 22l4.948-1.399A9.936 9.936 0 0011.999 22c5.522 0 10-4.478 10-10S17.521 2 12 2zm0 18a7.953 7.953 0 01-4.054-1.112l-.29-.172-3.008.85.854-3.012-.189-.305A7.954 7.954 0 014.046 12c0-4.41 3.586-7.999 7.953-7.999 4.368 0 7.953 3.589 7.953 7.999S16.367 20 12 20z"/>
            </svg>
            Share on WhatsApp
          </a>
        )}
        {url && (
          <a
            href={`https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold"
            style={{ color: KEBU.muted }}
          >
            View live →
          </a>
        )}
      </div>
    </li>
  );
}

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
              orders: { total: number; revenuePaidXof: number; pending?: number };
              traffic: { pageviews: number | null };
            };
            next[p.id] = {
              orders: s.orders.total,
              paidRevenue: formatXof(s.orders.revenuePaidXof),
              pageviews: s.traffic.pageviews == null ? "—" : String(s.traffic.pageviews),
              pendingOrders: s.orders.pending ?? 0,
            };
          } catch {
            /* pulse optional */
          }
        }),
      );
      setPulse(next);
    } catch {
      setError("Network error. Check your connection and retry.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPending = Object.values(pulse).reduce((s, p) => s + (p.pendingOrders ?? 0), 0);

  return (
    <AppShell title="Kebu Shop">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
          Sell
        </p>
        <div className="flex items-end justify-between gap-3 mt-2 mb-1">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
            Your shops
            {totalPending > 0 && (
              <span
                className="ml-2 text-base font-bold px-2 py-0.5 rounded-full align-middle"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                {totalPending} to fulfill
              </span>
            )}
          </h1>
          <button onClick={() => void load()} className="text-xs font-bold pb-1" style={{ color: KEBU.orange }}>
            Refresh
          </button>
        </div>
        <p className="max-w-xl text-sm leading-relaxed mb-5" style={{ color: KEBU.muted }}>
          Each store runs inside a website. Open a dashboard to manage orders, products, and analytics.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/create/new?type=store"
            className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
            style={{ background: KEBU.orange }}
          >
            + New storefront
          </Link>
          <Link
            href="/create"
            className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
            style={{ background: KEBU.cream, color: KEBU.black, border: `1px solid ${KEBU.border}` }}
          >
            Website builder
          </Link>
        </div>

        {error && (
          <div
            className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "#FFF0EE", border: `1px solid ${KEBU.red}` }}
            role="alert"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill={KEBU.red}>
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            <p className="text-sm" style={{ color: KEBU.red }}>{error}</p>
          </div>
        )}

        {loading ? (
          <ul className="space-y-3">
            {[1, 2].map((n) => <SkeletonCard key={n} />)}
          </ul>
        ) : projects.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
          >
            {/* Shop bag icon */}
            <svg className="mx-auto mb-4" width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="14" fill={KEBU.border} />
              <path
                d="M16 18h12l-2 10H18L16 18z"
                stroke={KEBU.muted}
                strokeWidth="1.5"
                fill="none"
                opacity=".6"
              />
              <path
                d="M18.5 18a3.5 3.5 0 017 0"
                stroke={KEBU.muted}
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
                opacity=".6"
              />
            </svg>
            <p className="font-bold mb-1" style={{ color: KEBU.black }}>No storefront yet</p>
            <p className="text-sm mb-4 max-w-xs mx-auto" style={{ color: KEBU.muted }}>
              Create a website and turn on the shop to start selling. Free plan includes up to 50 products.
            </p>
            <Link
              href="/create/new?type=store"
              className="inline-flex px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              Create a storefront
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => (
              <ShopCard key={p.id} p={p} stats={pulse[p.id]} />
            ))}
          </ul>
        )}

        {/* Mobile money tip */}
        {!loading && projects.length > 0 && (
          <div
            className="mt-6 rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
          >
            <span className="text-lg shrink-0">📱</span>
            <div>
              <p className="text-[11px] font-bold mb-0.5" style={{ color: KEBU.black }}>
                Accept Wave, Orange Money &amp; JOKO
              </p>
              <p className="text-[11px]" style={{ color: KEBU.muted }}>
                Mobile money is the #1 payment method in West Africa. Enable it in your shop settings — customers
                pay instantly, no card required.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
