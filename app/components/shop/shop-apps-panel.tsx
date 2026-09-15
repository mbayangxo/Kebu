"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type AiUsage = {
  tier: string;
  planName: string;
  ai: { used: number; limit: number; remaining: number; periodStart: string } | null;
};

function YandeCreditsCard({ projectId }: { projectId: string }) {
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/account/usage", { credentials: "include" })
      .then((r) => r.json().catch(() => ({})))
      .then((d: AiUsage) => setUsage(d))
      .catch(() => null);
  }, []);

  const ai = usage?.ai;
  const limit = ai?.limit ?? 0;
  const used = ai?.used ?? 0;
  const remaining = ai?.remaining ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const PLAN_UPGRADE_NAMES: Record<string, string> = {
    free: "Kebu Starter",
    starter: "Kebu Shop",
    shop: "Kebu Business",
    business: "Kebu Pro",
  };
  const nextPlan = PLAN_UPGRADE_NAMES[usage?.tier ?? "free"] ?? "Kebu Shop";

  return (
    <div
      className="col-span-full rounded-2xl border-2 p-4 space-y-3"
      style={{ borderColor: KEBU.orange, background: "linear-gradient(135deg, #fff8f3 0%, #fff 100%)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold" style={{ color: KEBU.black }}>Yande AI</p>
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white" style={{ background: KEBU.orange }}>
              Built-in
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
            AI website builder
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="text-[11px] font-bold underline shrink-0"
          style={{ color: KEBU.orange }}
        >
          {expanded ? "Close" : "View credits"}
        </button>
      </div>

      <p className="text-xs leading-relaxed" style={{ color: KEBU.muted }}>
        Yande designs complete storefronts from a description — sections, content, colours — and refines on your instruction.
        Each AI generation uses one credit from your monthly plan allowance.
      </p>

      <ul className="space-y-1">
        {["Describe your shop, Yande builds it", "Iterate: say what to change, Yande updates", "No design skills needed"].map((f) => (
          <li key={f} className="flex items-start gap-2 text-[11px]" style={{ color: KEBU.black }}>
            <span style={{ color: KEBU.orange }}>✓</span>{f}
          </li>
        ))}
      </ul>

      {expanded ? (
        <div className="rounded-xl p-3 space-y-3" style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}>
          {usage === null ? (
            <p className="text-xs" style={{ color: KEBU.muted }}>Loading usage…</p>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: KEBU.black }}>
                  <strong>{used}</strong> of <strong>{limit > 0 ? limit : "∞"}</strong> AI generations used this month
                </span>
                <span className="font-bold" style={{ color: remaining === 0 && limit > 0 ? "#dc2626" : KEBU.orange }}>
                  {limit > 0 ? `${remaining} left` : "Unlimited"}
                </span>
              </div>
              {limit > 0 ? (
                <div className="h-2 w-full rounded-full" style={{ background: KEBU.border }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, background: pct >= 90 ? "#dc2626" : KEBU.orange }}
                  />
                </div>
              ) : null}
              <p className="text-[10px]" style={{ color: KEBU.muted }}>
                Plan: <strong>{usage.planName}</strong>
                {" · "}
                Resets 1st of each month
              </p>
              {remaining === 0 && limit > 0 ? (
                <div className="rounded-xl p-3" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <p className="text-xs font-semibold text-red-800">You&apos;ve used all your AI credits this month.</p>
                  <p className="mt-1 text-[11px]" style={{ color: "#8B1E1E" }}>
                    Upgrade to {nextPlan} for more AI generations, or wait until next month.
                  </p>
                  <Link
                    href={`/create/${projectId}?tab=billing`}
                    className="mt-2 inline-block rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ background: "#dc2626" }}
                  >
                    Upgrade plan →
                  </Link>
                </div>
              ) : remaining <= 2 && limit > 0 ? (
                <div className="rounded-xl p-2" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                  <p className="text-[11px] font-semibold" style={{ color: "#92400e" }}>
                    Only {remaining} credit{remaining !== 1 ? "s" : ""} left. Upgrade to {nextPlan} for more.
                  </p>
                  <Link
                    href={`/create/${projectId}?tab=billing`}
                    className="mt-1 inline-block text-[10px] font-bold underline"
                    style={{ color: "#d97706" }}
                  >
                    Upgrade →
                  </Link>
                </div>
              ) : null}
              <p className="text-[10px]" style={{ color: KEBU.faint }}>
                Credits are per Kebu account, shared across all your sites. Yande is in the builder — open any site to use it.
              </p>
            </>
          )}
        </div>
      ) : null}

      <Link
        href={`/create/${projectId}`}
        className="inline-block rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
        style={{ background: KEBU.black }}
      >
        Open builder → use Yande
      </Link>
    </div>
  );
}

