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
import { ShopSideNav, NAV_GROUPS } from "@/app/components/shop/shop-side-nav";
import { mergeSiteCommerce, type SiteCommerce } from "@/lib/create/site-commerce";
import { liveSiteUrl } from "@/lib/create/site-urls";
import { defaultSiteSeo, type SiteSeo } from "@/lib/create/site-seo";
import { resolveClientDataMode } from "@/lib/create/data-mode";
import { evaluateKb, measureResponseBytes } from "@/lib/create/kb-budget";

/* ─── URL parsing ────────────────────────────────────────────────────────── */
const VALID_TABS = new Set([
  "overview","products","collections","orders","payments","pages","customers",
  "discounts","abandoned","messages","analytics","sell","gift-cards","reviews",
  "subscriptions","markets","apps","team",
]);

function parseTab(raw: string | null): string {
  return raw && VALID_TABS.has(raw) ? raw : "overview";
}

function parseSub(tab: string, raw: string | null): string {
  if (!raw) return "";
  const VALID_SUBS: Record<string, Set<string>> = {
    orders:    new Set(["all","drafts","shipping"]),
    customers: new Set(["all","segments","companies"]),
    analytics: new Set(["overview","payouts","expenses"]),
    products:  new Set(["all","purchase-orders"]),
    reviews:   new Set(["all","requests"]),
  };
  return VALID_SUBS[tab]?.has(raw) ? raw : "";
}

/* ─── breadcrumb label ───────────────────────────────────────────────────── */
function breadcrumb(tab: string, sub: string): { group: string; item: string } {
  for (const g of NAV_GROUPS) {
    for (const item of g.items) {
      if (item.tab === tab && (item.sub ?? "") === (sub ?? "")) {
        return { group: g.label, item: item.label };
      }
    }
    // fuzzy match — if tab matches but sub doesn't, use group label
    if (g.items.some((i) => i.tab === tab)) {
      const item = g.items.find((i) => i.tab === tab) ?? g.items[0];
      return { group: g.label, item: item?.label ?? tab };
    }
  }
  return { group: "Shop", item: tab };
}

