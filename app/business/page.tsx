"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import type { HomeSummary } from "@/lib/account/home-summary";

type Business = {
  id: string;
  public_kebu_id: string;
  legal_name: string;
  trading_name: string | null;
  country_code: string;
  category: string;
  description: string;
  lifecycle_status: string;
  verification_level: number;
  updated_at: string;
};

type TabId = "today" | "projects" | "rooms" | "tasks" | "calendar" | "files" | "people" | "analytics";

type SiteAnalyticsCard = {
  id: string;
  title: string;
  status: string;
  pageviews: number | null;
  errors: number | null;
  healthOk: boolean | null;
  loadError?: string;
};

type MessagePreview = {
  id: string;
  projectId: string;
  siteTitle: string;
  subject: string | null;
  status: string;
  last_message_at: string | null;
};

type PulseItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  businessName: string | null;
  at: string | null;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "projects", label: "Projects" },
  { id: "rooms", label: "Rooms" },
  { id: "tasks", label: "Tasks" },
  { id: "calendar", label: "Calendar" },
  { id: "files", label: "Files" },
  { id: "people", label: "People" },
  { id: "analytics", label: "Analytics" },
];

const WORKSPACE_NAV = [
  { label: "Overview", href: "/business" },
  { label: "Projects", href: "/business?tab=projects" },
  { label: "Rooms", href: "/rooms" },
  { label: "Calendar", href: "/calendar" },
  { label: "People", href: "/people" },
  { label: "Library", href: "/library" },
  { label: "Studio", href: "/studio" },
  { label: "Work", href: "/tasks" },
  { label: "Opportunities", href: "/opportunity" },
  { label: "Commerce", href: "/shop" },
  { label: "Analytics", href: "/business?tab=analytics" },
  { label: "Settings", href: "/account" },
];

const bg = "#F8F7F5";
const sidebarBg = "#0F0F0F";
const sidebarBorder = "rgba(255,255,255,0.07)";
const contentBorder = "rgba(0,0,0,0.08)";
const orange = KEBU.orange;

