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
  const tabParam = search.get("tab") as TabId | null;
  const [tab, setTab] = useState<TabId>(
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "pulse",
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
      setTab("pulse");
      router.replace("/business?tab=pulse", { scroll: false });
      return;
    }
    if (tabParam && TABS.some((t) => t.id === tabParam)) setTab(tabParam);
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
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] mb-2" style={{ color: KEBU.orange }}>
          My KEBU
        </p>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          My Businesses
        </h1>
        <p className="text-sm mb-6 max-w-2xl" style={{ color: KEBU.muted }}>
          Each business is its own workspace (May Lecor, K-Direction, DkLNS…). Pulse keeps you updated across all of
          them — orders, messages, sites. Open a business to run only that brand.
        </p>

        <div
          className="flex flex-wrap gap-1 mb-8 p-1 rounded-xl"
          style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
          role="tablist"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => selectTab(t.id)}
              className="rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider"
              style={{
                background: tab === t.id ? KEBU.orange : "transparent",
                color: tab === t.id ? KEBU.white : KEBU.black,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { n: pulseStats?.pendingOrders ?? 0, l: "Orders to fulfill", href: "/shop" },
                { n: pulseStats?.openMessages ?? 0, l: "Open messages", href: "/messages" },
                { n: businesses.length, l: "Businesses", href: "/business?tab=businesses" },
                { n: pulseStats?.shopsOpen ?? 0, l: "Shops open", href: "/shop" },
              ].map((s) => (
                <Link
                  key={s.l}
                  href={s.href}
                  className="rounded-2xl p-4"
                  style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
                >
                  <p className="text-2xl font-black" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.orange }}>
                    {s.n}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider mt-1">{s.l}</p>
                </Link>
              ))}
            </div>
            <section className="rounded-2xl p-5" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
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
                <ul className="space-y-2">
                  {pulseItems.slice(0, 16).map((u) => (
                    <li key={u.id}>
                      <Link href={u.href} className="block rounded-xl px-3 py-2.5 hover:bg-black/[0.03]">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
                          {u.kind}
                          {u.businessName ? ` · ${u.businessName}` : ""}
                        </span>
                        <span className="block text-sm font-semibold">{u.title}</span>
                        <span className="block text-xs mt-0.5" style={{ color: KEBU.muted }}>
                          {u.body}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {(summary?.updates ?? []).length > 0 ? (
              <section className="rounded-2xl p-5" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
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
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/business/register"
                className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
                style={{ background: KEBU.orange }}
              >
                Register a business
              </Link>
              <Link
                href="/ka-score"
                className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ border: `1px solid ${KEBU.border}` }}
              >
                KA Score
              </Link>
            </div>
            {businesses.length === 0 ? (
              <p className="text-sm" style={{ color: KEBU.muted }}>
                No Kebu ID yet. Register when you’re ready — it lives here, not mixed into Aesthetics.
              </p>
            ) : (
              <ul className="space-y-3">
                {businesses.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/business/${b.id}`}
                      className="block rounded-2xl p-4"
                      style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
                    >
                      <p className="font-bold">{b.trading_name || b.legal_name}</p>
                      <p className="text-xs font-mono mt-1" style={{ color: KEBU.orange }}>
                        {b.public_kebu_id}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: KEBU.muted }}>
                        {b.country_code} · {b.lifecycle_status}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
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
                    className="block rounded-xl px-4 py-3 text-sm font-semibold"
                    style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
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
                  className="rounded-2xl p-4"
                  style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
                >
                  <p className="font-bold text-sm">{s.title}</p>
                  {"loadError" in s && s.loadError ? (
                    <p className="text-[11px] mt-1" style={{ color: KEBU.red }}>
                      {s.loadError}
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
                    className="block rounded-xl px-4 py-3"
                    style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
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
                className="flex justify-between gap-3 rounded-xl px-4 py-3"
                style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
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
