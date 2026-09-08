"use client";

import { useState } from "react";
import { useDataMode } from "@/app/components/create/data-mode-provider";
import { labelSubscriptionInterval } from "@/lib/shop/subscriptions";

export function PublicShopSubscribe({
  subdomain,
  productId,
  productName,
  priceLabel,
  interval = "monthly",
}: {
  subdomain: string;
  productId: string;
  productName: string;
  priceLabel: string;
  interval?: "weekly" | "monthly" | "quarterly" | "yearly";
}) {
  const { reportKb, online } = useDataMode();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [whatsappHref, setWhatsappHref] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || phone.trim().length < 8) return;
    setBusy(true);
    setNote(null);
    setWhatsappHref(null);
    try {
      const body = JSON.stringify({
        productId,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        interval,
      });
      const res = await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      reportKb("place_order", new TextEncoder().encode(body).length);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(typeof data.error === "string" ? data.error : "Could not subscribe.");
        return;
      }
      setNote(
        typeof data.message === "string"
          ? data.message
          : "Subscription started. The merchant will confirm payment with you.",
      );
      if (typeof data.whatsappHref === "string") setWhatsappHref(data.whatsappHref);
      setName("");
      setPhone("");
      setEmail("");
    } catch {
      setNote(!online ? "You are offline — reconnect to subscribe." : "Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full px-4 py-2 text-xs font-bold text-white"
        style={{ background: "#0F0D33" }}
      >
        {open ? "Close" : `Subscribe · ${labelSubscriptionInterval(interval)}`}
      </button>
      {open ? (
        <form onSubmit={(e) => void submit(e)} className="mt-3 space-y-2 rounded-xl border p-3 text-xs">
          <p className="font-semibold">
            {productName}
            {priceLabel ? ` · ${priceLabel}` : ""}
          </p>
          <p className="opacity-70">
            Recurring order {labelSubscriptionInterval(interval)}. Payment is collected by the shop on
            WhatsApp, Wave, or JOKO — not charged automatically.
          </p>
          <label className="block">
            Your name
            <input
              className="mt-1 w-full rounded-lg border px-2 py-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
            />
          </label>
          <label className="block">
            WhatsApp / phone
            <input
              className="mt-1 w-full rounded-lg border px-2 py-1.5"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              minLength={8}
              maxLength={24}
            />
          </label>
          <label className="block">
            Email (optional)
            <input
              type="email"
              className="mt-1 w-full rounded-lg border px-2 py-1.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: "#FF5500" }}
          >
            {busy ? "Starting…" : "Start subscription"}
          </button>
          {note ? <p className="text-[11px] opacity-80">{note}</p> : null}
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full px-3 py-1.5 text-[11px] font-bold text-white"
              style={{ background: "#25D366" }}
            >
              Message merchant on WhatsApp
            </a>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
