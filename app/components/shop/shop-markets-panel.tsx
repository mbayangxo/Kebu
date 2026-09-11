"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type MarketConfig = {
  countryCode: string;
  label: string;
  currency: string;
  currencyLabel: string;
  enabled: boolean;
  shippingRateXof: number | null;
  freeShippingAboveXof: number | null;
  paymentMethods: string[];
  taxRate: number;
};

const AFRICAN_MARKETS: MarketConfig[] = [
  { countryCode: "CI", label: "Côte d'Ivoire", currency: "XOF", currencyLabel: "Franc CFA (XOF)", enabled: true, shippingRateXof: null, freeShippingAboveXof: null, paymentMethods: ["wave", "orange_money", "cash"], taxRate: 0 },
  { countryCode: "SN", label: "Sénégal", currency: "XOF", currencyLabel: "Franc CFA (XOF)", enabled: false, shippingRateXof: 3500, freeShippingAboveXof: 50000, paymentMethods: ["wave", "orange_money"], taxRate: 0 },
  { countryCode: "ML", label: "Mali", currency: "XOF", currencyLabel: "Franc CFA (XOF)", enabled: false, shippingRateXof: 5000, freeShippingAboveXof: null, paymentMethods: ["orange_money"], taxRate: 0 },
  { countryCode: "BF", label: "Burkina Faso", currency: "XOF", currencyLabel: "Franc CFA (XOF)", enabled: false, shippingRateXof: 4000, freeShippingAboveXof: null, paymentMethods: ["orange_money"], taxRate: 0 },
  { countryCode: "GN", label: "Guinée", currency: "GNF", currencyLabel: "Franc guinéen (GNF)", enabled: false, shippingRateXof: 6000, freeShippingAboveXof: null, paymentMethods: ["orange_money", "momo"], taxRate: 0 },
  { countryCode: "GH", label: "Ghana", currency: "GHS", currencyLabel: "Cedi (GHS)", enabled: false, shippingRateXof: 7000, freeShippingAboveXof: null, paymentMethods: ["momo"], taxRate: 0 },
  { countryCode: "NG", label: "Nigeria", currency: "NGN", currencyLabel: "Naira (NGN)", enabled: false, shippingRateXof: 8000, freeShippingAboveXof: null, paymentMethods: ["bank_transfer"], taxRate: 0 },
  { countryCode: "CM", label: "Cameroun", currency: "XAF", currencyLabel: "Franc CFA (XAF)", enabled: false, shippingRateXof: 5000, freeShippingAboveXof: null, paymentMethods: ["orange_money", "momo"], taxRate: 0 },
  { countryCode: "MA", label: "Maroc", currency: "MAD", currencyLabel: "Dirham (MAD)", enabled: false, shippingRateXof: 9000, freeShippingAboveXof: null, paymentMethods: ["bank_transfer"], taxRate: 0 },
  { countryCode: "ZA", label: "Afrique du Sud", currency: "ZAR", currencyLabel: "Rand (ZAR)", enabled: false, shippingRateXof: 12000, freeShippingAboveXof: null, paymentMethods: ["bank_transfer"], taxRate: 0 },
  { countryCode: "FR", label: "France (diaspora)", currency: "EUR", currencyLabel: "Euro (EUR)", enabled: false, shippingRateXof: 15000, freeShippingAboveXof: 100000, paymentMethods: ["bank_transfer"], taxRate: 0 },
  { countryCode: "US", label: "USA (diaspora)", currency: "USD", currencyLabel: "Dollar (USD)", enabled: false, shippingRateXof: 18000, freeShippingAboveXof: null, paymentMethods: ["bank_transfer"], taxRate: 0 },
];

const METHOD_LABELS: Record<string, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  momo: "MTN MoMo",
  cash: "Cash",
  bank_transfer: "Bank transfer",
};

