"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BUILDER } from "@/lib/create/builder-ui";
import type { SiteCommerce } from "@/lib/create/site-commerce";
import { mergeSiteCommerce } from "@/lib/create/site-commerce";
import { AFRICAN_CURRENCIES } from "@/lib/create/african-currencies";

function countryFlag(cc: string): string {
  if (cc.length !== 2) return "🌍";
  const offset = 0x1f1e6 - 0x41;
  return String.fromCodePoint(cc.charCodeAt(0) + offset) + String.fromCodePoint(cc.charCodeAt(1) + offset);
}

const FEATURED_CURRENCIES = [
  { code: "XOF", flag: "🇸🇳", label: "XOF" },
  { code: "XAF", flag: "🇨🇲", label: "XAF" },
  { code: "NGN", flag: "🇳🇬", label: "₦" },
  { code: "GHS", flag: "🇬🇭", label: "GH₵" },
  { code: "KES", flag: "🇰🇪", label: "KSh" },
  { code: "MAD", flag: "🇲🇦", label: "DH" },
  { code: "ZAR", flag: "🇿🇦", label: "R" },
  { code: "EGP", flag: "🇪🇬", label: "E£" },
  { code: "USD", flag: "🇺🇸", label: "$" },
  { code: "EUR", flag: "🇪🇺", label: "€" },
  { code: "GBP", flag: "🇬🇧", label: "£" },
  { code: "CAD", flag: "🇨🇦", label: "CA$" },
];
const FEATURED_CODES = new Set(FEATURED_CURRENCIES.map((f) => f.code));

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: `1px solid ${BUILDER.border}` }}>
      <span className="text-[12px] font-medium flex-1" style={{ color: BUILDER.ink }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 rounded-full transition-colors"
      style={{
        width: 32, height: 18,
        background: checked ? "#0A0A0A" : "#D1D5DB",
      }}
    >
      <span
        className="absolute top-0.5 rounded-full transition-transform"
        style={{
          width: 14, height: 14, background: "#fff",
          left: 2,
          transform: checked ? "translateX(14px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

export function BuilderShopPanel({
  projectId,
  commerce,
  onSaved,
  onActivated,
}: {
  projectId: string;
  commerce: Partial<SiteCommerce>;
  onSaved: (next: SiteCommerce) => void;
  onActivated?: (next: SiteCommerce) => void;
}) {
  const c = mergeSiteCommerce(commerce);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [activationState, setActivationState] = useState<"idle" | "activating" | "error">("idle");
  const [activationError, setActivationError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/products`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.products) setProductCount((d.products as unknown[]).length); })
      .catch(() => {});
  }, [projectId]);

  const patch = useCallback((updates: Partial<SiteCommerce>) => {
    const next = mergeSiteCommerce({ ...c, ...updates });
    onSaved(next);
  }, [c, onSaved]);

  const [showMoreCurrencies, setShowMoreCurrencies] = useState(false);

  async function activateShop() {
    if (activationState === "activating") return;
    setActivationState("activating");
    setActivationError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/shop/activate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActivationState("error");
        setActivationError(typeof data.error === "string" ? data.error : "Could not activate Shop.");
        return;
      }
      const next = mergeSiteCommerce(data.commerce);
      onActivated?.(next);
      setActivationState("idle");
    } catch {
      setActivationState("error");
      setActivationError("Network error while activating Shop.");
    }
  }

  if (!c.shopOpened) {
    return (
      <div className="flex flex-col gap-0 px-4 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl mb-4" style={{ background: "#FFF3EB" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="1.7">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinejoin="round" />
            <path d="M3 6h18" strokeLinecap="round" />
            <path d="M16 10a4 4 0 01-8 0" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-[14px] font-black" style={{ color: BUILDER.ink }}>Activate Shop</h2>
        <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: BUILDER.muted }}>
          Accept orders by WhatsApp, mobile money or card. Manage your catalog, customers and
          payments in Kebu Shop — separate from the page editor.
        </p>
        <button
          type="button"
          className="mt-4 flex min-h-10 w-full items-center justify-center rounded-xl px-4 text-[12px] font-bold text-white"
          style={{ background: "#0A0A0A" }}
          onClick={() => void activateShop()}
          disabled={activationState === "activating"}
        >
          {activationState === "activating" ? "Activating…" : "Activate Shop"}
        </button>
        {activationError ? (
          <p role="alert" className="mt-2 text-[10px] text-red-700">{activationError}</p>
        ) : (
          <p className="mt-2 text-center text-[9px]" style={{ color: BUILDER.muted }}>
            Kebu creates a Shop page once and keeps your catalog separate from the page design.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Shop open toggle */}
      <div
        className="mx-4 mt-4 mb-3 rounded-xl p-3 flex items-center justify-between gap-3"
        style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}
      >
        <div>
          <p className="text-[12px] font-semibold" style={{ color: "#15803D" }}>
            Shop is open
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: BUILDER.muted }}>
            Customers can browse and order.
          </p>
        </div>
        <Toggle checked={true} onChange={(v) => patch({ shopOpened: v })} />
      </div>

      {/* WhatsApp number */}
      <div className="px-4 mb-3">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: BUILDER.muted }}>
          WhatsApp number
        </label>
        <input
          type="tel"
          inputMode="tel"
          placeholder="+221 77 000 00 00"
          value={c.merchantWhatsApp}
          onChange={(e) => patch({ merchantWhatsApp: e.target.value })}
          className="w-full rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-1"
          style={{
            border: `1px solid ${BUILDER.border}`,
            background: "#fff",
            color: BUILDER.ink,
          }}
        />
        <p className="text-[10px] mt-1" style={{ color: BUILDER.muted }}>Orders go here by default.</p>
      </div>

      {/* Divider */}
      <div className="px-4 mb-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: BUILDER.muted }}>Payment methods</p>
      </div>

      <div className="px-4">
        <Row label="WhatsApp order">
          <Toggle checked={c.acceptWhatsApp !== false} onChange={(v) => patch({ acceptWhatsApp: v })} />
        </Row>
        <Row label="Pay on delivery">
          <Toggle checked={Boolean(c.acceptCod)} onChange={(v) => patch({ acceptCod: v })} />
        </Row>
        <Row label="Mobile money (Wave…)">
          <Toggle checked={Boolean(c.acceptMobileMoney)} onChange={(v) => patch({ acceptMobileMoney: v })} />
        </Row>
        {c.acceptMobileMoney && (
          <div className="pb-2">
            <input
              type="url"
              inputMode="url"
              placeholder="wave.com/s/… or pay link"
              value={c.wavePayLink}
              onChange={(e) => patch({ wavePayLink: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-1"
              style={{ border: `1px solid ${BUILDER.border}`, background: "#FAFAFA", color: BUILDER.ink }}
            />
          </div>
        )}
        <Row label="Joko / Cauris">
          <Toggle checked={Boolean(c.preferJokoCheckout)} onChange={(v) => patch({ preferJokoCheckout: v })} />
        </Row>
        <Row label="Card">
          <Toggle checked={Boolean(c.acceptCard)} onChange={(v) => patch({ acceptCard: v })} />
        </Row>
      </div>

      {/* Currency */}
      <div className="px-4 mt-3 mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: BUILDER.muted }}>
          Primary currency
        </p>
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {FEATURED_CURRENCIES.map(({ code, flag, label }) => {
            const selected = (c.shopCurrency || "XOF") === code;
            return (
              <button
                key={code}
                type="button"
                title={AFRICAN_CURRENCIES.find((x) => x.code === code)?.name ?? code}
                onClick={() => patch({ shopCurrency: code })}
                className="flex flex-col items-center rounded-lg py-1.5 px-1 gap-0.5 transition-all"
                style={{
                  border: `1.5px solid ${selected ? BUILDER.ink : BUILDER.border}`,
                  background: selected ? BUILDER.ink : "#fff",
                  color: selected ? "#fff" : BUILDER.ink,
                }}
              >
                <span className="text-base leading-none">{flag}</span>
                <span className="text-[9px] font-bold tracking-wide">{label}</span>
              </button>
            );
          })}
        </div>
        {showMoreCurrencies ? (
          <div className="mt-1 rounded-lg overflow-hidden" style={{ border: `1px solid ${BUILDER.border}` }}>
            {AFRICAN_CURRENCIES.filter((x) => !FEATURED_CODES.has(x.code)).map((cur) => {
              const flag = countryFlag(cur.countries[0] ?? "");
              const selected = c.shopCurrency === cur.code;
              return (
                <button
                  key={cur.code}
                  type="button"
                  onClick={() => { patch({ shopCurrency: cur.code }); setShowMoreCurrencies(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[11px] transition-colors hover:opacity-80"
                  style={{ background: selected ? BUILDER.ink : "#fff", color: selected ? "#fff" : BUILDER.ink, borderBottom: `1px solid ${BUILDER.border}` }}
                >
                  <span>{flag}</span>
                  <span className="font-bold">{cur.code}</span>
                  <span style={{ color: selected ? "rgba(255,255,255,0.7)" : BUILDER.muted }}>{cur.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <button
            type="button"
            className="text-[11px] font-medium mt-1"
            style={{ color: BUILDER.muted }}
            onClick={() => setShowMoreCurrencies(true)}
          >
            More currencies ↓
          </button>
        )}
      </div>

      {/* Products quick link */}
      <div className="px-4 mb-2">
        <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#F9FAFB", border: `1px solid ${BUILDER.border}` }}>
          <div>
            <p className="text-[12px] font-semibold" style={{ color: BUILDER.ink }}>
              Products
              {productCount !== null && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full px-2 text-[10px] font-bold" style={{ background: BUILDER.ink, color: "#fff", minWidth: 18, height: 16 }}>
                  {productCount}
                </span>
              )}
            </p>
            <p className="text-[11px]" style={{ color: BUILDER.muted }}>Add and edit your catalog</p>
          </div>
          <Link
            href={`/shop/${projectId}/products`}
            className="rounded-lg px-3 py-1.5 text-[11px] font-semibold"
            style={{ background: BUILDER.ink, color: "#fff" }}
          >
            Manage →
          </Link>
        </div>
      </div>

      {/* Full shop admin CTA */}
      <div className="px-4 mb-4">
        <Link
          href={`/shop/${projectId}`}
          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-[12px] font-semibold transition-opacity hover:opacity-80"
          style={{ background: "#FF5500", color: "#fff" }}
        >
          <span>Full shop admin</span>
          <span className="text-[16px] leading-none">→</span>
        </Link>
        <p className="text-[10px] mt-1.5 text-center" style={{ color: BUILDER.muted }}>
          Orders · customers · analytics
        </p>
      </div>
    </div>
  );
}
