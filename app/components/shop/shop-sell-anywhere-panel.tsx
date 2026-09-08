"use client";

import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";
import { ShareOrderCard } from "@/app/components/shop/share-order-card";
import type { SiteCommerce } from "@/lib/create/site-commerce";

type Channel = {
  id: string;
  label: string;
  description: string;
  status: "live" | "partial" | "not_implemented";
  href?: string;
};

const CHANNELS: Channel[] = [
  {
    id: "kebu-store",
    label: "Kebu Store",
    description: "Your published website and live shop checkout.",
    status: "live",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Orders and recovery via WhatsApp — multi-line cart and merchant reply.",
    status: "live",
  },
  {
    id: "wave-joko",
    label: "Wave · JOKO",
    description: "Share Wave / JOKO pay links + QR — customers pay the way Senegal pays.",
    status: "live",
  },
  {
    id: "social",
    label: "Social link cards",
    description: "Instagram, TikTok, Facebook, Snapchat — paste the same order link or QR.",
    status: "live",
  },
  {
    id: "search",
    label: "Kebu Search",
    description: "Continent-scale product discovery when Search is assigned.",
    status: "not_implemented",
  },
  {
    id: "rect",
    label: "RECT",
    description: "Entertainment and streaming commerce channel.",
    status: "not_implemented",
  },
  {
    id: "physical",
    label: "Physical store / QR",
    description: "Print the QR from Share to sell — booth, packaging, shop counter.",
    status: "live",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    description: "Third-party marketplaces with centralized order sync.",
    status: "not_implemented",
  },
];

const STATUS = {
  live: { label: "Live", bg: "rgba(0,200,81,0.12)", color: "#009E40" },
  partial: { label: "Partial", bg: "rgba(255,85,0,0.12)", color: KEBU.orange },
  not_implemented: { label: "Not implemented", bg: "rgba(10,10,10,0.06)", color: KEBU.muted },
} as const;

/**
 * Sell Anywhere — one inventory, one order system, one customer record, one analytics system.
 * Senegal-first share paths are actionable when the site is live.
 */
export function ShopSellAnywherePanel({
  projectId,
  liveUrl,
  commerce,
  businessName,
}: {
  projectId: string;
  liveUrl?: string | null;
  commerce?: SiteCommerce | null;
  businessName?: string;
}) {
  const storeHref = liveUrl ?? undefined;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
          Sell anywhere
        </p>
        <h2 className="mt-1 text-lg font-bold" style={{ color: KEBU.black }}>
          One catalog · one order system
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          Share one link or QR. Customers order on WhatsApp and pay with Wave or JOKO — the same catalog you
          manage here. Paste the link on Instagram, TikTok, Facebook, or Snapchat.
        </p>
      </div>

      {storeHref ? (
        <ShareOrderCard
          payload={{ storeUrl: storeHref, businessName: businessName ?? "My shop" }}
          commerce={commerce}
        />
      ) : (
        <div
          className="rounded-2xl p-4 text-sm"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="font-semibold">Publish your site to unlock share links + QR</p>
          <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
            After go-live, this panel shows WhatsApp, Wave, JOKO, and social link cards.
          </p>
          <Link
            href={`/create/${projectId}`}
            className="mt-3 inline-block text-[11px] font-bold uppercase tracking-wider underline"
            style={{ color: KEBU.orange }}
          >
            Open builder
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {CHANNELS.map((ch) => {
          const s = STATUS[ch.status];
          const href =
            ch.id === "kebu-store" && storeHref
              ? storeHref
              : ch.id === "wave-joko" || ch.id === "social" || ch.id === "physical"
                ? `/shop/${projectId}?tab=payments`
                : ch.href;
          const card = (
            <>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {ch.label}
                </h3>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: s.bg, color: s.color }}
                >
                  {s.label}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: KEBU.muted }}>
                {ch.description}
              </p>
              {href && ch.status !== "not_implemented" ? (
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
                  Open →
                </p>
              ) : null}
            </>
          );

          if (href && ch.status !== "not_implemented") {
            const external = href.startsWith("http");
            if (external) {
              return (
                <a
                  key={ch.id}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl p-4 transition-shadow hover:shadow-md"
                  style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
                >
                  {card}
                </a>
              );
            }
            return (
              <Link
                key={ch.id}
                href={href}
                className="block rounded-2xl p-4 transition-shadow hover:shadow-md"
                style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
              >
                {card}
              </Link>
            );
          }

          return (
            <div
              key={ch.id}
              className="rounded-2xl p-4"
              style={{ border: `1px solid ${KEBU.border}`, background: "#fff", opacity: 0.85 }}
            >
              {card}
            </div>
          );
        })}
      </div>

      <div
        className="rounded-2xl p-4 text-sm leading-relaxed"
        style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
      >
        <p className="font-semibold" style={{ color: KEBU.black }}>
          Architecture principle
        </p>
        <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
          Product · inventory · customer · order · analytics stay centralized. Channel adapters (WhatsApp, Wave,
          JOKO, social, QR) plug in per country. Senegal ships first; other African markets reuse the same core.
        </p>
        <Link
          href={`/shop/${projectId}?tab=products`}
          className="mt-3 inline-block text-[11px] font-bold uppercase tracking-wider underline"
          style={{ color: KEBU.orange }}
        >
          Manage catalog
        </Link>
      </div>
    </div>
  );
}