/* ─── main component ─────────────────────────────────────────────────────── */
export default function ShopAdminPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const sub = parseSub(tab, searchParams.get("sub"));

  const [title, setTitle]         = useState("Shop");
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [seo, setSeo]             = useState<SiteSeo>(() => defaultSiteSeo());
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [note, setNote]           = useState<string | null>(null);
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
      if (res.status === 401) { router.replace(`/login?next=/shop/${projectId}`); return; }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Shop not found.");
        return;
      }
      setTitle(data.project?.title ?? "Shop");
      setSubdomain(data.project?.subdomain ?? null);
      setBusinessId(typeof data.project?.business_id === "string" ? data.project.business_id : null);
      const nextSeo = data.project?.seo;
      if (nextSeo && typeof nextSeo === "object") {
        setSeo({ ...defaultSiteSeo(), ...nextSeo, commerce: mergeSiteCommerce((nextSeo as SiteSeo).commerce) });
      }
      setNote(kb.summary);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => { void load(); }, [load]);

  function navigate(nextTab: string, nextSub?: string) {
    const params = new URLSearchParams({ tab: nextTab });
    if (nextSub) params.set("sub", nextSub);
    router.replace(`/shop/${projectId}?${params.toString()}`);
  }

  async function ensureProductsOnSite() {
    setAddingSection(true);
    setNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/sections`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "products" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(typeof data.error === "string" ? data.error : "Could not add products block.");
        return;
      }
      setNote("Products block added to your website. Open the builder to pick a grid layout, then publish.");
    } finally { setAddingSection(false); }
  }

  const bc = breadcrumb(tab, sub);

  return (
    <AppShell title={title}>
      <div className="shop-layout">

        {/* ── Left sidebar nav ── */}
        <ShopSideNav
          tab={tab}
          sub={sub}
          projectId={projectId}
          title={title}
          onNavigate={navigate}
        />

        {/* ── Main content ── */}
        <div className="shop-main">

          {/* Top bar */}
          <div className="shop-topbar">
            <div className="shop-topbar-left">
              <div className="shop-topbar-eyebrow">Kebu Shop</div>
              <div className="shop-topbar-title">{title}</div>
              {subdomain && (
                <div className="shop-topbar-subtitle">{subdomain}.kebu.africa</div>
              )}
            </div>
            <div className="shop-topbar-actions">
              <ShopStoreSwitcher currentProjectId={projectId} currentTitle={title} />
              <ShopNotificationsBell projectId={projectId} />
              <Link
                href="/shop"
                className="kb-btn-ghost"
                style={{ fontSize: "0.75rem", padding: "0.4rem 0.875rem" }}
              >
                All shops
              </Link>
              <Link
                href={`/create/${projectId}`}
                className="kb-btn-primary"
                style={{ fontSize: "0.75rem", padding: "0.4rem 0.875rem" }}
              >
                Edit website
              </Link>
              <button
                type="button"
                disabled={addingSection}
                onClick={() => void ensureProductsOnSite()}
                className="kb-btn-ghost"
                style={{ fontSize: "0.75rem", padding: "0.4rem 0.875rem" }}
              >
                {addingSection ? "Adding…" : "Show products on site"}
              </button>
            </div>
          </div>

          {/* Panel area */}
          <div className="shop-panel-area">

            {/* Breadcrumb */}
            <div className="shop-panel-breadcrumb">
              <span>{bc.group}</span>
              {bc.item !== bc.group && (
                <>
                  <span className="shop-panel-breadcrumb-sep">›</span>
                  <span>{bc.item}</span>
                </>
              )}
            </div>

            {note && <div className="shop-note">{note}</div>}

            {loading ? (
              <div className="shop-panel-card panel-shell-loading">
                <div className="panel-shell-spinner" />
              </div>
            ) : error ? (
              <div className="shop-panel-card">
                <p className="panel-shell-error-msg">{error}</p>
              </div>
            ) : (
              <div className="shop-panel-card">

                {tab === "overview" && <ShopOverviewPanel projectId={projectId} />}

                {tab === "products" && sub !== "purchase-orders" && (
                  <SiteProductsPanel projectId={projectId} />
                )}
                {tab === "products" && sub === "purchase-orders" && (
                  <ShopPurchaseOrdersPanel projectId={projectId} />
                )}

                {tab === "collections" && <ShopCollectionsPanel projectId={projectId} />}
                {tab === "pages"       && <ShopPagesPanel projectId={projectId} />}

                {tab === "orders" && sub !== "drafts" && sub !== "shipping" && (
                  <ShopOrdersPanel projectId={projectId} embedded />
                )}
                {tab === "orders" && sub === "drafts"   && <ShopDraftOrdersPanel projectId={projectId} />}
                {tab === "orders" && sub === "shipping" && <ShopShippingPanel projectId={projectId} />}
                {tab === "abandoned" && <ShopAbandonedCartsPanel projectId={projectId} embedded />}

                {tab === "analytics" && sub !== "payouts" && sub !== "expenses" && (
                  <ShopAnalyticsPanel projectId={projectId} embedded />
                )}
                {tab === "analytics" && sub === "payouts"  && <ShopPayoutsPanel projectId={projectId} />}
                {tab === "analytics" && sub === "expenses" && <ShopExpensesPanel projectId={projectId} />}

                {tab === "customers" && sub !== "segments" && sub !== "companies" && (
                  <ShopCustomersPanel projectId={projectId} businessId={businessId} />
                )}
                {tab === "customers" && sub === "segments"  && <ShopSegmentsPanel projectId={projectId} />}
                {tab === "customers" && sub === "companies" && <ShopCompaniesPanel projectId={projectId} />}

                {tab === "reviews" && sub !== "requests" && <ShopReviewsPanel projectId={projectId} />}
                {tab === "reviews" && sub === "requests" && (
                  <ShopReviewRequestsPanel projectId={projectId} storeName={title} />
                )}

                {tab === "subscriptions" && <ShopSubscriptionsPanel projectId={projectId} />}
                {tab === "gift-cards"   && <ShopGiftCardsPanel projectId={projectId} />}

                {tab === "discounts" && (
                  <ShopDiscountsPanel projectId={projectId} businessId={businessId} />
                )}
                {tab === "markets"   && <ShopMarketsPanel projectId={projectId} />}
                {tab === "sell"      && (
                  <ShopSellAnywherePanel
                    projectId={projectId}
                    liveUrl={liveSiteUrl(subdomain)}
                    commerce={commerce}
                    businessName={title}
                  />
                )}
                {tab === "messages" && <ShopMessagesPanel projectId={projectId} embedded />}
                {tab === "apps"     && <ShopAppsPanel projectId={projectId} />}
                {tab === "payments" && (
                  <ShopPaymentsPanel
                    projectId={projectId}
                    commerce={commerce}
                    onSaved={(next) => setSeo((prev) => ({ ...prev, commerce: next }))}
                  />
                )}

                {tab === "team" && (
                  businessId ? (
                    <div className="space-y-4">
                      <p className="text-sm kb-text-muted leading-relaxed">
                        Invite store managers and teammates on this business.
                        They share the Kebu ID workspace — not your personal account.
                      </p>
                      <BusinessTeamPanel businessId={businessId} />
                    </div>
                  ) : (
                    <div className="kb-bg-cream kb-border rounded-xl p-5">
                      <p className="text-sm font-semibold kb-text-black">
                        Link a Kebu ID business to invite a team
                      </p>
                      <p className="mt-1 text-xs kb-text-muted">
                        Create or open a business workspace, attach this site, then invite store managers here.
                      </p>
                      <Link
                        href="/business"
                        className="mt-3 inline-block text-[11px] font-bold uppercase tracking-wider kb-text-orange underline"
                      >
                        Open businesses
                      </Link>
                    </div>
                  )
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
