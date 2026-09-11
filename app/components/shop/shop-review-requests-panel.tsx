"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type ReviewRequestSettings = {
  enabled: boolean;
  daysAfterFulfillment: number;
  discountPercent: number;
  channel: "whatsapp" | "email" | "both";
  messageTemplate: string;
};

type EligibleOrder = {
  id: string;
  order_number: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  status: string;
  created_at: string;
};

type RequestRow = {
  id: string;
  order_id: string;
  customer_name: string;
  channel: string;
  discount_code: string | null;
  status: string;
  sent_at: string;
};

const DEFAULT_SETTINGS: ReviewRequestSettings = {
  enabled: false,
  daysAfterFulfillment: 3,
  discountPercent: 10,
  channel: "whatsapp",
  messageTemplate: "",
};

function buildWhatsAppMessage(
  storeName: string,
  customerName: string,
  discountPercent: number,
  discountCode: string,
  template: string,
): string {
  if (template.trim()) {
    return template
      .replace("{customer_name}", customerName)
      .replace("{store_name}", storeName)
      .replace("{discount_percent}", String(discountPercent))
      .replace("{discount_code}", discountCode);
  }
  const discountLine = discountPercent > 0 && discountCode
    ? `As a thank you, use code *${discountCode}* for ${discountPercent}% off your next order. 🎁`
    : discountPercent > 0
      ? `As a thank you, your next order gets ${discountPercent}% off — reply and we'll send you the code. 🎁`
      : "";
  return `Hi ${customerName || "there"}! 👋

Thank you for your recent order from *${storeName}*. We hope you love it!

We'd really appreciate if you could leave us a quick review — it helps other customers find us and helps us grow.

${discountLine}

To leave a review, reply to this message or tap the link on our site. It only takes 1 minute! 🙏

Thank you so much for your support.
— ${storeName}`;
}

