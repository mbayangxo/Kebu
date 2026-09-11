"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { SiteProductsPanel } from "@/app/components/create/site-products-panel";
import { ShopCollectionsPanel } from "@/app/components/shop/shop-collections-panel";
import { ShopOrdersPanel } from "@/app/components/shop/shop-orders-panel";
import { ShopPaymentsPanel } from "@/app/components/shop/shop-payments-panel";
import { ShopPagesPanel } from "@/app/components/shop/shop-pages-panel";
import { ShopCustomersPanel } from "@/app/components/shop/shop-customers-panel";
import { ShopSegmentsPanel } from "@/app/components/shop/shop-segments-panel";
import { ShopCompaniesPanel } from "@/app/components/shop/shop-companies-panel";
import { ShopDraftOrdersPanel } from "@/app/components/shop/shop-draft-orders-panel";
import { ShopShippingPanel } from "@/app/components/shop/shop-shipping-panel";
import { ShopDiscountsPanel } from "@/app/components/shop/shop-discounts-panel";
import { ShopAbandonedCartsPanel } from "@/app/components/shop/shop-abandoned-carts-panel";
import { ShopMessagesPanel } from "@/app/components/shop/shop-messages-panel";
import { ShopAnalyticsPanel } from "@/app/components/shop/shop-analytics-panel";
import { ShopPayoutsPanel } from "@/app/components/shop/shop-payouts-panel";
import { ShopExpensesPanel } from "@/app/components/shop/shop-expenses-panel";
import { ShopSellAnywherePanel } from "@/app/components/shop/shop-sell-anywhere-panel";
import { ShopGiftCardsPanel } from "@/app/components/shop/shop-gift-cards-panel";
import { ShopReviewsPanel } from "@/app/components/shop/shop-reviews-panel";
import { ShopReviewRequestsPanel } from "@/app/components/shop/shop-review-requests-panel";
import { ShopSubscriptionsPanel } from "@/app/components/shop/shop-subscriptions-panel";
import { ShopOverviewPanel } from "@/app/components/shop/shop-overview-panel";
import { ShopStoreSwitcher } from "@/app/components/shop/shop-store-switcher";
import { ShopNotificationsBell } from "@/app/components/shop/shop-notifications-bell";
import { ShopMarketsPanel } from "@/app/components/shop/shop-markets-panel";
import { ShopAppsPanel } from "@/app/components/shop/shop-apps-panel";
import { ShopPurchaseOrdersPanel } from "@/app/components/shop/shop-purchase-orders-panel";
import { BusinessTeamPanel } from "@/app/components/business/business-team-panel";
import { mergeSiteCommerce, type SiteCommerce } from "@/lib/create/site-commerce";
import { liveSiteUrl } from "@/lib/create/site-urls";
import { defaultSiteSeo, type SiteSeo } from "@/lib/create/site-seo";
import { KEBU } from "@/lib/kebu-brand";
import { resolveClientDataMode } from "@/lib/create/data-mode";
import { evaluateKb, measureResponseBytes } from "@/lib/create/kb-budget";

type ShopTab =
  | "overview"
  | "products"
  | "collections"
  | "orders"
  | "payments"
  | "pages"
  | "customers"
  | "discounts"
  | "abandoned"
  | "messages"
  | "analytics"
  | "sell"
  | "gift-cards"
  | "reviews"
  | "subscriptions"
  | "markets"
  | "apps"
  | "team";

const TABS: { id: ShopTab; label: string }[] = [
  { id: "overview", label: "Dashboard" },
  { id: "products", label: "Products" },
  { id: "collections", label: "Collections" },
  { id: "pages", label: "Pages" },
  { id: "orders", label: "Orders" },
  { id: "analytics", label: "Analytics" },
  { id: "customers", label: "Customers" },
  { id: "markets", label: "Markets" },
  { id: "gift-cards", label: "Gift cards" },
  { id: "reviews", label: "Reviews" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "discounts", label: "Discounts" },
  { id: "sell", label: "Sell anywhere" },
  { id: "apps", label: "Apps" },
  { id: "messages", label: "Messages" },
  { id: "abandoned", label: "Abandoned" },
  { id: "payments", label: "Payments" },
  { id: "team", label: "Team" },
];

// Sub-tab configs per main tab
type SubTab = { id: string; label: string };
const SUB_TABS: Partial<Record<ShopTab, SubTab[]>> = {
  customers: [
    { id: "all", label: "All customers" },
    { id: "segments", label: "Segments" },
    { id: "companies", label: "Companies" },
  ],
  orders: [
    { id: "all", label: "All orders" },
    { id: "drafts", label: "Drafts" },
    { id: "shipping", label: "Shipping" },
  ],
  analytics: [
    { id: "overview", label: "Overview" },
    { id: "payouts", label: "Payouts" },
    { id: "expenses", label: "Expenses" },
  ],
  products: [
    { id: "all", label: "Products" },
    { id: "purchase-orders", label: "Purchase orders" },
  ],
  reviews: [
    { id: "all", label: "Reviews" },
    { id: "requests", label: "Review requests" },
  ],
};