type App = {
  id: string;
  name: string;
  category: string;
  description: string;
  badgeLabel?: string;
  badgeColor?: string;
  connected: boolean;
  connectLabel: string;
  connectHref?: string;
  connectTab?: string;
  features: string[];
};

const APPS: App[] = [
  {
    id: "wave",
    name: "Wave Money",
    category: "Payments",
    description: "Accept Wave payments instantly. No bank account needed. Most popular wallet in West Africa.",
    badgeLabel: "Recommended",
    badgeColor: "#1d4ed8",
    connected: false,
    connectLabel: "Configure",
    connectTab: "payments",
    features: ["Zero transaction fees for customers", "Instant settlement to merchant wallet", "Works offline via USSD fallback"],
  },
  {
    id: "orange_money",
    name: "Orange Money",
    category: "Payments",
    description: "Accept Orange Money mobile payments across CI, SN, ML, CM, and 13 other countries.",
    connected: false,
    connectLabel: "Configure",
    connectTab: "payments",
    features: ["20+ African countries covered", "Business API with instant confirmation", "Low data — works on 2G"],
  },
  {
    id: "mtn_momo",
    name: "MTN Mobile Money",
    category: "Payments",
    description: "MTN MoMo is the leading wallet in Ghana, Nigeria, Cameroon, Uganda, and Rwanda.",
    connected: false,
    connectLabel: "Configure",
    connectTab: "payments",
    features: ["East and West Africa coverage", "Real-time payment notifications", "Business dashboard for reconciliation"],
  },
  {
    id: "dhl",
    name: "DHL Express",
    category: "Shipping",
    description: "International shipping with real-time tracking. Best for diaspora customers in Europe and USA.",
    connected: false,
    connectLabel: "Coming soon",
    features: ["220+ country delivery", "Pickup from your location", "Automated tracking via Kebu"],
  },
  {
    id: "whatsapp_business",
    name: "WhatsApp Business",
    category: "Marketing",
    description: "Send order confirmations, cart recovery messages, and promotions via WhatsApp. Already works in Kebu without setup.",
    badgeLabel: "Built-in",
    badgeColor: "#15803d",
    connected: true,
    connectLabel: "Already active",
    features: ["Auto order confirmation links", "Cart recovery via WhatsApp", "Direct customer chat link from store"],
  },
  {
    id: "kebu_reach",
    name: "Kebu Reach",
    category: "Marketing",
    description: "Run targeted SMS and WhatsApp campaigns to your customer segments. Reach buyers who haven't ordered in 90 days.",
    badgeLabel: "Coming soon",
    badgeColor: KEBU.orange,
    connected: false,
    connectLabel: "Notify me",
    features: ["Segment-based targeting", "Bulk WhatsApp outreach", "Conversion tracking per campaign"],
  },
  {
    id: "kebu_analytics",
    name: "Kebu Site Analytics",
    category: "Analytics",
    description: "Privacy-first analytics built into your Kebu site. See page views, countries, and visitor sources without cookies.",
    badgeLabel: "Built-in",
    badgeColor: "#15803d",
    connected: true,
    connectLabel: "View in Analytics",
    connectTab: "analytics",
    features: ["No cookie consent needed", "Works with ad blockers", "Country and city breakdown"],
  },
  {
    id: "google_analytics",
    name: "Google Analytics 4",
    category: "Analytics",
    description: "Add your GA4 measurement ID to get funnel analysis, conversion events, and audience insights.",
    connected: false,
    connectLabel: "Add GA4 ID",
    connectTab: "payments",
    features: ["Full funnel tracking", "Google Ads integration", "Audience export for remarketing"],
  },
  {
    id: "facebook_pixel",
    name: "Meta Pixel",
    category: "Marketing",
    description: "Connect your Meta Pixel to track purchases and run retargeting ads on Facebook and Instagram.",
    connected: false,
    connectLabel: "Add Pixel ID",
    connectTab: "payments",
    features: ["Purchase event tracking", "Lookalike audience creation", "Instagram Shopping integration"],
  },
  {
    id: "kebu_reviews",
    name: "Kebu Reviews",
    category: "Trust",
    description: "Collect verified buyer reviews with photo uploads. Show social proof on your product pages.",
    badgeLabel: "Built-in",
    badgeColor: "#15803d",
    connected: true,
    connectLabel: "Manage reviews",
    connectTab: "reviews",
    features: ["Photo review uploads", "Verified purchase badge", "Auto-request after fulfillment"],
  },
  {
    id: "kebu_subscriptions",
    name: "Kebu Subscriptions",
    category: "Recurring revenue",
    description: "Offer weekly, monthly, or seasonal recurring orders. Perfect for food boxes, beauty kits, or newsletters.",
    badgeLabel: "Built-in",
    badgeColor: "#15803d",
    connected: true,
    connectLabel: "Manage subscriptions",
    connectTab: "subscriptions",
    features: ["Flexible billing intervals", "Customer self-management portal", "Automatic renewal reminders"],
  },
  {
    id: "kebu_gift_cards",
    name: "Kebu Gift Cards",
    category: "Sales",
    description: "Sell digital gift cards redeemable in your store. Great for holidays and special occasions.",
    badgeLabel: "Built-in",
    badgeColor: "#15803d",
    connected: true,
    connectLabel: "Manage gift cards",
    connectTab: "gift-cards",
    features: ["Unique code per card", "Balance tracking", "PDF gift card design"],
  },
];