function generateDiscountCode(prefix: string, percent: number): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix || "REVIEW"}${percent}${rand}`;
}

export function ShopReviewRequestsPanel({ projectId, storeName }: { projectId: string; storeName?: string }) {
  const [settings, setSettings] = useState<ReviewRequestSettings>(DEFAULT_SETTINGS);
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrder[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-order sending state
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [messagePreview, setMessagePreview] = useState<{ orderId: string; msg: string; phone: string | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/review-requests`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(typeof data.error === "string" ? data.error : "Could not load review requests."); return; }
      setSettings({ ...DEFAULT_SETTINGS, ...(data.settings ?? {}) });
      setEligibleOrders(Array.isArray(data.eligibleOrders) ? data.eligibleOrders : []);
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  async function handleSaveSettings() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/review-requests`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(typeof data.error === "string" ? data.error : "Could not save."); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function openMessagePreview(order: EligibleOrder) {
    const discountCode = settings.discountPercent > 0
      ? generateDiscountCode("REVIEW", settings.discountPercent)
      : "";
    const msg = buildWhatsAppMessage(
      storeName || "our store",
      order.customer_name,
      settings.discountPercent,
      discountCode,
      settings.messageTemplate,
    );
    setMessagePreview({ orderId: order.id, msg, phone: order.customer_phone });
  }

  async function logSend(order: EligibleOrder, msg: string) {
    setSending((p) => ({ ...p, [order.id]: true }));
    const discountCode = settings.discountPercent > 0
      ? generateDiscountCode("REVIEW", settings.discountPercent)
      : "";
    try {
      await fetch(`/api/projects/${projectId}/review-requests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          channel: settings.channel === "both" ? "whatsapp" : settings.channel,
          discountCode,
          discountPercent: settings.discountPercent,
        }),
      });
      setSentIds((p) => new Set([...p, order.id]));
      setMessagePreview(null);
    } finally {
      setSending((p) => ({ ...p, [order.id]: false }));
    }
    void msg; // used by caller for clipboard
  }

  if (loading) return <p className="text-sm py-4" style={{ color: KEBU.muted }}>Loading…</p>;

  return (
    <div className="space-y-6">

      {/* Settings */}
      <div>
        <p className="text-sm font-semibold" style={{ color: KEBU.black }}>Review request settings</p>
        <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
          Automatically ask customers to leave a review after their order is fulfilled. Offer a discount to incentivise them.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border p-4" style={{ borderColor: KEBU.border }}>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold" style={{ color: KEBU.black }}>Enable review requests</span>
          <button
            type="button"
            onClick={() => setSettings((p) => ({ ...p, enabled: !p.enabled }))}
            className="flex h-5 w-10 shrink-0 items-center rounded-full transition-colors"
            style={{ background: settings.enabled ? KEBU.orange : "#d1d5db", padding: "2px" }}
            aria-label={settings.enabled ? "Disable" : "Enable"}
          >
            <span
              className="block h-4 w-4 rounded-full bg-white shadow transition-transform"
              style={{ transform: settings.enabled ? "translateX(20px)" : "translateX(0)" }}
            />
          </button>
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Send after (days)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: KEBU.border }}
              value={settings.daysAfterFulfillment}
              onChange={(e) => setSettings((p) => ({ ...p, daysAfterFulfillment: Number(e.target.value) }))}
            />
            <p className="mt-1 text-[10px]" style={{ color: KEBU.faint }}>Days after order fulfilled</p>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Discount %
            </label>
            <input
              type="number"
              min={0}
              max={50}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: KEBU.border }}
              value={settings.discountPercent}
              onChange={(e) => setSettings((p) => ({ ...p, discountPercent: Number(e.target.value) }))}
            />
            <p className="mt-1 text-[10px]" style={{ color: KEBU.faint }}>0 = no discount offered</p>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Channel
            </label>
            <select
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: KEBU.border }}
              value={settings.channel}
              onChange={(e) => setSettings((p) => ({ ...p, channel: e.target.value as "whatsapp" | "email" | "both" }))}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="both">WhatsApp + Email</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
            Custom message template (optional)
          </label>
          <textarea
            rows={4}
            className="w-full rounded-xl border px-3 py-2 text-sm font-mono"
            style={{ borderColor: KEBU.border }}
            value={settings.messageTemplate}
            onChange={(e) => setSettings((p) => ({ ...p, messageTemplate: e.target.value }))}
            placeholder={`Use {customer_name}, {store_name}, {discount_percent}, {discount_code} as placeholders.\nLeave empty to use the default message.`}
          />
        </div>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSaveSettings()}
          className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: KEBU.black }}
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
        </button>
      </div>

      {/* How it works */}
      <div className="rounded-2xl p-4 text-xs space-y-1" style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}>
        <p className="font-semibold" style={{ color: KEBU.black }}>How review requests work</p>
        <p style={{ color: KEBU.muted }}>
          After an order is marked fulfilled, customers who bought from you appear below. You click "Send" — Kebu generates the message and opens WhatsApp pre-filled for you to send.
          When the customer leaves a review, it goes to your Reviews tab for approval.
        </p>
        <p style={{ color: KEBU.muted }}>
          The discount code is auto-generated and valid for their next purchase. Set discount % to 0 to skip the discount offer.
        </p>
      </div>

      {/* Eligible orders — ready to request */}
      {eligibleOrders.length > 0 ? (
        <div>
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            Ready to request ({eligibleOrders.filter((o) => !sentIds.has(o.id)).length})
          </p>
          <p className="mt-0.5 mb-3 text-xs" style={{ color: KEBU.muted }}>
            Fulfilled orders with no review request sent yet.
          </p>
          <ul className="space-y-2">
            {eligibleOrders.filter((o) => !sentIds.has(o.id)).map((order) => (
              <li
                key={order.id}
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm"
                style={{ borderColor: KEBU.border }}
              >
                <div className="min-w-0">
                  <p className="font-semibold" style={{ color: KEBU.black }}>
                    {order.customer_name || "Customer"}
                    {order.order_number ? (
                      <span className="ml-2 font-mono text-[10px]" style={{ color: KEBU.muted }}>#{order.order_number}</span>
                    ) : null}
                  </p>
                  <p className="text-[11px]" style={{ color: KEBU.muted }}>
                    {order.customer_phone || order.customer_email || "No contact"}
                    {" · "}
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={sending[order.id]}
                  onClick={() => openMessagePreview(order)}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                  style={{ background: KEBU.orange }}
                >
                  {sending[order.id] ? "…" : "Send request"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : !loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: KEBU.border, color: KEBU.muted }}>
          No fulfilled orders ready for review requests yet. Mark orders as fulfilled in the Orders tab.
        </div>
      ) : null}

      {/* Message preview modal */}
      {messagePreview ? (() => {
        const order = eligibleOrders.find((o) => o.id === messagePreview.orderId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="max-w-md w-full rounded-2xl bg-white p-5 shadow-xl space-y-4">
              <p className="text-sm font-bold" style={{ color: KEBU.black }}>Review request message</p>
              <pre className="whitespace-pre-wrap rounded-xl p-3 text-xs font-mono leading-relaxed" style={{ background: KEBU.cream, color: KEBU.black }}>
                {messagePreview.msg}
              </pre>
              <div className="flex flex-wrap gap-2">
                {messagePreview.phone ? (
                  <a
                    href={`https://wa.me/${messagePreview.phone.replace(/\D/g, "")}?text=${encodeURIComponent(messagePreview.msg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ background: "#25D366" }}
                    onClick={() => { if (order) void logSend(order, messagePreview.msg); }}
                  >
                    Open WhatsApp ↗
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(messagePreview.msg);
                    if (order) void logSend(order, messagePreview.msg);
                  }}
                  className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
                >
                  Copy message
                </button>
                <button
                  type="button"
                  onClick={() => setMessagePreview(null)}
                  className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: KEBU.muted }}
                >
                  Cancel
                </button>
              </div>
              <p className="text-[10px]" style={{ color: KEBU.faint }}>
                Clicking "Open WhatsApp" or "Copy message" marks this request as sent.
              </p>
            </div>
          </div>
        );
      })() : null}

      {/* Sent requests history */}
      {requests.length > 0 ? (
        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: KEBU.black }}>
            Sent requests ({requests.length})
          </p>
          <ul className="space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs"
                style={{ borderColor: KEBU.border }}
              >
                <div>
                  <p className="font-semibold" style={{ color: KEBU.black }}>{r.customer_name}</p>
                  <p style={{ color: KEBU.muted }}>
                    via {r.channel}
                    {r.discount_code ? ` · Code: ${r.discount_code}` : ""}
                    {" · "}
                    {new Date(r.sent_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{ background: KEBU.cream, color: KEBU.muted }}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
