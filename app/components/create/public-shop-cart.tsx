"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  commercePaymentOptions,
  defaultPaymentPreference,
  mergeSiteCommerce,
  type ShopPaymentPreference,
  type SiteCommerce,
} from "@/lib/create/site-commerce";
import { useDataMode } from "@/app/components/create/data-mode-provider";
import { measureResponseBytes } from "@/lib/create/kb-budget";
import { cartSessionKey, clearShopCart, readShopCart, writeShopCart, cartLineKey, type ShopCartLine } from "@/lib/create/shop-cart-storage";
import { PublicShippingQuote } from "@/app/components/create/public-shipping-quote";
import { trackShopEvent } from "@/lib/shop/shop-analytics-events";
import { xofToCauris } from "@/lib/shop/cauris";
import { parseXofFromLabel } from "@/lib/shop/joko-order";

/** Floating cart + checkout for live multi-item orders. */
export function PublicShopCart({
  subdomain,
  commerce,
  preview = false,
}: {
  subdomain: string;
  commerce?: SiteCommerce | null;
  preview?: boolean;
}) {
  const { mode, reportKb, online } = useDataMode();
  const [lines, setLines] = useState<ShopCartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [note, setNote] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [pay, setPay] = useState<ShopPaymentPreference>(() => defaultPaymentPreference(commerce));
  const [buyerCountry, setBuyerCountry] = useState("SN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const amountXof = useMemo(() => {
    let total = 0;
    let any = false;
    for (const l of lines) {
      const unit = parseXofFromLabel(l.priceLabel);
      if (unit == null) continue;
      any = true;
      total += unit * l.quantity;
    }
    return any ? total : null;
  }, [lines]);

  const methods = useMemo(
    () => commercePaymentOptions(commerce, { amountXof }),
    [commerce, amountXof],
  );

  const jokoCauris = useMemo(
    () => (amountXof != null && amountXof > 0 ? xofToCauris(amountXof) : null),
    [amountXof],
  );

  useEffect(() => {
    const next = defaultPaymentPreference(commerce);
    setPay((prev) => (methods.some((m) => m.id === prev) ? prev : next));
  }, [commerce, methods]);

  const refresh = useCallback(() => {
    setLines(readShopCart(subdomain));
  }, [subdomain]);

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("kebu-cart-changed", onStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("kebu-cart-changed", onStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  useEffect(() => {
    if (preview || !lines.length || !online) return;
    const t = window.setTimeout(() => {
      void fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/cart/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey: cartSessionKey(subdomain),
          items: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId ?? undefined,
            quantity: l.quantity,
          })),
          customerEmail: email.trim() || undefined,
          customerName: name.trim() || undefined,
          customerPhone: phone.trim() || undefined,
          discountCode: discountCode.trim() || undefined,
        }),
      }).catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(t);
  }, [lines, subdomain, email, name, phone, discountCode, preview, online]);

  const count = lines.reduce((s, l) => s + l.quantity, 0);
  if (count === 0 && !open && !done) return null;

  function setQty(line: ShopCartLine, quantity: number) {
    const key = cartLineKey(line);
    const next = readShopCart(subdomain)
      .map((l) =>
        cartLineKey(l) === key ? { ...l, quantity: Math.min(20, Math.max(1, quantity)) } : l,
      )
      .filter((l) => l.quantity > 0);
    writeShopCart(subdomain, next);
    window.dispatchEvent(new Event("kebu-cart-changed"));
    setLines(next);
  }

  function remove(line: ShopCartLine) {
    const key = cartLineKey(line);
    const next = readShopCart(subdomain).filter((l) => cartLineKey(l) !== key);
    writeShopCart(subdomain, next);
    window.dispatchEvent(new Event("kebu-cart-changed"));
    setLines(next);
  }

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    if (preview) {
      setError("Publish the site to check out a real cart.");
      return;
    }
    if ((pay === "card" || pay === "paypal") && !email.trim()) {
      setError("Email is required for card or PayPal checkout.");
      return;
    }
    if (isGift && (!recipientName.trim() || recipientPhone.trim().length < 8)) {
      setError("For a gift, add the recipient’s name and phone.");
      return;
    }
    setBusy(true);
    setError(null);
    trackShopEvent(subdomain, "checkout_start", { itemCount: lines.length });
    try {
      const res = await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/cart/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kebu-Data-Mode": mode,
        },
        body: JSON.stringify({
          items: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId ?? undefined,
            quantity: l.quantity,
          })),
          customerName: name,
          customerPhone: phone,
          customerNote: note,
          customerEmail: email.trim() || undefined,
          paymentPreference: pay,
          discountCode: discountCode.trim() || undefined,
          giftCardCode: giftCardCode.trim() || undefined,
          sessionKey: cartSessionKey(subdomain),
          buyerCountry,
          isGift,
          recipientName: isGift ? recipientName : undefined,
          recipientPhone: isGift ? recipientPhone : undefined,
          recipientEmail: isGift ? recipientEmail.trim() || undefined : undefined,
          giftMessage: isGift ? giftMessage : undefined,
        }),
      });
      const bytes = await measureResponseBytes(res);
      reportKb("place_order", bytes);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not check out.");
        return;
      }
      clearShopCart(subdomain);
      window.dispatchEvent(new Event("kebu-cart-changed"));
      setLines([]);
      trackShopEvent(subdomain, "purchase", { payment: pay });
      const giftExtra =
        typeof data.giftPath === "string"
          ? ` Share: ${typeof window !== "undefined" ? window.location.origin : ""}${data.giftPath}`
          : "";
      setDone((typeof data.message === "string" ? data.message : "Order saved.") + giftExtra);
      if (typeof data.paymentUrl === "string" && data.paymentUrl.startsWith("http")) {
        window.location.href = data.paymentUrl;
        return;
      }
      if (typeof data.whatsappHref === "string" && data.whatsappHref.startsWith("https://")) {
        window.open(data.whatsappHref, "_blank", "noopener,noreferrer");
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="kebu-shop-cart-fab"
        onClick={() => setOpen(true)}
        aria-label={`Open cart (${count} items)`}
      >
        Cart{count > 0 ? ` · ${count}` : ""}
      </button>
      {open ? (
        <div className="kebu-shop-cart-root" role="dialog" aria-modal="true" aria-label="Shopping cart">
          <button type="button" className="kebu-shop-cart-backdrop" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="kebu-shop-cart-panel">
            <h2 className="text-base font-bold">Your cart</h2>
            <p className="mt-1 text-[10px] opacity-60">
              <a href={`/sites/${encodeURIComponent(subdomain)}/account`} className="underline font-semibold">
                My account
              </a>{" "}
              — sign in to keep purchase history. Guest checkout still works.
            </p>
            {done ? (
              <p className="mt-3 text-sm opacity-80">{done}</p>
            ) : lines.length === 0 ? (
              <p className="mt-3 text-sm opacity-60">Cart is empty — add products from the shop.</p>
            ) : (
              <form className="mt-3 space-y-2" onSubmit={(e) => void checkout(e)}>
                <ul className="space-y-2 max-h-40 overflow-auto">
                  {lines.map((l) => (
                    <li key={cartLineKey(l)} className="flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{l.productName}</p>
                        {l.variantName ? <p className="opacity-50 text-[10px]">{l.variantName}</p> : null}
                        {l.priceLabel ? <p className="opacity-60">{l.priceLabel}</p> : null}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min={1}
                          max={20}
                          className="w-12 rounded border px-1 py-0.5"
                          value={l.quantity}
                          onChange={(e) => setQty(l, Number(e.target.value) || 1)}
                        />
                        <button type="button" className="underline opacity-60" onClick={() => remove(l)}>
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <input
                  required
                  maxLength={80}
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border px-2 py-1.5 text-xs"
                />
                <input
                  required
                  maxLength={24}
                  placeholder="WhatsApp / phone (for delivery texts)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border px-2 py-1.5 text-xs"
                />
                <input
                  type="email"
                  required={pay === "card" || pay === "paypal"}
                  maxLength={254}
                  placeholder={
                    pay === "card" || pay === "paypal"
                      ? "Email (required for card / PayPal)"
                      : "Email (optional)"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border px-2 py-1.5 text-xs"
                />
                <input
                  maxLength={32}
                  placeholder="Discount code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border px-2 py-1.5 text-xs font-mono"
                />
                <input
                  maxLength={32}
                  placeholder="Gift card code"
                  value={giftCardCode}
                  onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border px-2 py-1.5 text-xs font-mono"
                  autoComplete="off"
                />
                {methods.length > 1 ? (
                  <fieldset className="space-y-1.5">
                    <legend className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                      How you want to pay
                    </legend>
                    {methods.map((m) => (
                      <label
                        key={m.id}
                        className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2 py-1.5 text-xs ${
                          pay === m.id ? "border-black/40 bg-black/[0.03]" : "border-black/10"
                        }`}
                      >
                        <input
                          type="radio"
                          name="kebu-cart-pay"
                          className="mt-0.5"
                          checked={pay === m.id}
                          onChange={() => setPay(m.id)}
                        />
                        <span className="min-w-0 flex-1 font-semibold">
                          {m.label}
                          {m.recommended ? (
                            <span className="ml-1 text-[9px] font-bold uppercase tracking-wider opacity-60">
                              Recommended
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ) : null}
                <PublicShippingQuote
                  subdomain={subdomain}
                  sellerCountry="SN"
                  onChange={({ buyerCountry: c }) => setBuyerCountry(c)}
                />
                <textarea
                  maxLength={400}
                  placeholder="Note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-lg border px-2 py-1.5 text-xs"
                  rows={2}
                />
                <label className="flex items-center gap-2 text-[11px]">
                  <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} />
                  Buy for someone else (gift)
                </label>
                {isGift ? (
                  <div className="space-y-2 rounded-lg border border-black/10 bg-black/[0.02] p-2">
                    <input
                      required
                      maxLength={80}
                      placeholder="Recipient name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full rounded-lg border px-2 py-1.5 text-xs"
                    />
                    <input
                      required
                      maxLength={24}
                      placeholder="Recipient WhatsApp / phone"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="w-full rounded-lg border px-2 py-1.5 text-xs"
                    />
                    <input
                      type="email"
                      maxLength={254}
                      placeholder="Recipient email (optional)"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full rounded-lg border px-2 py-1.5 text-xs"
                    />
                    <textarea
                      maxLength={400}
                      placeholder="Gift message (optional)"
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value)}
                      className="w-full rounded-lg border px-2 py-1.5 text-xs"
                      rows={2}
                    />
                  </div>
                ) : null}
                {error ? <p className="text-[11px]" style={{ color: "#8B1E1E" }}>{error}</p> : null}
                <button
                  type="submit"
                  disabled={busy || !online}
                  className="kebu-cta w-full rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50"
                >
                  {busy
                    ? "Saving…"
                    : pay === "joko" && jokoCauris
                      ? jokoCauris.payLabel
                      : pay === "joko"
                        ? "Pay in Cauris"
                        : "Place cart order"}
                </button>
                <p className="text-[9px] opacity-50">
                  Not marked paid in the browser. JOKO paid only after webhook when you choose that method.
                </p>
              </form>
            )}
            <button type="button" className="mt-3 text-[11px] underline opacity-60" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function dispatchCartChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kebu-cart-changed"));
  }
}