const CATEGORIES = [...new Set(APPS.map((a) => a.category))];

export function ShopAppsPanel({ projectId }: { projectId: string }) {
  const [filter, setFilter] = useState<string>("all");
  const [connectedIds, setConnectedIds] = useState<Set<string>>(
    new Set(APPS.filter((a) => a.connected).map((a) => a.id)),
  );

  // Load actual payment adapters to determine connection status
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/payment-adapters`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.adapters)) {
        const enabledIds = new Set<string>(
          (data.adapters as { provider: string; enabled: boolean }[])
            .filter((a) => a.enabled)
            .map((a) => a.provider),
        );
        setConnectedIds((prev) => {
          const next = new Set(prev);
          for (const app of APPS) {
            if (enabledIds.has(app.id)) next.add(app.id);
          }
          return next;
        });
      }
    } catch {
      // ignore
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = filter === "all" ? APPS : APPS.filter((a) => a.category === filter);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
          Apps &amp; integrations
        </p>
        <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
          Connect your store to payments, shipping, marketing, and analytics tools — all built for African markets.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: filter === cat ? KEBU.black : "transparent",
              color: filter === cat ? "#fff" : KEBU.muted,
              border: filter === cat ? "none" : `1px solid ${KEBU.border}`,
            }}
          >
            {cat === "all" ? "All" : cat}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filter === "all" ? <YandeCreditsCard projectId={projectId} /> : null}
        {visible.map((app) => {
          const isConnected = connectedIds.has(app.id);
          return (
            <div
              key={app.id}
              className="rounded-2xl border p-4 flex flex-col gap-3"
              style={{
                borderColor: isConnected ? KEBU.orange : KEBU.border,
                background: isConnected ? "#fff8f3" : "#fff",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold" style={{ color: KEBU.black }}>
                      {app.name}
                    </p>
                    {app.badgeLabel ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
                        style={{ background: app.badgeColor ?? KEBU.muted }}
                      >
                        {app.badgeLabel}
                      </span>
                    ) : null}
                    {isConnected && !app.badgeLabel ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                        style={{ background: "#dcfce7", color: "#15803d" }}
                      >
                        Connected
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                    {app.category}
                  </p>
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: KEBU.muted }}>
                {app.description}
              </p>

              <ul className="space-y-1">
                {app.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[11px]" style={{ color: KEBU.black }}>
                    <span style={{ color: KEBU.orange }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {app.connectTab ? (
                <Link
                  href={`/shop/${projectId}?tab=${app.connectTab}`}
                  className="mt-auto inline-block rounded-full px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: isConnected ? KEBU.muted : KEBU.black }}
                >
                  {app.connectLabel}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-auto rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40"
                  style={{ background: KEBU.cream, color: KEBU.muted }}
                >
                  {app.connectLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="rounded-2xl p-4 text-xs"
        style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
      >
        <p className="font-semibold" style={{ color: KEBU.black }}>
          Request an integration
        </p>
        <p className="mt-1">
          Need a payment method, shipping carrier, or tool not listed here? Message Kebu support and
          we&rsquo;ll prioritize integrations that serve African merchants most.
        </p>
      </div>
    </div>
  );
}