function parseTab(raw: string | null): ShopTab {
  if (
    raw === "overview" ||
    raw === "orders" ||
    raw === "collections" ||
    raw === "payments" ||
    raw === "products" ||
    raw === "pages" ||
    raw === "customers" ||
    raw === "discounts" ||
    raw === "abandoned" ||
    raw === "messages" ||
    raw === "analytics" ||
    raw === "sell" ||
    raw === "gift-cards" ||
    raw === "reviews" ||
    raw === "subscriptions" ||
    raw === "markets" ||
    raw === "apps" ||
    raw === "team"
  ) {
    return raw;
  }
  return "overview";
}

function parseSub(tab: ShopTab, raw: string | null): string {
  const subs = SUB_TABS[tab];
  if (!subs) return "";
  const found = subs.find((s) => s.id === raw);
  return found ? found.id : subs[0]?.id ?? "";
}

/**
 * Per-storefront shop admin — Shopify-style tabs: Products · Orders · Analytics · Customers · Markets · Apps.
 */
export default function ShopAdminPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const sub = parseSub(tab, searchParams.get("sub"));

  const [title, setTitle] = useState("Shop");
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [seo, setSeo] = useState<SiteSeo>(() => defaultSiteSeo());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);

  const commerce: SiteCommerce = mergeSiteCommerce(seo.commerce);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mode = resolveClientDataMode();
      const res = await fetch(`/api/projects/${projectId}`, {
        credentials: "include",
        headers: { "X-Kebu-Data-Mode": mode },
      });
      const bytes = await measureResponseBytes(res);
      const kb = evaluateKb({ action: "open_shop", mode, usedBytes: bytes });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/shop/${projectId}`);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Shop not found.");
        return;
      }
      setTitle(data.project?.title ?? "Shop");
      setSubdomain(data.project?.subdomain ?? null);
      setBusinessId(typeof data.project?.business_id === "string" ? data.project.business_id : null);
      const nextSeo = data.project?.seo;
      if (nextSeo && typeof nextSeo === "object") {
        setSeo({
          ...defaultSiteSeo(),
          ...nextSeo,
          commerce: mergeSiteCommerce((nextSeo as SiteSeo).commerce),
        });
      }
      setNote(kb.summary);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  function setTab(next: ShopTab) {
    router.replace(`/shop/${projectId}?tab=${next}`);
  }

  function setSubTab(nextSub: string) {
    router.replace(`/shop/${projectId}?tab=${tab}&sub=${nextSub}`);
  }

  async function ensureProductsOnSite() {
    setAddingSection(true);
    setNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/sections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "products" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(typeof data.error === "string" ? data.error : "Could not add products block.");
        return;
      }
      setNote("Products block added to your website. Open the builder to pick a grid layout, then publish.");
    } finally {
      setAddingSection(false);
    }
  }

  const subTabs = SUB_TABS[tab] ?? [];

  return (
    <AppShell title={title}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
          Kebu Shop
        </p>
        <h1
          className="mt-2 text-3xl font-bold"
          style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
        >
          {title}
        </h1>
        <p className="mt-1 text-xs font-mono" style={{ color: KEBU.muted }}>
          {subdomain ? `${subdomain}.kebu.africa` : "Set a site address in the builder"}
        </p>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/shop"
              className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black }}
            >
              All shops
            </Link>
            <Link
              href={`/create/${projectId}`}
              className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ background: KEBU.black }}
            >
              Edit website / shop layout
            </Link>
            <button
              type="button"
              disabled={addingSection}
              onClick={() => void ensureProductsOnSite()}
              className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
              style={{ background: KEBU.orange }}
            >
              {addingSection ? "Adding…" : "Show products on website"}
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <ShopStoreSwitcher currentProjectId={projectId} currentTitle={title} />
            <ShopNotificationsBell projectId={projectId} />
          </div>
        </div>

        <nav
          className="mt-8 flex gap-1 overflow-x-auto rounded-full p-1"
          style={{ background: "#F4F4F5" }}
          aria-label="Shop sections"
        >
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="shrink-0 rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider"
                style={{
                  background: on ? KEBU.black : "transparent",
                  color: on ? "#fff" : KEBU.muted,
                }}
                aria-current={on ? "page" : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Sub-tabs row */}
        {subTabs.length > 0 ? (
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {subTabs.map((s) => {
              const on = sub === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubTab(s.id)}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: on ? KEBU.orange : "transparent",
                    color: on ? "#fff" : KEBU.muted,
                    border: on ? "none" : `1px solid ${KEBU.border}`,
                  }}
                  aria-current={on ? "page" : undefined}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {note ? (
          <p className="mt-4 rounded-xl px-3 py-2 text-xs" style={{ background: KEBU.cream, color: KEBU.black }}>
            {note}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-8 text-sm" style={{ color: KEBU.muted }}>
            Loading…
          </p>
        ) : error ? (
          <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : (
          <div
            className="mt-6 rounded-2xl bg-white p-4 sm:p-6"
            style={{ border: `1px solid ${KEBU.border}` }}
          >
            {tab === "overview" ? <ShopOverviewPanel projectId={projectId} /> : null}

            {/* Products with sub-tabs */}
            {tab === "products" && sub !== "purchase-orders" ? (
              <SiteProductsPanel projectId={projectId} />
            ) : null}
            {tab === "products" && sub === "purchase-orders" ? (
              <ShopPurchaseOrdersPanel projectId={projectId} />
            ) : null}

            {tab === "collections" ? <ShopCollectionsPanel projectId={projectId} /> : null}
            {tab === "pages" ? <ShopPagesPanel projectId={projectId} /> : null}

            {/* Orders with sub-tabs */}
            {tab === "orders" && sub !== "drafts" && sub !== "shipping" ? (
              <ShopOrdersPanel projectId={projectId} embedded />
            ) : null}
            {tab === "orders" && sub === "drafts" ? (
              <ShopDraftOrdersPanel projectId={projectId} />
            ) : null}
            {tab === "orders" && sub === "shipping" ? (
              <ShopShippingPanel projectId={projectId} />
            ) : null}

            {/* Analytics with sub-tabs */}
            {tab === "analytics" && sub !== "payouts" && sub !== "expenses" ? (
              <ShopAnalyticsPanel projectId={projectId} embedded />
            ) : null}
            {tab === "analytics" && sub === "payouts" ? (
              <ShopPayoutsPanel projectId={projectId} />
            ) : null}
            {tab === "analytics" && sub === "expenses" ? (
              <ShopExpensesPanel projectId={projectId} />
            ) : null}

            {/* Customers with sub-tabs */}
            {tab === "customers" && sub !== "segments" && sub !== "companies" ? (
              <ShopCustomersPanel projectId={projectId} businessId={businessId} />
            ) : null}
            {tab === "customers" && sub === "segments" ? (
              <ShopSegmentsPanel projectId={projectId} />
            ) : null}
            {tab === "customers" && sub === "companies" ? (
              <ShopCompaniesPanel projectId={projectId} />
            ) : null}

            {tab === "markets" ? <ShopMarketsPanel projectId={projectId} /> : null}

            {tab === "gift-cards" ? <ShopGiftCardsPanel projectId={projectId} /> : null}
            {tab === "reviews" && sub !== "requests" ? <ShopReviewsPanel projectId={projectId} /> : null}
            {tab === "reviews" && sub === "requests" ? (
              <ShopReviewRequestsPanel projectId={projectId} storeName={title} />
            ) : null}
            {tab === "subscriptions" ? <ShopSubscriptionsPanel projectId={projectId} /> : null}
            {tab === "discounts" ? (
              <ShopDiscountsPanel projectId={projectId} businessId={businessId} />
            ) : null}
            {tab === "sell" ? (
              <ShopSellAnywherePanel
                projectId={projectId}
                liveUrl={liveSiteUrl(subdomain)}
                commerce={commerce}
                businessName={title}
              />
            ) : null}
            {tab === "apps" ? <ShopAppsPanel projectId={projectId} /> : null}
            {tab === "messages" ? <ShopMessagesPanel projectId={projectId} embedded /> : null}
            {tab === "abandoned" ? (
              <ShopAbandonedCartsPanel projectId={projectId} embedded />
            ) : null}
            {tab === "payments" ? (
              <ShopPaymentsPanel
                projectId={projectId}
                commerce={commerce}
                onSaved={(next) =>
                  setSeo((prev) => ({
                    ...prev,
                    commerce: next,
                  }))
                }
              />
            ) : null}
            {tab === "team" ? (
              businessId ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed" style={{ color: KEBU.muted }}>
                    Invite store managers and teammates on this business. They share the Kebu ID workspace —
                    not your personal account.
                  </p>
                  <BusinessTeamPanel businessId={businessId} />
                </div>
              ) : (
                <div
                  className="rounded-2xl p-4 text-sm"
                  style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
                >
                  <p className="font-semibold">Link a Kebu ID business to invite a team</p>
                  <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
                    Create or open a business workspace, attach this site, then invite store managers here.
                  </p>
                  <Link
                    href="/business"
                    className="mt-3 inline-block text-[11px] font-bold uppercase tracking-wider underline"
                    style={{ color: KEBU.orange }}
                  >
                    Open businesses
                  </Link>
                </div>
              )
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}
