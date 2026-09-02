"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

type ProjectRow = {
  id: string;
  title: string;
  project_type: string;
  status: string;
  subdomain?: string | null;
  updated_at: string;
};

/**
 * Kebu Shop — separate from the website builder (Shopify-style).
 * Catalog, WhatsApp order phone, and sell settings live here — not inside the site editor.
 */
export default function ShopHubPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
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
      setProjects(rows.filter((p) => p.project_type === "website"));
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
          Your shop
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          Like Shopify: products and orders live here. Your website builder stays for pages and design.
          Pick a site storefront, then add products buyers can order (WhatsApp today; JOKO checkout next).
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
            {projects.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-4"
                style={{ border: `1px solid ${KEBU.border}` }}
              >
                <div className="min-w-0">
                  <p className="font-bold truncate" style={{ color: KEBU.black }}>
                    {p.title}
                  </p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: KEBU.muted }}>
                    {p.subdomain ? `${p.subdomain}.kebu.africa` : "No address yet"} · {p.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/shop/${p.id}`}
                    className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
                    style={{ background: KEBU.orange }}
                  >
                    Open shop
                  </Link>
                  <Link
                    href={`/create/${p.id}`}
                    className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
                    style={{ background: KEBU.black, color: KEBU.white }}
                  >
                    Edit website
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
