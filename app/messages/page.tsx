"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";

type SiteRow = { id: string; title: string; subdomain: string | null };
type ThreadRow = {
  id: string;
  projectId: string;
  siteTitle: string;
  subject: string | null;
  status: string;
  last_message_at: string | null;
};

/** Cross-site shop DM inbox — end-to-end on existing shop_message_threads. */
export default function MessagesInboxPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sitesRes = await fetch("/api/projects", { credentials: "include" });
      const sitesData = await sitesRes.json().catch(() => ({}));
      if (sitesRes.status === 401) {
        router.replace("/login?next=/messages");
        return;
      }
      if (!sitesRes.ok) {
        setError(typeof sitesData.error === "string" ? sitesData.error : "Could not load sites.");
        return;
      }
      const sites = (Array.isArray(sitesData.projects) ? sitesData.projects : [])
        .filter((p: { project_type?: string }) => p.project_type === "website")
        .map((p: { id: string; title?: string; subdomain?: string | null }) => ({
          id: p.id,
          title: p.title || "Untitled site",
          subdomain: p.subdomain ?? null,
        })) as SiteRow[];

      const collected: ThreadRow[] = [];
      await Promise.all(
        sites.slice(0, 20).map(async (site) => {
          const res = await fetch(`/api/projects/${site.id}/messages`, { credentials: "include" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return;
          const list = Array.isArray(data.threads) ? data.threads : [];
          for (const t of list) {
            collected.push({
              id: t.id as string,
              projectId: site.id,
              siteTitle: site.title,
              subject: (t.subject as string | null) ?? null,
              status: String(t.status ?? "open"),
              last_message_at: (t.last_message_at as string | null) ?? null,
            });
          }
        }),
      );
      collected.sort((a, b) => String(b.last_message_at ?? "").localeCompare(String(a.last_message_at ?? "")));
      setThreads(collected);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell title="Messages">
      <main className="max-w-2xl mx-auto px-5 py-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: KEBU.orange }}>
          My Space
        </p>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          Messages
        </h1>
        <p className="text-sm mb-6" style={{ color: KEBU.muted }}>
          Customer conversations from your shops. Reply inside each site’s Shop messages panel.
        </p>
        <Link href="/business?tab=messages" className="text-xs font-bold underline" style={{ color: KEBU.orange }}>
          ← Back to My Space
        </Link>

        {loading ? <p className="mt-6 text-sm" style={{ color: KEBU.muted }}>Loading inbox…</p> : null}
        {error ? (
          <p className="mt-6 text-sm" role="alert" style={{ color: KEBU.red }}>
            {error}
          </p>
        ) : null}

        {!loading && threads.length === 0 ? (
          <p className="mt-6 text-sm" style={{ color: KEBU.muted }}>
            No shop messages yet. When customers message a store, threads appear here.{" "}
            <Link href={MY_SITES_HREF} className="font-semibold underline">
              My Sites
            </Link>
          </p>
        ) : null}

        <ul className="mt-6 space-y-2">
          {threads.map((t) => (
            <li key={`${t.projectId}-${t.id}`}>
              <Link
                href={`/shop/${t.projectId}?tab=messages&thread=${t.id}`}
                className="block rounded-xl px-4 py-3"
                style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
              >
                <p className="text-sm font-bold">{t.subject || "Customer message"}</p>
                <p className="text-[11px] mt-1" style={{ color: KEBU.muted }}>
                  {t.siteTitle} · {t.status}
                  {t.last_message_at ? ` · ${new Date(t.last_message_at).toLocaleString()}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </AppShell>
  );
}