function formatXof(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n).toLocaleString()} XOF`;
}

export function ShopMarketsPanel({ projectId }: { projectId: string }) {
  const [markets, setMarkets] = useState<MarketConfig[]>(() =>
    AFRICAN_MARKETS.map((m) => ({ ...m })),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<MarketConfig>>({});

  // Load saved market config
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/markets`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.settings?.markets) {
        const saved = data.settings.markets as Record<string, Partial<MarketConfig>>;
        setMarkets((prev) =>
          prev.map((m) => ({
            ...m,
            ...(saved[m.countryCode] ?? {}),
          })),
        );
      }
    } catch {
      // ignore — use defaults
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const marketMap: Record<string, Partial<MarketConfig>> = {};
      for (const m of markets) {
        marketMap[m.countryCode] = {
          enabled: m.enabled,
          shippingRateXof: m.shippingRateXof,
          freeShippingAboveXof: m.freeShippingAboveXof,
          paymentMethods: m.paymentMethods,
          taxRate: m.taxRate,
        };
      }
      await fetch(`/api/projects/${projectId}/markets`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markets: marketMap }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function toggleMarket(code: string) {
    setMarkets((prev) =>
      prev.map((m) => (m.countryCode === code ? { ...m, enabled: !m.enabled } : m)),
    );
  }

  function startEdit(m: MarketConfig) {
    setEditing(m.countryCode);
    setEditDraft({
      shippingRateXof: m.shippingRateXof,
      freeShippingAboveXof: m.freeShippingAboveXof,
      paymentMethods: [...m.paymentMethods],
      taxRate: m.taxRate,
    });
  }

  function saveEdit(code: string) {
    setMarkets((prev) =>
      prev.map((m) =>
        m.countryCode === code ? { ...m, ...editDraft } : m,
      ),
    );
    setEditing(null);
  }

  const enabledCount = markets.filter((m) => m.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            Markets
          </p>
          <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
            Choose which countries you sell to. Set shipping rates and accepted payment methods per market.
            {enabledCount > 0 ? ` ${enabledCount} market${enabledCount !== 1 ? "s" : ""} active.` : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="shrink-0 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: KEBU.black }}
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save markets"}
        </button>
      </div>

      <div
        className="rounded-2xl p-4 text-xs"
        style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
      >
        <p className="font-semibold" style={{ color: KEBU.black }}>
          Pan-African strategy
        </p>
        <p className="mt-1">
          Start with your home market enabled. Expand to neighboring countries as you find customers.
          The diaspora markets (France, USA) ship to people who want goods from home.
        </p>
      </div>

      <div className="space-y-2">
        {markets.map((m) => (
          <div
            key={m.countryCode}
            className="rounded-2xl border"
            style={{
              borderColor: m.enabled ? KEBU.orange : KEBU.border,
              background: m.enabled ? "#fff8f3" : "#fff",
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => toggleMarket(m.countryCode)}
                className="flex h-5 w-10 shrink-0 items-center rounded-full transition-colors"
                style={{
                  background: m.enabled ? KEBU.orange : "#d1d5db",
                  padding: "2px",
                }}
                aria-label={m.enabled ? `Disable ${m.label}` : `Enable ${m.label}`}
              >
                <span
                  className="block h-4 w-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: m.enabled ? "translateX(20px)" : "translateX(0)" }}
                />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: KEBU.black }}>
                  {m.label}
                </p>
                <p className="text-xs" style={{ color: KEBU.muted }}>
                  {m.currencyLabel}
                  {m.enabled && m.shippingRateXof ? ` · Shipping ${formatXof(m.shippingRateXof)}` : ""}
                  {m.enabled && !m.shippingRateXof ? " · No shipping rate set" : ""}
                </p>
              </div>
              {m.enabled ? (
                <button
                  type="button"
                  onClick={() => (editing === m.countryCode ? setEditing(null) : startEdit(m))}
                  className="text-[11px] font-bold underline"
                  style={{ color: KEBU.orange }}
                >
                  {editing === m.countryCode ? "Close" : "Configure"}
                </button>
              ) : null}
            </div>

            {editing === m.countryCode ? (
              <div
                className="border-t px-4 py-3 space-y-3"
                style={{ borderColor: KEBU.border }}
              >
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                      Shipping rate (XOF)
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      style={{ borderColor: KEBU.border }}
                      value={editDraft.shippingRateXof ?? ""}
                      onChange={(e) => setEditDraft((p) => ({ ...p, shippingRateXof: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="3500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                      Free shipping above (XOF)
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      style={{ borderColor: KEBU.border }}
                      value={editDraft.freeShippingAboveXof ?? ""}
                      onChange={(e) => setEditDraft((p) => ({ ...p, freeShippingAboveXof: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                      Tax rate %
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={0.1}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      style={{ borderColor: KEBU.border }}
                      value={editDraft.taxRate ?? 0}
                      onChange={(e) => setEditDraft((p) => ({ ...p, taxRate: Number(e.target.value) }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                    Payment methods
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(METHOD_LABELS).map((method) => {
                      const on = (editDraft.paymentMethods ?? []).includes(method);
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() =>
                            setEditDraft((p) => ({
                              ...p,
                              paymentMethods: on
                                ? (p.paymentMethods ?? []).filter((m) => m !== method)
                                : [...(p.paymentMethods ?? []), method],
                            }))
                          }
                          className="rounded-full px-3 py-1 text-[11px] font-bold"
                          style={{
                            background: on ? KEBU.orange : KEBU.cream,
                            color: on ? "#fff" : KEBU.muted,
                            border: `1px solid ${on ? KEBU.orange : KEBU.border}`,
                          }}
                        >
                          {METHOD_LABELS[method]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => saveEdit(m.countryCode)}
                  className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: KEBU.black }}
                >
                  Done
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
