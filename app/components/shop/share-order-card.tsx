"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { mergeSiteCommerce, type SiteCommerce } from "@/lib/create/site-commerce";
import { shareChannelHrefs, type ShareOrderPayload } from "@/lib/shop/share-order-links";
import { KEBU } from "@/lib/kebu-brand";

/**
 * Senegal-first share card: WhatsApp · Wave · JOKO · QR · social copy links.
 * Instagram / TikTok / Snapchat: copy link or text for bio / sticker (no fake Connect).
 */
export function ShareOrderCard({
  payload,
  commerce,
  compact = false,
}: {
  payload: ShareOrderPayload;
  commerce?: SiteCommerce | null;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState<"link" | "text" | null>(null);
  const merged = useMemo(() => mergeSiteCommerce(commerce), [commerce]);
  const channels = useMemo(() => shareChannelHrefs(payload, merged), [payload, merged]);

  async function copy(kind: "link" | "text") {
    const value = kind === "link" ? channels.qrUrl : channels.copyText;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  const btn =
    "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-opacity hover:opacity-80";

  return (
    <div
      className={compact ? "space-y-3" : "space-y-4 rounded-2xl p-4"}
      style={compact ? undefined : { border: `1px solid ${KEBU.border}`, background: "#fff" }}
    >
      {!compact ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: KEBU.orange }}>
            Share to sell
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: KEBU.black }}>
            Link card for WhatsApp, Wave, JOKO & social
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: KEBU.muted }}>
            Customers press the link or scan the QR — then order. Paste the same link in Instagram, TikTok,
            Facebook, or Snapchat.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        <div
          className="rounded-xl bg-white p-2"
          style={{ border: `1px solid ${KEBU.border}` }}
          aria-label="QR code for this order link"
        >
          <QRCodeSVG value={channels.qrUrl} size={compact ? 88 : 112} level="M" includeMargin={false} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="break-all text-[11px] font-medium" style={{ color: KEBU.black }}>
            {channels.qrUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={channels.whatsapp}
              target="_blank"
              rel="noreferrer"
              className={btn}
              style={{ background: "#25D366", color: "#fff" }}
            >
              WhatsApp
            </a>
            {channels.wave ? (
              <a
                href={channels.wave}
                target="_blank"
                rel="noreferrer"
                className={btn}
                style={{ background: "#1DC8FF", color: "#0A0A0A" }}
              >
                Wave
              </a>
            ) : null}
            {channels.joko ? (
              <a
                href={channels.joko}
                target="_blank"
                rel="noreferrer"
                className={btn}
                style={{ background: KEBU.orange, color: "#fff" }}
              >
                JOKO
              </a>
            ) : null}
            <a
              href={channels.facebook}
              target="_blank"
              rel="noreferrer"
              className={btn}
              style={{ background: "#1877F2", color: "#fff" }}
            >
              Facebook
            </a>
            <button type="button" className={btn} style={{ border: `1px solid ${KEBU.border}` }} onClick={() => void copy("link")}>
              {copied === "link" ? "Copied link" : "Copy link"}
            </button>
            <button type="button" className={btn} style={{ border: `1px solid ${KEBU.border}` }} onClick={() => void copy("text")}>
              {copied === "text" ? "Copied card" : "Copy link card"}
            </button>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>
            TikTok / Instagram / Snapchat: copy link → paste in bio or sticker. Set Wave & JOKO URLs in Shop →
            Payments.
          </p>
        </div>
      </div>
    </div>
  );
}
