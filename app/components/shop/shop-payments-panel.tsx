"use client";

import { useEffect, useState } from "react";
import {
  formatPaypalHint,
  mergeSiteCommerce,
  type SiteCommerce,
} from "@/lib/create/site-commerce";
import { KEBU } from "@/lib/kebu-brand";
import { ShopSellerTrustBanner } from "@/app/components/shop/shop-seller-trust-banner";

/**
 * Merchant payment preferences for product orders (not hosting billing).
 * Live adapters (JOKO / PayPal / Paystack / Wave) mark Money: paid only after webhook/capture.
 * When an adapter is not configured, instructions still work — never fake paid.
 */
export function ShopPaymentsPanel({
  projectId,
  commerce,
  onSaved,
}: {
  projectId: string;
  commerce: SiteCommerce;
  onSaved: (next: SiteCommerce) => void;
}) {
  const [draft, setDraft] = useState<SiteCommerce>(() => mergeSiteCommerce(commerce));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adapters, setAdapters] = useState<
    Record<string, { configured: boolean; label: string }> | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/payment-adapters`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data.adapters) {
          setAdapters(data.adapters as Record<string, { configured: boolean; label: string }>);
        }
      } catch {
        /* optional status */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function patch(partial: Partial<SiteCommerce>) {
    setDraft((prev) => mergeSiteCommerce(partial, prev));
  }

  async function save() {
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const next = mergeSiteCommerce(draft);
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seo: { commerce: next } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save payments.");
        return;
      }
      const saved = mergeSiteCommerce(
        (data.project?.seo as { commerce?: unknown } | undefined)?.commerce,
        next,
      );
      setDraft(saved);
      onSaved(saved);
      setNote("Payment preferences saved. Publish your site so visitors see updated methods.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
          How customers pay
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          Turn on every way you take money. Live checkout (JOKO, PayPal, card via Paystack, Wave) starts
          when server keys exist and the product has an XOF price — Money: paid only after webhook or
          capture. Without keys, customers still get clear instructions / WhatsApp.
        </p>
      </div>

      <ShopSellerTrustBanner projectId={projectId} />
      {adapters ? (
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ border: `1px solid ${KEBU.border}`, background: KEBU.cream }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
            Live on this server
          </p>
          <ul className="space-y-1.5 text-xs" style={{ color: KEBU.black }}>
            {Object.values(adapters).map((a) => (
              <li key={a.label} className="flex items-center justify-between gap-2">
                <span>{a.label}</span>
                <span className="font-semibold">{a.configured ? "Ready" : "Not configured"}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
          Your phone — WhatsApp &amp; Joko/Mbolo notifications
        </span>
        <input
          className="w-full rounded-xl px-3 py-2.5 text-sm"
          style={{ border: `1px solid ${KEBU.border}` }}
          value={draft.merchantWhatsApp}
          onChange={(e) => patch({ merchantWhatsApp: e.target.value })}
          placeholder="+221 77 000 00 00"
          inputMode="tel"
          autoComplete="tel"
        />
        <span className="block text-[11px] leading-relaxed" style={{ color: KEBU.muted }}>
          Your phone number is your Joko/Mbolo identity — new-order alerts arrive directly in
          Mbolo. Also used for WhatsApp orders and SMS fallback.
        </span>
      </label>

      <fieldset className="space-y-3">
        <legend className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
          Accepted methods
        </legend>
        {(
          [
            ["acceptWhatsApp", "WhatsApp orders", "Customer taps Order → you confirm on WhatsApp."],
            ["acceptCod", "Pay on delivery (COD)", "Customer pays cash or mobile money when they receive the order."],
            [
              "acceptMobileMoney",
              "Mobile money (Wave, Orange Money, …)",
              "Wave live checkout when WAVE_API_KEY is set; otherwise instructions below. Orange Money when partner keys exist.",
            ],
            [
              "acceptCard",
              "Debit / credit card",
              "Paystack live checkout when PAYSTACK_SECRET_KEY is set; otherwise card instructions below.",
            ],
            [
              "acceptPaypal",
              "PayPal",
              "PayPal Orders API when PAYPAL_CLIENT_ID + SECRET are set; otherwise PayPal.me / email instructions.",
            ],
          ] as const
        ).map(([key, title, hint]) => (
          <label
            key={key}
            className="flex cursor-pointer gap-3 rounded-2xl p-3"
            style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0"
              checked={Boolean(draft[key])}
              onChange={(e) => patch({ [key]: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-semibold" style={{ color: KEBU.black }}>
                {title}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: KEBU.muted }}>
                {hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {draft.acceptMobileMoney ? (
        <div className="space-y-3 rounded-2xl p-4" style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Mobile money button label
            </span>
            <input
              className="w-full rounded-xl px-3 py-2 text-sm bg-white"
              style={{ border: `1px solid ${KEBU.border}` }}
              value={draft.mobileMoneyLabel}
              onChange={(e) => patch({ mobileMoneyLabel: e.target.value })}
              placeholder="Pay with Wave"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Wave pay link (share / QR)
            </span>
            <input
              className="w-full rounded-xl px-3 py-2 text-sm bg-white"
              style={{ border: `1px solid ${KEBU.border}` }}
              value={draft.wavePayLink}
              onChange={(e) => patch({ wavePayLink: e.target.value })}
              placeholder="https://pay.wave.com/… or your Wave business link"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Mobile money instructions (fallback)
            </span>
            <textarea
              className="w-full min-h-[100px] rounded-xl px-3 py-2 text-sm bg-white"
              style={{ border: `1px solid ${KEBU.border}` }}
              value={draft.paymentInstructions}
              onChange={(e) => patch({ paymentInstructions: e.target.value })}
              placeholder="Example: Send 5 000 XOF via Wave to 77 xxx xx xx. Put your name in the note, then message me on WhatsApp."
            />
          </label>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl p-4" style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
          Share cards · social · QR
        </p>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
            JOKO pay page URL (optional share link)
          </span>
          <input
            className="w-full rounded-xl px-3 py-2 text-sm bg-white"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={draft.jokoPayLink}
            onChange={(e) => patch({ jokoPayLink: e.target.value })}
            placeholder="https://… joko checkout or pay page"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
            Share tagline (Instagram / TikTok / WhatsApp status)
          </span>
          <input
            className="w-full rounded-xl px-3 py-2 text-sm bg-white"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={draft.shareTagline}
            onChange={(e) => patch({ shareTagline: e.target.value })}
            placeholder="New drop · Dakar delivery · pay Wave"
          />
        </label>
      </div>

      {draft.acceptCard ? (
        <div className="space-y-3 rounded-2xl p-4" style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Card label
            </span>
            <input
              className="w-full rounded-xl px-3 py-2 text-sm bg-white"
              style={{ border: `1px solid ${KEBU.border}` }}
              value={draft.cardLabel}
              onChange={(e) => patch({ cardLabel: e.target.value })}
              placeholder="Debit / credit card"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Card payment instructions (fallback)
            </span>
            <textarea
              className="w-full min-h-[100px] rounded-xl px-3 py-2 text-sm bg-white"
              style={{ border: `1px solid ${KEBU.border}` }}
              value={draft.cardInstructions}
              onChange={(e) => patch({ cardInstructions: e.target.value })}
              placeholder="Example: After you order, I will send a secure card payment link (Visa / Mastercard)."
            />
          </label>
        </div>
      ) : null}

      {draft.acceptPaypal ? (
        <div className="space-y-3 rounded-2xl p-4" style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              PayPal label
            </span>
            <input
              className="w-full rounded-xl px-3 py-2 text-sm bg-white"
              style={{ border: `1px solid ${KEBU.border}` }}
              value={draft.paypalLabel}
              onChange={(e) => patch({ paypalLabel: e.target.value })}
              placeholder="PayPal"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              PayPal.me / email / link (fallback)
            </span>
            <input
              className="w-full rounded-xl px-3 py-2 text-sm bg-white"
              style={{ border: `1px solid ${KEBU.border}` }}
              value={draft.paypalHandle}
              onChange={(e) => patch({ paypalHandle: e.target.value })}
              placeholder="paypal.me/yourname or you@email.com"
            />
            {draft.paypalHandle.trim() ? (
              <span className="block text-[11px] mt-1" style={{ color: KEBU.muted }}>
                Shown to customers as: {formatPaypalHint(draft.paypalHandle)}
              </span>
            ) : null}
          </label>
        </div>
      ) : null}

      <label
        className="flex cursor-pointer gap-3 rounded-2xl p-3"
        style={{ border: `1px dashed ${KEBU.border}`, background: "#fff" }}
      >
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0"
          checked={Boolean(draft.preferJokoCheckout)}
          onChange={(e) => patch({ preferJokoCheckout: e.target.checked })}
        />
        <span>
          <span className="block text-sm font-semibold" style={{ color: KEBU.black }}>
            Offer Joko — buyers pay in Cauris
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: KEBU.muted }}>
            Buyers see Joko first and pay in Cauris (XOF/NGN equivalents shown). After payment, Kebu
            automatically sends a Mbolo or SMS confirmation to the buyer and an alert to your phone above —
            no action needed from you. Wave, Orange, cards, and WhatsApp stay available alongside it.
          </span>
        </span>
      </label>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {note ? (
        <p className="rounded-xl px-3 py-2 text-xs" style={{ background: KEBU.cream, color: KEBU.black }}>
          {note}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
        style={{ background: KEBU.orange }}
      >
        {busy ? "Saving…" : "Save payment settings"}
      </button>
    </div>
  );
}
