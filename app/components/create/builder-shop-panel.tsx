"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BUILDER } from "@/lib/create/builder-ui";
import type { SiteCommerce } from "@/lib/create/site-commerce";
import { mergeSiteCommerce } from "@/lib/create/site-commerce";
import { AFRICAN_CURRENCIES } from "@/lib/create/african-currencies";

const TOP_CURRENCIES = ["XOF", "XAF", "NGN", "GHS", "KES", "USD", "EUR", "GBP"];

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
}: {
  projectId: string;
  commerce: Partial<SiteCommerce>;
  onSaved: (next: SiteCommerce) => void;
}) {
  const c = mergeSiteCommerce(commerce);
  const [productCount, setProductCount] = useState<number | null>(null);

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

  const selectedCurrencies = TOP_CURRENCIES.filter((code) => {
    const cur = AFRICAN_CURRENCIES.find((x) => x.code === code);
    return cur != null;
  });

  return (
    <div className="flex flex-col gap-0">
      {/* Shop open toggle */}
      <div
        className="mx-4 mt-4 mb-3 rounded-xl p-3 flex items-center justify-between gap-3"
        style={{ background: c.shopOpened ? "#F0FDF4" : "#F9FAFB", border: `1px solid ${c.shopOpened ? "#86EFAC" : BUILDER.border}` }}
      >
        <div>
          <p className="text-[12px] font-semibold" style={{ color: c.shopOpened ? "#15803D" : BUILDER.ink }}>
            {c.shopOpened ? "Shop is open" : "Shop is closed"}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: BUILDER.muted }}>
            {c.shopOpened ? "Customers can browse and order." : "Activate to start receiving orders."}
          </p>
        </div>
        <Toggle checked={Boolean(c.shopOpened)} onChange={(v) => patch({ shopOpened: v })} />
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
        <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: BUILDER.muted }}>
          Currency
        </label>
        <select
          value={c.shopCurrency || "XOF"}
          onChange={(e) => patch({ shopCurrency: e.target.value })}
          className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
          style={{ border: `1px solid ${BUILDER.border}`, background: "#fff", color: BUILDER.ink }}
        >
          {selectedCurrencies.map((code) => {
            const cur = AFRICAN_CURRENCIES.find((x) => x.code === code)!;
            return <option key={code} value={code}>{cur.code} · {cur.symbol} — {cur.name}</option>;
          })}
          {AFRICAN_CURRENCIES.filter((x) => !TOP_CURRENCIES.includes(x.code)).map((cur) => (
            <option key={cur.code} value={cur.code}>{cur.code} · {cur.symbol} — {cur.name}</option>
          ))}
        </select>
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
