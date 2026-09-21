"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";
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

type TabId = "pulse" | "businesses" | "sites" | "analytics" | "messages" | "you";

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
  { id: "pulse", label: "Pulse" },
  { id: "businesses", label: "My Businesses" },
  { id: "sites", label: "My Sites" },
  { id: "analytics", label: "Analytics" },
  { id: "messages", label: "Messages" },
  { id: "you", label: "You & help" },
];

function MySpaceInner() {
  const router = useRouter();
  const search = useSearchParams();
  const tabParam = search.get("tab");
  const [tab, setTab] = useState<TabId>(
    tabParam && TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : "businesses",
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
    if (tabParam === "overview") {
      setTab("businesses");
      router.replace("/business?tab=businesses", { scroll: false });
      return;
    }
    if (tabParam && TABS.some((t) => t.id === tabParam)) setTab(tabParam as TabId);
  }, [tabParam, router]);

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
            const res = await fetch(`/api/projects/${s.id}/analytics?hours=72`, {
              credentials: "include",
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              return {
                id: s.id,
                title: s.title,
                status: s.status,
                pageviews: null,
                errors: null,
                healthOk: null,
                loadError: typeof data.error === "string" ? data.error : "Could not load",
              } satisfies SiteAnalyticsCard;
            }
            const sum = data.summary as {
              pageviews?: number;
              errors?: unknown[];
              health?: { ok?: boolean | null };
            } | undefined;
            return {
              id: s.id,
              title: s.title,
              status: s.status,
              pageviews: typeof sum?.pageviews === "number" ? sum.pageviews : 0,
              errors: Array.isArray(sum?.errors) ? sum.errors.length : 0,
              healthOk: sum?.health?.ok ?? null,
            } satisfies SiteAnalyticsCard;
          } catch {
            return {
              id: s.id,
              title: s.title,
              status: s.status,
              pageviews: null,
              errors: null,
              healthOk: null,
              loadError: "Network error",
            } satisfies SiteAnalyticsCard;
          }
        }),
      );
      if (!cancelled) {
        setAnalyticsCards(cards);
        setAnalyticsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, summary]);

  useEffect(() => {
    if (tab !== "messages" || !summary?.sites?.length) {
      if (tab === "messages" && !(summary?.sites?.length)) setMessagePreviews([]);
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
            collected.push({
              id: t.id as string,
              projectId: s.id,
              siteTitle: s.title,
              subject: (t.subject as string | null) ?? null,
              status: String(t.status ?? "open"),
              last_message_at: (t.last_message_at as string | null) ?? null,
            });
          }
        }),
      );
      collected.sort((a, b) =>
        String(b.last_message_at ?? "").localeCompare(String(a.last_message_at ?? "")),
      );
      if (!cancelled) {
        setMessagePreviews(collected);
        setMessagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, summary]);

  function selectTab(id: TabId) {
    setTab(id);
    router.replace(`/business?tab=${id}`, { scroll: false });
  }

  return (
    <AppShell title="My Businesses">
      <main className="px-6 sm:px-8 lg:px-10 py-8 lg:py-10">
        {tab !== "businesses" ? <div
          className="mb-6 flex flex-wrap gap-4 border-b"
          style={{ borderColor: KEBU.border }}
          role="tablist"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => selectTab(t.id)}
              className="border-b-2 px-0 py-3 text-[10px] font-semibold"
              style={{
                borderColor: tab === t.id ? KEBU.orange : "transparent",
                color: tab === t.id ? KEBU.black : KEBU.muted,
              }}
            >
              {t.label}
            </button>
          ))}
        </div> : null}

        {error ? (
          <p className="mb-4 text-sm" style={{ color: KEBU.red }} role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm" style={{ color: KEBU.muted }}>
            Loading your space…
          </p>
        ) : null}

        {!loading && tab === "pulse" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 border-y sm:grid-cols-4" style={{borderColor:KEBU.border}}>
              {[
                { n: pulseStats?.pendingOrders ?? 0, l: "Orders to fulfill", href: "/shop" },
                { n: pulseStats?.openMessages ?? 0, l: "Open messages", href: "/messages" },
                { n: businesses.length, l: "Businesses", href: "/business?tab=businesses" },
                { n: pulseStats?.shopsOpen ?? 0, l: "Shops open", href: "/shop" },
              ].map((s) => (
                <Link
                  key={s.l}
                  href={s.href}
                  className="border-b p-4 sm:border-b-0 sm:border-r sm:last:border-r-0"
                  style={{ borderColor: KEBU.border }}
                >
                  <p className="text-2xl font-black" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.orange }}>
                    {s.n}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider mt-1">{s.l}</p>
                </Link>
              ))}
            </div>
            <section className="border-y py-4" style={{ borderColor: KEBU.border }}>
              <h2 className="font-bold mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
                What’s going on
              </h2>
              <p className="text-xs mb-4" style={{ color: KEBU.muted }}>
                Across all your businesses — tap an item to open the right shop or site.
              </p>
              {pulseItems.length === 0 ? (
                <p className="text-sm" style={{ color: KEBU.muted }}>
                  Nothing urgent. Register a business, build a site, or open a shop when you’re ready to sell.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {pulseItems.slice(0, 16).map((u) => {
                    const kindColor =
                      u.kind.toLowerCase().includes("order") ? "#10B981" :
                      u.kind.toLowerCase().includes("message") ? "#0EA5E9" :
                      u.kind.toLowerCase().includes("site") ? KEBU.orange :
                      KEBU.red;
                    return (
                      <li key={u.id}>
                        <Link
                          href={u.href}
                          className="flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-black/[0.025]"
                          style={{ borderLeft: `3px solid ${kindColor}` }}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: kindColor }}>
                              {u.kind}
                              {u.businessName ? ` · ${u.businessName}` : ""}
                            </span>
                            <span className="block text-sm font-semibold leading-tight mt-0.5">{u.title}</span>
                            <span className="block text-xs mt-0.5 leading-relaxed" style={{ color: KEBU.muted }}>
                              {u.body}
                            </span>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 mt-1.5" style={{ color: KEBU.faint }}>
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            {(summary?.updates ?? []).length > 0 ? (
              <section className="border-y py-4" style={{ borderColor: KEBU.border }}>
                <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>
                  Account updates
                </h2>
                <ul className="space-y-2">
                  {(summary?.updates ?? []).slice(0, 4).map((u) => (
                    <li key={u.id}>
                      <Link href={u.href} className="block text-sm font-semibold hover:underline">
                        {u.title}
                        <span className="block text-xs font-normal mt-0.5" style={{ color: KEBU.muted }}>
                          {u.body}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {!loading && tab === "businesses" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] text-black/35">Business Hub&nbsp; / &nbsp;<strong className="text-black/75">My Businesses</strong></p>
                  <h1 className="mt-2 text-[35px] leading-[.98] tracking-[-.045em]" style={{ fontFamily: "var(--font-fraunces)" }}>A bolder tomorrow, built by you.</h1>
                  <p className="mt-1 text-[11px] text-black/42">Manage your businesses, track progress, and unlock new opportunities.</p>
                </div>
                <Link href="/business/register" className="rounded-full bg-black px-5 py-2.5 text-[10px] font-semibold text-white">+ New business</Link>
              </div>

              <div className="mt-5 grid overflow-hidden rounded-[14px] border bg-white sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" style={{ borderColor: KEBU.border }}>
                {[
                  [businesses.length, "Active businesses"],
                  [summary?.sites?.length ?? 0, "Sites"],
                  [pulseStats?.pendingOrders ?? 0, "Pending orders"],
                  [pulseStats?.openMessages ?? 0, "Messages"],
                  [pulseStats?.shopsOpen ?? 0, "Shops open"],
                  [businesses.filter((item) => item.verification_level > 0).length, "Verified"],
                ].map(([value, label], index) => (
                  <div key={String(label)} className="min-h-[112px] border-b p-3.5 sm:border-r lg:border-b-0" style={{ borderColor: KEBU.border }}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF2EA] text-[11px]" style={{ color: KEBU.orange }}>{["▣","▥","◉","✉","□","✦"][index]}</span>
                    <p className="mt-3 text-[22px] leading-none" style={{ fontFamily: "var(--font-fraunces)" }}>{value}</p>
                    <p className="mt-1 text-[9px] text-black/42">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                <div className="flex items-center gap-4">
                  <p className="text-[18px]" style={{ fontFamily: "var(--font-fraunces)" }}>Your businesses</p>
                  <span className="text-[9px] text-black/35">All {businesses.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/business?tab=pulse" className="rounded-full border px-3 py-2 text-[9px] font-semibold" style={{ borderColor: KEBU.border }}>Pulse</Link>
                  <Link href="/ka-score" className="rounded-full border px-3 py-2 text-[9px] font-semibold" style={{ borderColor: KEBU.border }}>KA Score</Link>
                </div>
              </div>

              {businesses.length === 0 ? (
                <div className="mt-3 rounded-[16px] border border-dashed p-10 text-center" style={{ borderColor: KEBU.border }}>
                  <p className="text-[13px] font-semibold">No businesses yet.</p>
                  <p className="mt-1 text-[10px] text-black/40">Open one when you are ready. Personal Kebu still works without it.</p>
                </div>
              ) : (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {businesses.map((item, index) => (
                    <li key={item.id}>
                      <Link href={"/business/" + item.id} className="group block overflow-hidden rounded-[14px] border bg-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(10,10,10,.06)]" style={{ borderColor: KEBU.border }}>
                        <div className="relative h-[92px] overflow-hidden" style={{ background: index % 3 === 0 ? "linear-gradient(120deg,#160805,#ff6a00,#ffb27d)" : index % 3 === 1 ? "linear-gradient(120deg,#120808,#ffb7b7,#53130f)" : "linear-gradient(120deg,#050505,#7c160e,#f16d49)" }}>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(255,255,255,.25),transparent_25%)]" />
                          <p className="absolute bottom-3 left-3 text-[20px] text-white" style={{ fontFamily: "var(--font-fraunces)" }}>{item.trading_name || item.legal_name}</p>
                        </div>
                        <div className="p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0"><p className="truncate text-[11px] font-semibold">{item.trading_name || item.legal_name}</p><p className="mt-0.5 truncate text-[9px] text-black/38">{item.category} · {item.country_code}</p></div>
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-700">{item.lifecycle_status}</span>
                          </div>
                          <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-3" style={{ borderColor: KEBU.border }}>
                            <div><p className="text-[12px] font-semibold">{item.verification_level}</p><p className="text-[8px] text-black/35">Verification</p></div>
                            <div><p className="text-[12px] font-semibold">{item.region || "—"}</p><p className="text-[8px] text-black/35">Region</p></div>
                            <div><p className="text-[12px] font-semibold">Open</p><p className="text-[8px] text-black/35">Workspace</p></div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 grid border-t sm:grid-cols-4" style={{ borderColor: KEBU.border }}>
                {[
                  ["/create/new", "Create a site", "Launch your online presence"],
                  ["/studio", "Open in Studio", "Design, create, collaborate"],
                  ["/analytics", "Analytics", "View performance"],
                  ["/opportunity", "Opportunities", "Find new possibilities"],
                ].map(([href,title,detail]) => (
                  <Link key={href} href={href} className="border-b py-3 sm:border-b-0 sm:border-r sm:px-3 sm:last:border-r-0" style={{ borderColor: KEBU.border }}>
                    <p className="text-[9px] font-semibold">{title}</p><p className="mt-1 text-[8px] text-black/35">{detail}</p>
                  </Link>
                ))}
              </div>
            </section>

            <aside className="space-y-3">
              <div className="overflow-hidden rounded-[14px] border bg-[#FFF7F1] p-4" style={{ borderColor: KEBU.border }}>
                <p className="text-[22px] leading-[1.05]" style={{ fontFamily: "var(--font-fraunces)" }}>“More ideas.<br />Greater impact.”</p>
                <div className="mt-4 h-9 rounded-[9px]" style={{ background: "linear-gradient(135deg,#ff6a00,#ff1f1f,#250705)" }} />
              </div>
              <div className="rounded-[14px] border bg-white p-3.5" style={{ borderColor: KEBU.border }}>
                <div className="flex items-center justify-between"><p className="text-[11px] font-semibold">Quick actions</p><span className="text-black/25">•••</span></div>
                {[
                  ["/create/new","Create a site","Launch your online presence"],
                  ["/studio","Open in Studio","Design, build, grow"],
                  ["/analytics","Analytics","View performance"],
                  ["/people?scope=business","Team","Invite and manage"],
                  ["/shop","Payments & Shop","Commerce tools"],
                  ["/opportunity","Opportunities","Find new possibilities"],
                ].map(([href,title,detail]) => (
                  <Link key={href} href={href} className="flex items-center gap-3 border-t py-3 first:border-t-0" style={{ borderColor: KEBU.border }}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF1E9] text-[10px]" style={{ color: KEBU.orange }}>✦</span>
                    <span className="min-w-0 flex-1"><span className="block text-[9px] font-semibold">{title}</span><span className="block text-[8px] text-black/35">{detail}</span></span><span className="text-black/25">›</span>
                  </Link>
                ))}
              </div>
              <div className="rounded-[14px] border bg-white p-3.5" style={{ borderColor: KEBU.border }}>
                <div className="flex items-center justify-between"><p className="text-[11px] font-semibold">Recent activity</p><Link href="/business?tab=pulse" className="text-[8px] text-black/35">View all →</Link></div>
                {pulseItems.slice(0,4).map((item) => (
                  <Link key={item.id} href={item.href} className="block border-t py-3" style={{ borderColor: KEBU.border }}>
                    <p className="truncate text-[9px] font-semibold">{item.title}</p><p className="mt-0.5 truncate text-[8px] text-black/35">{item.businessName || item.kind}</p>
                  </Link>
                ))}
                {!pulseItems.length ? <p className="py-4 text-[9px] text-black/35">No recent business activity.</p> : null}
              </div>
              <div className="rounded-[14px] bg-[#FFF2EA] p-4">
                <p className="text-[18px] leading-[1.05]" style={{ fontFamily: "var(--font-fraunces)" }}>Explore new opportunities</p>
                <p className="mt-2 text-[9px] leading-relaxed text-black/42">Curated grants, partners and global opportunities for your businesses.</p>
                <Link href="/opportunity" className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-[9px] font-semibold">Browse opportunities →</Link>
              </div>
            </aside>
          </div>
        ) : null}
        {!loading && tab === "sites" ? (
          <div className="space-y-4">
            <Link
              href={MY_SITES_HREF}
              className="inline-flex rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
              style={{ background: KEBU.black }}
            >
              Open My Sites →
            </Link>
            <ul className="space-y-2">
              {(summary?.sites ?? []).map((s) => (
                <li key={s.id}>
                  <Link
                    href={`${MY_SITES_HREF}/${s.id}`}
                    className="block border-b py-3 text-sm font-semibold"
                    style={{ borderColor: KEBU.border }}
                  >
                    {s.title}{" "}
                    <span className="font-normal" style={{ color: KEBU.muted }}>
                      · {s.status}
                      {s.subdomain ? ` · ${s.subdomain}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {(summary?.sites ?? []).length === 0 ? (
              <p className="text-sm" style={{ color: KEBU.muted }}>
                No sites yet.{" "}
                <Link href="/create/new?mode=ai" className="underline font-semibold">
                  Describe a site to Yande
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        {!loading && tab === "analytics" ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: KEBU.muted }}>
              Last 72 hours from real site beacons. Draft-only sites show 0 until you publish and get visits.
            </p>
            {analyticsLoading ? (
              <p className="text-sm" style={{ color: KEBU.muted }}>
                Loading analytics…
              </p>
            ) : null}
            <div className="grid sm:grid-cols-2 gap-3">
              {(analyticsCards.length ? analyticsCards : (summary?.sites ?? []).map((s) => ({
                id: s.id,
                title: s.title,
                status: s.status,
                pageviews: null as number | null,
                errors: null as number | null,
                healthOk: null as boolean | null,
              }))).map((s) => (
                <Link
                  key={s.id}
                  href={`/create/${s.id}?panel=analytics`}
                  className="border-b py-4"
                  style={{ borderColor: KEBU.border }}
                >
                  <p className="font-bold text-sm">{s.title}</p>
                  {"loadError" in s && typeof (s as { loadError?: string }).loadError === "string" ? (
                    <p className="text-[11px] mt-1" style={{ color: KEBU.red }}>
                      {(s as { loadError: string }).loadError}
                    </p>
                  ) : (
                    <p className="text-[11px] mt-1" style={{ color: KEBU.muted }}>
                      {s.pageviews == null ? "—" : `${s.pageviews} views`} ·{" "}
                      {s.errors == null ? "—" : `${s.errors} errors`} ·{" "}
                      {s.healthOk == null ? "health n/a" : s.healthOk ? "healthy" : "unhealthy"} ·{" "}
                      {s.status}
                    </p>
                  )}
                </Link>
              ))}
            </div>
            {(summary?.sites ?? []).length === 0 ? (
              <p className="text-sm" style={{ color: KEBU.muted }}>
                No sites yet — analytics appear after you publish.
              </p>
            ) : null}
            <Link href="/shop" className="text-sm font-bold underline" style={{ color: KEBU.orange }}>
              Shop commerce analytics →
            </Link>
          </div>
        ) : null}

        {!loading && tab === "messages" ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: KEBU.muted }}>
              Customer shop threads across your sites. Reply in Shop → Messages for that store.
            </p>
            <Link
              href="/messages"
              className="inline-flex rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
              style={{ background: KEBU.orange }}
            >
              Full inbox →
            </Link>
            {messagesLoading ? (
              <p className="text-sm" style={{ color: KEBU.muted }}>
                Loading messages…
              </p>
            ) : null}
            {!messagesLoading && messagePreviews.length === 0 ? (
              <p className="text-sm" style={{ color: KEBU.muted }}>
                No customer messages yet. When shoppers write from a live store, threads show here.
              </p>
            ) : null}
            <ul className="space-y-2">
              {messagePreviews.slice(0, 12).map((t) => (
                <li key={`${t.projectId}-${t.id}`}>
                  <Link
                    href={`/shop/${t.projectId}?tab=messages`}
                    className="block border-b py-3"
                    style={{ borderColor: KEBU.border }}
                  >
                    <p className="text-sm font-semibold">{t.subject || "Conversation"}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: KEBU.muted }}>
                      {t.siteTitle} · {t.status}
                      {t.last_message_at
                        ? ` · ${new Date(t.last_message_at).toLocaleString()}`
                        : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!loading && tab === "you" ? (
          <div className="space-y-3">
            {[
              { href: "/account", t: "My Account", d: "Personal info, IDs, password, billing" },
              { href: "/dashboard", t: "Your Kebu home", d: "Personal overview & opportunity" },
              { href: "/welcome", t: "Personalize", d: "Afri ID / eligibility path" },
              { href: "/create/aesthetics", t: "Aesthetic store", d: "Looks for sites — not your owner brands" },
              { href: "/studio", t: "Kebu Studio", d: "Graphics & video" },
              { href: "/b2b", t: "Alkebulan B2B", d: "Trade partners — separate from My Space ops" },
            ].map((row) => (
              <Link
                key={row.href}
                href={row.href}
                className="flex justify-between gap-3 border-b py-3"
                style={{ borderColor: KEBU.border }}
              >
                <span>
                  <span className="block text-sm font-semibold">{row.t}</span>
                  <span className="block text-[11px]" style={{ color: KEBU.muted }}>
                    {row.d}
                  </span>
                </span>
                <span style={{ color: KEBU.orange }}>→</span>
              </Link>
            ))}
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}

export default function BusinessListPage() {
  return (
    <Suspense fallback={<AppShell title="My Space"><p className="p-8 text-sm opacity-60">Loading…</p></AppShell>}>
      <MySpaceInner />
    </Suspense>
  );
}