function BusinessWorkspaceInner() {
  const router = useRouter();
  const search = useSearchParams();
  const tabParam = search.get("tab") as TabId | null;
  const [tab, setTab] = useState<TabId>(
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "today",
  );
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [pulseItems, setPulseItems] = useState<PulseItem[]>([]);
  const [pulseStats, setPulseStats] = useState<{
    pendingOrders: number;
    openMessages: number;
    shopsOpen: number;
  } | null>(null);
  const [analyticsCards, setAnalyticsCards] = useState<SiteAnalyticsCard[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [messagePreviews, setMessagePreviews] = useState<MessagePreview[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bRes, sRes, pRes] = await Promise.all([
        fetch("/api/businesses", { credentials: "include" }),
        fetch("/api/me/home", { credentials: "include" }),
        fetch("/api/me/pulse", { credentials: "include" }),
      ]);
      if (bRes.status === 401 || sRes.status === 401) {
        router.replace("/login?next=/business");
        return;
      }
      const bData = await bRes.json().catch(() => ({}));
      const sData = await sRes.json().catch(() => ({}));
      const pData = await pRes.json().catch(() => ({}));
      if (!bRes.ok) {
        setError(typeof bData.error === "string" ? bData.error : "Could not load businesses.");
      } else {
        setBusinesses(Array.isArray(bData.businesses) ? bData.businesses : []);
      }
      if (sRes.ok && sData.summary) setSummary(sData.summary as HomeSummary);
      if (pRes.ok && pData.pulse) {
        setPulseStats({
          pendingOrders: Number(pData.pulse.pendingOrders ?? 0),
          openMessages: Number(pData.pulse.openMessages ?? 0),
          shopsOpen: Number(pData.pulse.shopsOpen ?? 0),
        });
        setPulseItems(Array.isArray(pData.pulse.items) ? pData.pulse.items : []);
      }
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) setTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (tab !== "analytics" || !summary?.sites?.length) {
      if (tab === "analytics" && !(summary?.sites?.length)) setAnalyticsCards([]);
      return;
    }
    let cancelled = false;
    setAnalyticsLoading(true);
    void (async () => {
      const cards = await Promise.all(
        summary.sites.slice(0, 12).map(async (s) => {
          try {
            const res = await fetch(`/api/projects/${s.id}/analytics?hours=72`, { credentials: "include" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              return { id: s.id, title: s.title, status: s.status, pageviews: null, errors: null, healthOk: null, loadError: typeof data.error === "string" ? data.error : "Could not load" } satisfies SiteAnalyticsCard;
            }
            const sum = data.summary as { pageviews?: number; errors?: unknown[]; health?: { ok?: boolean | null } } | undefined;
            return { id: s.id, title: s.title, status: s.status, pageviews: typeof sum?.pageviews === "number" ? sum.pageviews : 0, errors: Array.isArray(sum?.errors) ? sum.errors.length : 0, healthOk: sum?.health?.ok ?? null } satisfies SiteAnalyticsCard;
          } catch {
            return { id: s.id, title: s.title, status: s.status, pageviews: null, errors: null, healthOk: null, loadError: "Network error" } satisfies SiteAnalyticsCard;
          }
        }),
      );
      if (!cancelled) { setAnalyticsCards(cards); setAnalyticsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tab, summary]);

  useEffect(() => {
    if (tab !== "people" || !summary?.sites?.length) {
      if (tab === "people" && !(summary?.sites?.length)) setMessagePreviews([]);
      return;
    }
    let cancelled = false;
    setMessagesLoading(true);
    void (async () => {
      const collected: MessagePreview[] = [];
      await Promise.all(
        summary.sites.slice(0, 12).map(async (s) => {
          const res = await fetch(`/api/projects/${s.id}/messages`, { credentials: "include" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return;
          for (const t of Array.isArray(data.threads) ? data.threads : []) {
            collected.push({ id: t.id as string, projectId: s.id, siteTitle: s.title, subject: (t.subject as string | null) ?? null, status: String(t.status ?? "open"), last_message_at: (t.last_message_at as string | null) ?? null });
          }
        }),
      );
      collected.sort((a, b) => String(b.last_message_at ?? "").localeCompare(String(a.last_message_at ?? "")));
      if (!cancelled) { setMessagePreviews(collected); setMessagesLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tab, summary]);

  function selectTab(id: TabId) {
    setTab(id);
    router.replace(`/business?tab=${id}`, { scroll: false });
  }

  const activeWorkspace = businesses[0];
  const workspaceName = activeWorkspace ? (activeWorkspace.trading_name || activeWorkspace.legal_name) : "My Workspace";
  const workspaceInitial = workspaceName.charAt(0).toUpperCase();

  const stats = [
    { n: (summary?.sites ?? []).length, label: "Projects", href: "/my-sites" },
    { n: pulseStats?.pendingOrders ?? 0, label: "Orders", href: "/shop" },
    { n: businesses.length, label: "Businesses", href: "/business?tab=projects" },
    { n: (summary?.sites ?? []).filter((s) => s.status === "live").length, label: "Live sites", href: "/my-sites" },
    { n: pulseStats?.openMessages ?? 0, label: "Messages", href: "/messages" },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: bg, color: KEBU.black }}>

      {/* Workspace sidebar */}
      <aside className="hidden w-[200px] shrink-0 flex-col border-r lg:flex" style={{ background: sidebarBg, borderColor: sidebarBorder }}>

        {/* Logo */}
        <div className="border-b px-4 py-5" style={{ borderColor: sidebarBorder }}>
          <Link href="/dashboard" className="flex items-center gap-1.5 focus-visible:outline-none" aria-label="Kebu Home">
            <span className="text-[15px] font-black tracking-[-0.04em] text-white">kebu</span>
            <span className="text-[15px] font-black" style={{ color: orange }}>•</span>
          </Link>
        </div>

        {/* Workspace selector */}
        <div className="border-b px-3 py-3" style={{ borderColor: sidebarBorder }}>
          <button type="button" className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-none">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black text-black" style={{ background: orange }}>
              {workspaceInitial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black leading-none" style={{ color: "rgba(255,255,255,0.4)" }}>Workspace</p>
              <p className="mt-0.5 truncate text-[12px] font-black leading-none text-white">{workspaceName}</p>
            </div>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>▼</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {WORKSPACE_NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex min-h-8 items-center rounded-lg px-2.5 text-[12px] font-medium transition-colors hover:bg-white/[0.06]"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              {item.label}
            </Link>
          ))}

          {/* Pinned section */}
          <div className="mt-4 border-t pt-3" style={{ borderColor: sidebarBorder }}>
            <p className="mb-2 px-2.5 text-[9px] font-black uppercase tracking-[.14em]" style={{ color: "rgba(255,255,255,0.25)" }}>Pinned</p>
            {(summary?.sites ?? []).slice(0, 3).map((s) => (
              <Link key={s.id} href={`/my-sites/${s.id}`}
                className="flex min-h-8 items-center rounded-lg px-2.5 text-[11px] truncate transition-colors hover:bg-white/[0.06]"
                style={{ color: "rgba(255,255,255,0.4)" }}>
                {s.title}
              </Link>
            ))}
            {!(summary?.sites?.length) ? (
              <p className="px-2.5 text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>No pins yet</p>
            ) : null}
          </div>
        </nav>
      </aside>

      {/* Main workspace area */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-white px-5 py-3" style={{ borderColor: contentBorder }}>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-black text-white" style={{ background: KEBU.black }}>K</Link>
            <p className="text-[13px] font-black" style={{ color: KEBU.black }}>kebu</p>
          </div>
          <div className="hidden flex-1 max-w-md lg:block">
            <input type="text" placeholder="Search your workspace, ask Yande..."
              className="w-full h-8 rounded-full px-4 text-[11px] outline-none focus:ring-1 focus:ring-orange-500"
              style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${contentBorder}`, color: KEBU.black }} />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/create/new"
              className="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white transition hover:brightness-110"
              style={{ background: KEBU.black }}>
              + Create
            </Link>
            <Link href="/tools"
              className="hidden rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wide sm:flex"
              style={{ border: `1px solid ${contentBorder}`, color: orange }}>
              ✦ Ask Yande
            </Link>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-black/[0.04]" aria-label="Notifications">
              🔔
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black text-black" style={{ background: orange }}>
              {workspaceInitial}
            </span>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* Hero banner */}
          <section className="border-b" style={{ borderColor: contentBorder }}>
            <div className="relative h-[200px] overflow-hidden" style={{ background: "linear-gradient(135deg,#1a0800,#2d1200 40%,#111)" }}>
              <div className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(ellipse at 70% 30%,${orange},transparent 50%),radial-gradient(ellipse at 20% 70%,#6C63FF,transparent 45%)` }} />
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <div className="flex items-end justify-between">
                  <div>
                    <button type="button" className="flex items-center gap-2 focus-visible:outline-none">
                      <h1 className="text-[clamp(1.5rem,4vw,2.8rem)] font-black leading-none tracking-[-.05em] text-white" style={{ fontFamily: "var(--font-fraunces)" }}>
                        {workspaceName}
                      </h1>
                      <span className="text-white/50 text-sm">▼</span>
                    </button>
                    <p className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>Your creative & business workspace</p>
                  </div>
                  <Link href={activeWorkspace ? `/business/${activeWorkspace.id}/edit` : "/business/register"}
                    className="rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-white/10"
                    style={{ borderColor: "rgba(255,255,255,0.3)" }}>
                    {activeWorkspace ? "Edit workspace" : "Register business"}
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Tab nav + filter */}
          <div className="border-b bg-white px-6 sm:px-8" style={{ borderColor: contentBorder }}>
            <div className="flex items-center justify-between">
              <div className="flex gap-0 overflow-x-auto scrollbar-none">
                {TABS.map((t) => (
                  <button key={t.id} type="button" onClick={() => selectTab(t.id)}
                    className="shrink-0 border-b-2 px-4 py-3.5 text-[11px] font-black uppercase tracking-wide transition-colors"
                    style={{
                      borderColor: tab === t.id ? orange : "transparent",
                      color: tab === t.id ? orange : "rgba(0,0,0,0.45)",
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <select className="hidden rounded-full border px-3 py-1.5 text-[10px] font-black sm:block focus:outline-none"
                style={{ borderColor: contentBorder, color: "rgba(0,0,0,0.55)" }}>
                <option>This week</option>
                <option>This month</option>
                <option>All time</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 sm:px-8">
            {error ? <p className="mb-4 rounded-xl p-3 text-sm" style={{ background: "#FFF5F5", color: KEBU.red }}>{error}</p> : null}
            {loading ? <p className="text-sm" style={{ color: "rgba(0,0,0,0.4)" }}>Loading workspace…</p> : null}

            {/* Today / Pulse */}
            {!loading && tab === "today" ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-6">

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {stats.map((s) => (
                      <Link key={s.label} href={s.href}
                        className="rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                        style={{ background: "#fff", borderColor: contentBorder }}>
                        <p className="text-2xl font-black" style={{ fontFamily: "var(--font-fraunces)", color: orange }}>{s.n}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-wide" style={{ color: "rgba(0,0,0,0.45)" }}>{s.label}</p>
                      </Link>
                    ))}
                  </div>

                  {/* Pulse items */}
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "#fff", borderColor: contentBorder }}>
                    <div className="border-b px-5 py-4" style={{ borderColor: contentBorder }}>
                      <h2 className="text-sm font-black" style={{ fontFamily: "var(--font-fraunces)" }}>What&apos;s going on</h2>
                    </div>
                    {pulseItems.length === 0 ? (
                      <p className="px-5 py-5 text-sm" style={{ color: "rgba(0,0,0,0.4)" }}>
                        Nothing urgent yet. Register a business, build a site, or open a shop when you&apos;re ready.
                      </p>
                    ) : (
                      <ul className="divide-y" style={{ borderColor: contentBorder }}>
                        {pulseItems.slice(0, 10).map((u) => {
                          const kindColor =
                            u.kind.toLowerCase().includes("order") ? "#10B981" :
                            u.kind.toLowerCase().includes("message") ? "#0EA5E9" :
                            u.kind.toLowerCase().includes("site") ? orange : KEBU.red;
                          return (
                            <li key={u.id}>
                              <Link href={u.href}
                                className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-black/[.02]">
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: kindColor }} />
                                <div className="flex-1 min-w-0">
                                  <span className="text-[9px] font-black uppercase tracking-[.18em]" style={{ color: kindColor }}>{u.kind}{u.businessName ? ` · ${u.businessName}` : ""}</span>
                                  <span className="block text-[12px] font-black mt-0.5" style={{ color: KEBU.black }}>{u.title}</span>
                                  <span className="block text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>{u.body}</span>
                                </div>
                                <span className="shrink-0 text-sm" style={{ color: orange }}>→</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {/* Recent sites / Active projects */}
                  {(summary?.sites ?? []).length > 0 ? (
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-black" style={{ fontFamily: "var(--font-fraunces)" }}>Active projects</h2>
                        <Link href="/my-sites" className="text-[11px] font-semibold" style={{ color: orange }}>See all →</Link>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {(summary?.sites ?? []).slice(0, 6).map((s) => (
                          <Link key={s.id} href={`/my-sites/${s.id}`}
                            className="rounded-2xl border overflow-hidden transition hover:-translate-y-0.5 hover:shadow-sm"
                            style={{ background: "#fff", borderColor: contentBorder }}>
                            <div className="h-[100px] relative overflow-hidden" style={{ background: `linear-gradient(145deg,${orange}22,#0a0a0a)` }}>
                              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 70% 30%,${orange}44,transparent 60%)` }} />
                              <div className="absolute left-3 top-3">
                                <span className="rounded-full px-2 py-0.5 text-[8px] font-black uppercase"
                                  style={{ background: s.status === "live" ? "#0E9F6E22" : "rgba(0,0,0,0.07)", color: s.status === "live" ? "#0E9F6E" : "rgba(0,0,0,0.4)" }}>
                                  {s.status ?? "draft"}
                                </span>
                              </div>
                            </div>
                            <div className="px-3 py-3">
                              <p className="truncate text-[12px] font-black" style={{ color: KEBU.black }}>{s.title}</p>
                              {s.subdomain ? <p className="mt-0.5 truncate text-[10px]" style={{ color: "rgba(0,0,0,0.4)" }}>{s.subdomain}.kebu.co</p> : null}
                              <div className="mt-2 h-1 w-full overflow-hidden rounded-full" style={{ background: "rgba(0,0,0,0.06)" }}>
                                <div className="h-full rounded-full" style={{ width: s.status === "live" ? "100%" : "40%", background: orange }} />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Right panel */}
                <div className="space-y-4">

                  {/* Businesses */}
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "#fff", borderColor: contentBorder }}>
                    <div className="border-b px-4 py-3" style={{ borderColor: contentBorder }}>
                      <p className="text-[11px] font-black uppercase tracking-[.1em]" style={{ color: KEBU.black }}>Businesses</p>
                    </div>
                    {businesses.length === 0 ? (
                      <div className="px-4 py-4">
                        <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.4)" }}>No businesses yet.</p>
                        <Link href="/business/register" className="mt-2 block text-[11px] font-black" style={{ color: orange }}>Register →</Link>
                      </div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: contentBorder }}>
                        {businesses.slice(0, 5).map((b) => (
                          <Link key={b.id} href={`/business/${b.id}`}
                            className="flex items-center gap-2.5 px-4 py-3 transition-colors hover:bg-black/[.02]">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-black" style={{ background: orange }}>
                              {(b.trading_name || b.legal_name).charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-black" style={{ color: KEBU.black }}>{b.trading_name || b.legal_name}</p>
                              <p className="text-[9px]" style={{ color: "rgba(0,0,0,0.4)" }}>{b.lifecycle_status}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Messages / Yande AI */}
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "#fff", borderColor: contentBorder }}>
                    <div className="border-b px-4 py-3" style={{ borderColor: contentBorder }}>
                      <p className="text-[11px] font-black uppercase tracking-[.1em]" style={{ color: KEBU.black }}>✦ Yande AI</p>
                    </div>
                    <div className="px-4 py-4">
                      <p className="text-[11px]" style={{ color: "rgba(0,0,0,0.5)" }}>Ask about your workspace, get suggestions, or start building.</p>
                      <Link href="/tools" className="mt-3 flex items-center justify-center gap-2 rounded-full py-2.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: orange }}>
                        ✦ Open Yande
                      </Link>
                    </div>
                  </div>

                  {/* Account updates */}
                  {(summary?.updates ?? []).length > 0 ? (
                    <div className="rounded-2xl border overflow-hidden" style={{ background: "#fff", borderColor: contentBorder }}>
                      <div className="border-b px-4 py-3" style={{ borderColor: contentBorder }}>
                        <p className="text-[11px] font-black uppercase tracking-[.1em]" style={{ color: KEBU.black }}>Updates</p>
                      </div>
                      <ul className="divide-y" style={{ borderColor: contentBorder }}>
                        {(summary?.updates ?? []).slice(0, 4).map((u) => (
                          <li key={u.id}>
                            <Link href={u.href} className="block px-4 py-3 transition-colors hover:bg-black/[.02]">
                              <span className="block text-[12px] font-black" style={{ color: KEBU.black }}>{u.title}</span>
                              <span className="block text-[10px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>{u.body}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Projects tab */}
            {!loading && tab === "projects" ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Link href="/my-sites" className="rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider text-white" style={{ background: orange }}>New project</Link>
                  <Link href="/my-sites" className="rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider" style={{ border: `1px solid ${contentBorder}`, color: "rgba(0,0,0,0.55)" }}>Open My Sites →</Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(summary?.sites ?? []).map((s) => (
                    <Link key={s.id} href={`/my-sites/${s.id}`}
                      className="rounded-2xl border overflow-hidden transition hover:-translate-y-0.5 hover:shadow-sm"
                      style={{ background: "#fff", borderColor: contentBorder }}>
                      <div className="h-[100px] relative overflow-hidden" style={{ background: `linear-gradient(145deg,${orange}22,#0a0a0a)` }}>
                        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 70% 30%,${orange}44,transparent 60%)` }} />
                        <span className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[8px] font-black uppercase"
                          style={{ background: s.status === "live" ? "#0E9F6E22" : "rgba(0,0,0,0.07)", color: s.status === "live" ? "#0E9F6E" : "rgba(0,0,0,0.4)" }}>
                          {s.status ?? "draft"}
                        </span>
                      </div>
                      <div className="px-3 py-3">
                        <p className="truncate text-[12px] font-black" style={{ color: KEBU.black }}>{s.title}</p>
                        {s.subdomain ? <p className="mt-0.5 text-[10px]" style={{ color: "rgba(0,0,0,0.4)" }}>{s.subdomain}.kebu.co</p> : null}
                      </div>
                    </Link>
                  ))}
                </div>
                {!(summary?.sites?.length) ? (
                  <div className="rounded-2xl border px-6 py-12 text-center" style={{ borderColor: contentBorder }}>
                    <p className="text-sm" style={{ color: "rgba(0,0,0,0.4)" }}>No projects yet.</p>
                    <Link href="/my-sites" className="mt-3 inline-block text-[12px] font-black" style={{ color: orange }}>Create your first site →</Link>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Analytics tab */}
            {!loading && tab === "analytics" ? (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: "rgba(0,0,0,0.5)" }}>Last 72 hours from real site beacons.</p>
                {analyticsLoading ? <p className="text-sm" style={{ color: "rgba(0,0,0,0.4)" }}>Loading analytics…</p> : null}
                <div className="grid sm:grid-cols-2 gap-3">
                  {(analyticsCards.length ? analyticsCards : (summary?.sites ?? []).map((s) => ({
                    id: s.id, title: s.title, status: s.status, pageviews: null as number | null, errors: null as number | null, healthOk: null as boolean | null,
                  }))).map((s) => (
                    <Link key={s.id} href={`/create/${s.id}?panel=analytics`}
                      className="rounded-2xl border p-4" style={{ background: "#fff", borderColor: contentBorder }}>
                      <p className="font-black text-sm" style={{ color: KEBU.black }}>{s.title}</p>
                      {"loadError" in s && typeof (s as { loadError?: string }).loadError === "string" ? (
                        <p className="text-[11px] mt-1" style={{ color: KEBU.red }}>{(s as { loadError: string }).loadError}</p>
                      ) : (
                        <p className="text-[11px] mt-1" style={{ color: "rgba(0,0,0,0.45)" }}>
                          {s.pageviews == null ? "—" : `${s.pageviews} views`} · {s.errors == null ? "—" : `${s.errors} errors`} · {s.healthOk == null ? "n/a" : s.healthOk ? "healthy" : "unhealthy"} · {s.status}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
                {!(summary?.sites?.length) ? <p className="text-sm" style={{ color: "rgba(0,0,0,0.4)" }}>No sites yet.</p> : null}
              </div>
            ) : null}

            {/* People tab */}
            {!loading && tab === "people" ? (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: "rgba(0,0,0,0.5)" }}>Messages and contacts across your workspace.</p>
                <Link href="/messages" className="inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider text-white" style={{ background: orange }}>Full inbox →</Link>
                {messagesLoading ? <p className="text-sm" style={{ color: "rgba(0,0,0,0.4)" }}>Loading…</p> : null}
                {!messagesLoading && messagePreviews.length === 0 ? (
                  <p className="text-sm" style={{ color: "rgba(0,0,0,0.4)" }}>No messages yet.</p>
                ) : null}
                <ul className="space-y-2">
                  {messagePreviews.slice(0, 12).map((t) => (
                    <li key={`${t.projectId}-${t.id}`}>
                      <Link href={`/shop/${t.projectId}?tab=messages`}
                        className="block rounded-2xl border px-4 py-3" style={{ background: "#fff", borderColor: contentBorder }}>
                        <p className="text-sm font-black" style={{ color: KEBU.black }}>{t.subject || "Conversation"}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>
                          {t.siteTitle} · {t.status}{t.last_message_at ? ` · ${new Date(t.last_message_at).toLocaleString()}` : ""}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Rooms / Tasks / Calendar / Files — simple placeholders directing to the right pages */}
            {!loading && (tab === "rooms" || tab === "tasks" || tab === "calendar" || tab === "files") ? (
              <div className="rounded-2xl border px-6 py-12 text-center" style={{ borderColor: contentBorder, background: "#fff" }}>
                <p className="text-lg font-black" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
                  {tab === "rooms" ? "Rooms" : tab === "tasks" ? "Tasks" : tab === "calendar" ? "Calendar" : "Files"}
                </p>
                <p className="mt-2 text-sm" style={{ color: "rgba(0,0,0,0.45)" }}>
                  {tab === "rooms" ? "Collaborative spaces for your team." : tab === "tasks" ? "Manage tasks across all your projects." : tab === "calendar" ? "View your schedule and events." : "Your files and media library."}
                </p>
                <Link href={tab === "rooms" ? "/rooms" : tab === "tasks" ? "/tasks" : tab === "calendar" ? "/calendar" : "/library"}
                  className="mt-4 inline-flex rounded-full px-6 py-3 text-[11px] font-black uppercase tracking-wide text-white"
                  style={{ background: orange }}>
                  Open {tab === "rooms" ? "Rooms" : tab === "tasks" ? "Tasks" : tab === "calendar" ? "Calendar" : "Library"} →
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>

    </div>
  );
}

export default function BusinessListPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen" style={{ background: "#F8F7F5" }}>
        <p className="text-sm" style={{ color: "rgba(0,0,0,0.4)" }}>Loading workspace…</p>
      </div>
    }>
      <BusinessWorkspaceInner />
    </Suspense>
  );
}
