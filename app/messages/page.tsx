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
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function waHref(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

const border = KEBU.borders.default;

export default function MessagesInboxPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ThreadRow | null>(null);
  const [replyText, setReplyText] = useState("");

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

  useEffect(() => { void load(); }, [load]);

  const totalUnread = threads.reduce((s, t) => s + (t.unread_count ?? 0), 0);

  const filtered = threads
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (t.subject ?? "").toLowerCase().includes(s) || (t.customer_name ?? "").toLowerCase().includes(s) || t.siteTitle.toLowerCase().includes(s);
    });

  return (
    <AppShell title="Messages">
      <div className="flex min-h-[calc(100vh-60px)]" style={{ background: "#FAFAF8" }}>

        {/* Center panel — thread list */}
        <div className="flex w-full flex-col border-r xl:w-[380px] xl:shrink-0" style={{ borderColor: border }}>

          {/* Header */}
          <div className="border-b px-5 pt-6 pb-4" style={{ borderColor: border, background: "#fff" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-black tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
                  Messages
                  {totalUnread > 0 && (
                    <span className="ml-2 rounded-full px-2 py-0.5 text-xs font-black text-white align-middle" style={{ background: KEBU.orange }}>
                      {totalUnread}
                    </span>
                  )}
                </h1>
                <p className="text-[11px]" style={{ color: KEBU.muted }}>Customer conversations</p>
              </div>
              <button onClick={() => void load()} className="text-[10px] font-black uppercase tracking-wide" style={{ color: KEBU.orange }}>
                Refresh
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-3">
              {(["all", "open", "resolved"] as const).map((tab) => {
                const count = tab === "all" ? threads.length : threads.filter((t) => t.status === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors capitalize"
                    style={filter === tab
                      ? { background: KEBU.black, color: "#fff" }
                      : { background: "rgba(0,0,0,.05)", color: KEBU.muted }}
                  >
                    {tab} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: border }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: KEBU.faint }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
                style={{ color: KEBU.black }}
              />
            </div>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-1 p-3">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-16 animate-pulse rounded-xl" style={{ background: KEBU.cream }} />
                ))}
              </div>
            ) : error ? (
              <div className="p-5">
                <p className="text-sm font-bold" style={{ color: "#DC2626" }}>{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-bold text-sm" style={{ color: KEBU.black }}>No conversations</p>
                <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
                  {threads.length === 0 ? "Customer messages from your sites appear here." : "No conversations match this filter."}
                </p>
                {threads.length === 0 && (
                  <div className="mt-4 flex justify-center gap-2">
                    <Link href={MY_SITES_HREF} className="rounded-full px-4 py-2 text-xs font-black text-white" style={{ background: KEBU.black }}>My Sites</Link>
                    <Link href="/create/new?type=store" className="rounded-full border px-4 py-2 text-xs font-black" style={{ borderColor: border, color: KEBU.black }}>Add a shop</Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filtered.map(t => {
                  const hasUnread = (t.unread_count ?? 0) > 0;
                  const initials = t.customer_name
                    ? t.customer_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
                    : "?";
                  const isActive = selected?.id === t.id;
                  return (
                    <button
                      key={`${t.projectId}-${t.id}`}
                      type="button"
                      onClick={() => setSelected(t)}
                      className="w-full flex items-start gap-3 rounded-xl px-4 py-3 text-left transition-colors"
                      style={{
                        background: isActive ? "rgba(255,85,0,.08)" : hasUnread ? "#FFF8F2" : "#fff",
                        border: isActive ? `1.5px solid ${KEBU.orange}` : hasUnread ? `1.5px solid ${KEBU.orange}` : `1px solid ${border}`,
                      }}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
                        style={{ background: hasUnread ? KEBU.orange : KEBU.cream, color: hasUnread ? "#fff" : KEBU.muted }}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[12px] font-black" style={{ color: KEBU.black }}>
                            {t.subject || t.customer_name || "Customer message"}
                          </p>
                          <span className="shrink-0 text-[9px]" style={{ color: KEBU.faint }}>{relativeTime(t.last_message_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="truncate text-[10px]" style={{ color: KEBU.muted }}>{t.siteTitle}</span>
                          <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black"
                            style={{
                              background: t.status === "open" ? "#FFF3E0" : t.status === "resolved" ? "#E8F5E9" : KEBU.cream,
                              color: t.status === "open" ? "#E65100" : t.status === "resolved" ? "#2E7D32" : KEBU.muted,
                            }}>
                            {t.status}
                          </span>
                          {hasUnread && (
                            <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black text-white" style={{ background: KEBU.orange }}>
                              {t.unread_count} new
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — open conversation */}
        <div className="hidden flex-1 flex-col xl:flex">
          {selected ? (
            <>
              {/* Thread header */}
              <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: border, background: "#fff" }}>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Conversation · {selected.siteTitle}</p>
                  <h2 className="mt-0.5 text-base font-black" style={{ color: KEBU.black }}>
                    {selected.subject || selected.customer_name || "Customer message"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {selected.customer_whatsapp && (
                    <a
                      href={waHref(selected.customer_whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-black transition hover:bg-black/[.04]"
                      style={{ borderColor: border, color: "#25D366" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.524 3.657 1.435 5.164L2.016 22l4.948-1.399A9.936 9.936 0 0011.999 22c5.522 0 10-4.478 10-10S17.521 2 12 2zm0 18a7.953 7.953 0 01-4.054-1.112l-.29-.172-3.008.85.854-3.012-.189-.305A7.954 7.954 0 014.046 12c0-4.41 3.586-7.999 7.953-7.999 4.368 0 7.953 3.589 7.953 7.999S16.367 20 12 20z"/>
                      </svg>
                      WhatsApp
                    </a>
                  )}
                  <Link
                    href={`/shop/${selected.projectId}?tab=messages&thread=${selected.id}`}
                    className="rounded-full border px-3 py-2 text-[10px] font-black transition hover:bg-black/[.04]"
                    style={{ borderColor: border, color: KEBU.black }}
                  >
                    Open in Shop →
                  </Link>
                </div>
              </div>

              {/* Message area */}
              <div className="flex-1 overflow-y-auto p-6" style={{ background: "#FAFAF8" }}>
                {/* Welcome banner */}
                <div className="mb-6 overflow-hidden rounded-2xl" style={{ background: KEBU.black }}>
                  <div className="relative h-24 overflow-hidden" style={{ background: "linear-gradient(135deg, #1a0800, #0A0A0A)" }}>
                    <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(255,85,0,.4), transparent 60%)" }} />
                    <div className="absolute left-6 top-6">
                      <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Kebu Messages</p>
                      <p className="mt-1 text-lg font-black text-white" style={{ fontFamily: "var(--font-fraunces)" }}>Welcome to KEBU.</p>
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Customer conversations from <span className="font-bold text-white">{selected.siteTitle}</span> appear here. Reply to keep your customers engaged.
                    </p>
                  </div>
                </div>

                {/* Thread detail */}
                <div className="rounded-2xl border bg-white p-5" style={{ borderColor: border }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full font-black text-white" style={{ background: KEBU.orange }}>
                      {(selected.customer_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black" style={{ color: KEBU.black }}>{selected.customer_name || "Anonymous"}</p>
                      <p className="text-[10px]" style={{ color: KEBU.muted }}>{relativeTime(selected.last_message_at)} · {selected.status}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(0,0,0,0.7)" }}>
                    {selected.subject || "No message preview available. Open the full conversation in Shop to see all messages."}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/shop/${selected.projectId}?tab=messages&thread=${selected.id}`}
                      className="rounded-full px-4 py-2 text-[10px] font-black text-white transition hover:brightness-110"
                      style={{ background: KEBU.orange }}
                    >
                      View full conversation →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Reply bar */}
              <div className="border-t px-5 py-4" style={{ borderColor: border, background: "#fff" }}>
                <div className="flex items-end gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: border }}>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type a reply… (full conversation in Shop)"
                    rows={2}
                    className="min-w-0 flex-1 resize-none bg-transparent text-sm outline-none"
                    style={{ color: KEBU.black }}
                  />
                  <Link
                    href={`/shop/${selected.projectId}?tab=messages&thread=${selected.id}`}
                    className="shrink-0 rounded-xl px-4 py-2 text-[10px] font-black text-white transition hover:brightness-110"
                    style={{ background: KEBU.orange }}
                  >
                    Open →
                  </Link>
                </div>
                <p className="mt-2 text-[9px]" style={{ color: KEBU.faint }}>Replies are sent from your Shop inbox.</p>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
              <div className="mb-6 overflow-hidden rounded-3xl" style={{ background: KEBU.black, width: 280 }}>
                <div className="relative h-32 overflow-hidden" style={{ background: "linear-gradient(135deg, #1a0800, #0A0A0A)" }}>
                  <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(255,85,0,.4), transparent 60%)" }} />
                  <div className="absolute left-6 top-6">
                    <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Kebu</p>
                    <p className="mt-1 text-xl font-black text-white" style={{ fontFamily: "var(--font-fraunces)" }}>Welcome to KEBU.</p>
                  </div>
                </div>
                <div className="px-6 py-4 text-left">
                  <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Select a conversation to start replying to your customers.
                  </p>
                </div>
              </div>
              <p className="text-sm font-black" style={{ color: KEBU.black }}>Select a conversation</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed" style={{ color: KEBU.muted }}>
                Pick a thread from the left to see the full conversation and reply.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
