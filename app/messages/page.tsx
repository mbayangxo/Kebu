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
  unread_count?: number;
  customer_name?: string | null;
  customer_whatsapp?: string | null;
};

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function waHref(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

function SkeletonThread() {
  return (
    <li
      className="rounded-xl px-4 py-3 animate-pulse"
      style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full shrink-0" style={{ background: KEBU.border }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded w-2/3" style={{ background: KEBU.border }} />
          <div className="h-2.5 rounded w-1/2" style={{ background: KEBU.border }} />
        </div>
      </div>
    </li>
  );
}

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    open: { bg: "#FFF3E0", fg: "#E65100" },
    resolved: { bg: "#E8F5E9", fg: "#2E7D32" },
    pending: { bg: "#EDE7F6", fg: "#512DA8" },
  };
  const c = colors[status] ?? { bg: KEBU.cream, fg: KEBU.muted };
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.fg }}
    >
      {status}
    </span>
  );
}

function ThreadCard({ t }: { t: ThreadRow }) {
  const hasUnread = (t.unread_count ?? 0) > 0;
  const initials = t.customer_name
    ? t.customer_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <li>
      <Link
        href={`/shop/${t.projectId}?tab=messages&thread=${t.id}`}
        className="flex items-start gap-3 rounded-xl px-4 py-3 transition-opacity hover:opacity-80"
        style={{
          background: hasUnread ? "#FFF8F2" : KEBU.white,
          border: hasUnread ? `1.5px solid ${KEBU.orange}` : `1px solid ${KEBU.border}`,
        }}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: hasUnread ? KEBU.orange : KEBU.cream, color: hasUnread ? KEBU.white : KEBU.muted }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold truncate" style={{ color: KEBU.black }}>
              {t.subject || t.customer_name || "Customer message"}
            </p>
            <span className="text-[10px] shrink-0" style={{ color: KEBU.faint }}>
              {relativeTime(t.last_message_at)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px]" style={{ color: KEBU.muted }}>
              {t.siteTitle}
            </span>
            <StatusChip status={t.status} />
            {hasUnread && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                {t.unread_count} new
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* WhatsApp handoff — shown when customer phone is known */}
      {t.customer_whatsapp && (
        <a
          href={waHref(t.customer_whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 ml-12 mt-1 text-[11px] font-semibold"
          style={{ color: "#25D366" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.524 3.657 1.435 5.164L2.016 22l4.948-1.399A9.936 9.936 0 0011.999 22c5.522 0 10-4.478 10-10S17.521 2 12 2zm0 18a7.953 7.953 0 01-4.054-1.112l-.29-.172-3.008.85.854-3.012-.189-.305A7.954 7.954 0 014.046 12c0-4.41 3.586-7.999 7.953-7.999 4.368 0 7.953 3.589 7.953 7.999S16.367 20 12 20z"/>
          </svg>
          Continue on WhatsApp
        </a>
      )}
    </li>
  );
}

function EmptyState() {
  return (
    <div
      className="mt-8 rounded-2xl p-8 text-center"
      style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
    >
      {/* Chat bubble icon */}
      <svg className="mx-auto mb-4" width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="12" fill={KEBU.border} />
        <path
          d="M10 14a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H14l-4 4V14z"
          fill={KEBU.muted}
          opacity=".5"
        />
      </svg>
      <p className="font-bold mb-1" style={{ color: KEBU.black }}>No messages yet</p>
      <p className="text-sm mb-4 max-w-xs mx-auto" style={{ color: KEBU.muted }}>
        When customers message a store or contact form, conversations appear here.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link
          href={MY_SITES_HREF}
          className="inline-flex justify-center px-4 py-2 rounded-full text-xs font-bold"
          style={{ background: KEBU.black, color: KEBU.white }}
        >
          My Sites
        </Link>
        <Link
          href="/create/new?type=store"
          className="inline-flex justify-center px-4 py-2 rounded-full text-xs font-bold"
          style={{ background: KEBU.cream, color: KEBU.black, border: `1px solid ${KEBU.border}` }}
        >
          Add a shop
        </Link>
      </div>
    </div>
  );
}

export default function MessagesInboxPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

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
              unread_count: typeof t.unread_count === "number" ? t.unread_count : 0,
              customer_name: (t.customer_name as string | null) ?? null,
              customer_whatsapp: (t.customer_whatsapp as string | null) ?? null,
            });
          }
        }),
      );
      collected.sort((a, b) => String(b.last_message_at ?? "").localeCompare(String(a.last_message_at ?? "")));
      setThreads(collected);
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = filter === "all" ? threads : threads.filter((t) => t.status === filter);
  const totalUnread = threads.reduce((s, t) => s + (t.unread_count ?? 0), 0);

  return (
    <AppShell title="Messages">
      <main className="max-w-2xl mx-auto px-5 py-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: KEBU.orange }}>
          My Space
        </p>
        <div className="flex items-end justify-between gap-3 mb-1">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
            Messages
            {totalUnread > 0 && (
              <span
                className="ml-2 text-base font-bold px-2 py-0.5 rounded-full align-middle"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                {totalUnread}
              </span>
            )}
          </h1>
          <button
            onClick={() => void load()}
            className="text-xs font-bold pb-1"
            style={{ color: KEBU.orange }}
            aria-label="Refresh inbox"
          >
            Refresh
          </button>
        </div>
        <p className="text-sm mb-4" style={{ color: KEBU.muted }}>
          Customer conversations from your shops.
        </p>

        {/* Status filter tabs */}
        {!loading && threads.length > 0 && (
          <div className="flex gap-1 mb-5">
            {(["all", "open", "resolved"] as const).map((tab) => {
              const count = tab === "all" ? threads.length : threads.filter((t) => t.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold capitalize transition-colors"
                  style={
                    filter === tab
                      ? { background: KEBU.black, color: KEBU.white }
                      : { background: KEBU.cream, color: KEBU.muted, border: `1px solid ${KEBU.border}` }
                  }
                >
                  {tab} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <div
            className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "#FFF0EE", border: `1px solid ${KEBU.red}` }}
            role="alert"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill={KEBU.red}>
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            <p className="text-sm" style={{ color: KEBU.red }}>{error}</p>
          </div>
        )}

        {/* Skeleton loading */}
        {loading && (
          <ul className="mt-4 space-y-2">
            {[1, 2, 3].map((n) => <SkeletonThread key={n} />)}
          </ul>
        )}

        {/* Loaded state */}
        {!loading && !error && threads.length === 0 && <EmptyState />}

        {!loading && filtered.length > 0 && (
          <ul className="space-y-2">
            {filtered.map((t) => (
              <ThreadCard key={`${t.projectId}-${t.id}`} t={t} />
            ))}
          </ul>
        )}

        {!loading && threads.length > 0 && filtered.length === 0 && (
          <p className="mt-6 text-sm text-center py-8" style={{ color: KEBU.muted }}>
            No {filter} conversations.
          </p>
        )}

        {/* WhatsApp tip — shown when no WhatsApp numbers are known */}
        {!loading && threads.length > 0 && threads.every((t) => !t.customer_whatsapp) && (
          <div
            className="mt-6 rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ background: "#F0FFF4", border: "1px solid #BBF7D0" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366" className="shrink-0 mt-0.5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.524 3.657 1.435 5.164L2.016 22l4.948-1.399A9.936 9.936 0 0011.999 22c5.522 0 10-4.478 10-10S17.521 2 12 2zm0 18a7.953 7.953 0 01-4.054-1.112l-.29-.172-3.008.85.854-3.012-.189-.305A7.954 7.954 0 014.046 12c0-4.41 3.586-7.999 7.953-7.999 4.368 0 7.953 3.589 7.953 7.999S16.367 20 12 20z"/>
            </svg>
            <div>
              <p className="text-[11px] font-bold mb-0.5" style={{ color: "#15803D" }}>
                Move conversations to WhatsApp
              </p>
              <p className="text-[11px]" style={{ color: "#166534" }}>
                Ask customers for their WhatsApp number — faster replies, works offline, no app needed.
              </p>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
