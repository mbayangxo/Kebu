"use client";

import { useEffect, useMemo, useState } from "react";
import {
  commercePaymentOptions,
  defaultPaymentPreference,
  formatPaypalHint,
  mergeSiteCommerce,
  type ShopPaymentPreference,
  type SiteCommerce,
} from "@/lib/create/site-commerce";
import { useDataMode } from "@/app/components/create/data-mode-provider";
import { enqueuePlaceOrder, isBrowserOnline } from "@/lib/create/offline-queue";
import { measureResponseBytes } from "@/lib/create/kb-budget";
import { addToShopCart } from "@/lib/create/shop-cart-storage";
import { PublicShippingQuote } from "@/app/components/create/public-shipping-quote";
import type { ShippingQuote } from "@/lib/shop/shipping-corridors";
import { xofToCauris } from "@/lib/shop/cauris";
import { parseXofFromLabel } from "@/lib/shop/joko-order";
import { dispatchCartChanged } from "@/app/components/create/public-shop-cart";

/** Live-site order form. Saves to shop_orders then opens WhatsApp. Never marks paid. */
export type ShopOrderFormStyle = "inline" | "sheet" | "card" | "minimal";

export function PublicShopOrder({
  subdomain,
  productId,
  variantId,
  variantName,
  productName,
  productPrice = "",
  commerce,
  orderStyle = "inline",
  ctaLabel = "Place order",
}: {
  subdomain: string;
  productId: string;
  variantId?: string;
  variantName?: string;
  productName: string;
  /** Shown in cart; optional when price is unknown. */
  productPrice?: string;
  commerce?: SiteCommerce | null;
  orderStyle?: ShopOrderFormStyle;
  ctaLabel?: string;
}) {
  const merged = useMemo(() => mergeSiteCommerce(commerce), [commerce]);
  const { mode, reportKb, online } = useDataMode();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [note, setNote] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [qty, setQty] = useState(1);
  const [pay, setPay] = useState<ShopPaymentPreference>(() => defaultPaymentPreference(commerce));
  const [buyerCountry, setBuyerCountry] = useState("SN");
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [syncingNote, setSyncingNote] = useState<string | null>(null);

  const amountXof = useMemo(() => {
    const unit = parseXofFromLabel(productPrice);
    return unit != null ? unit * qty : null;
  }, [productPrice, qty]);

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

  const selectedHint = methods.find((m) => m.id === pay)?.hint;
  const emailRequired = pay === "card" || pay === "paypal";
  const submitLabel =
    busy
      ? "Saving…"
      : !online || mode === "offline"
        ? "Queue order"
        : pay === "joko" && jokoCauris
          ? jokoCauris.payLabel
          : pay === "joko"
            ? "Pay in Cauris"
            : pay === "mbolo"
              ? "Save order + Mbolo"
              : "Save order + WhatsApp";

  function resolveClientChannel():
    | "whatsapp"
    | "web"
    | "share"
    | "social"
    | "qr"
    | "wave"
    | "joko"
    | undefined {
    if (typeof window === "undefined") return undefined;
    const from = new URLSearchParams(window.location.search).get("from")?.toLowerCase();
    if (
      from === "share" ||
      from === "social" ||
      from === "qr" ||
      from === "wave" ||
      from === "joko" ||
      from === "whatsapp" ||
      from === "web"
    ) {
      return from;
    }
    return "web";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSyncingNote(null);

    if (emailRequired && !email.trim()) {
      setError("Email is required for card or PayPal checkout.");
      setBusy(false);
      return;
    }

    const clientChannel = resolveClientChannel();
    const payload = {
      subdomain,
      productId,
      variantId,
      productName,
      customerName: name,
      customerPhone: phone,
      customerNote: note,
      customerEmail: email.trim() || undefined,
      quantity: qty,
      paymentPreference: pay,
      clientChannel,
      buyerCountry,
      discountCode: discountCode.trim() || undefined,
      isGift,
      recipientName: isGift ? recipientName : undefined,
      recipientPhone: isGift ? recipientPhone : undefined,
      recipientEmail: isGift ? recipientEmail.trim() || undefined : undefined,
      giftMessage: isGift ? giftMessage : undefined,
    };

    if (isGift && (!recipientName.trim() || recipientPhone.trim().length < 8)) {
      setError("For a gift, add the recipient’s name and phone.");
      setBusy(false);
      return;
    }

    if (!isBrowserOnline() || mode === "offline" || !online) {
      enqueuePlaceOrder(payload);
      setDone(null);
      setSyncingNote(
        "Queued on this phone — not saved on Kebu yet. When you are online, tap Sync on the Data mode control.",
      );
      setBusy(false);
      return;
    }

    try {
      const res = await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kebu-Data-Mode": mode,
        },
          body: JSON.stringify({
          productId,
          variantId: variantId ?? undefined,
          customerName: name,
          customerPhone: phone,
          customerNote: note,
          customerEmail: email.trim() || undefined,
          quantity: qty,
          paymentPreference: pay,
          clientChannel,
          buyerCountry,
          discountCode: discountCode.trim() || undefined,
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
        setError(typeof data.error === "string" ? data.error : "Could not place order.");
        return;
      }
      const giftExtra =
        typeof data.giftPath === "string"
          ? ` Share with recipient: ${typeof window !== "undefined" ? window.location.origin : ""}${data.giftPath}`
          : "";
      setDone((typeof data.message === "string" ? data.message : "Order saved.") + giftExtra);
      if (typeof data.paymentUrl === "string" && data.paymentUrl.startsWith("http")) {
        window.location.href = data.paymentUrl;
        return;
      }
      if (typeof data.mboloHref === "string" && data.mboloHref.startsWith("https://")) {
        window.open(data.mboloHref, "_blank", "noopener,noreferrer");
      } else if (typeof data.whatsappHref === "string" && data.whatsappHref.startsWith("https://")) {
        window.open(data.whatsappHref, "_blank", "noopener,noreferrer");
      }
    } catch {
      enqueuePlaceOrder(payload);
      setSyncingNote(
        "Network failed — order queued locally (not saved on server yet). Sync when you reconnect.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="text-[11px] mt-2 opacity-80">{done}</p>;
  }

  if (syncingNote) {
    return <p className="text-[11px] mt-2 opacity-80" style={{ color: "#B45309" }}>{syncingNote}</p>;
  }

  if (!open) {
    return (
      <div className="kebu-shop-order-actions flex flex-wrap gap-2">
        <button
          type="button"
          className={`kebu-cta inline-block text-xs font-bold ${
            orderStyle === "minimal" ? "rounded px-3 py-1.5 underline-offset-2" : "rounded-full px-4 py-2"
          }`}
          onClick={() => setOpen(true)}
        >
          {ctaLabel.trim() || "Place order"}
        </button>
        <button
          type="button"
          className={`kebu-shop-add-cart inline-block text-xs font-bold border border-current opacity-90 ${
            orderStyle === "minimal" ? "rounded px-3 py-1.5" : "rounded-full px-4 py-2"
          }`}
          onClick={() => {
            addToShopCart(subdomain, {
              productId,
              variantId: variantId ?? null,
              variantName,
              productName,
              priceLabel: productPrice,
              quantity: 1,
            });
            dispatchCartChanged();
          }}
        >
          Add to cart
        </button>
      </div>
    );
  }

  const formInner = (
    <>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Order {productName}</p>
      <input
        required
        maxLength={80}
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-black"
      />
      <input
        required
        maxLength={24}
        placeholder="WhatsApp / phone (for delivery texts)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-black"
      />
      {orderStyle !== "minimal" || emailRequired ? (
        <input
          type="email"
          required={emailRequired}
          maxLength={254}
          placeholder={
            emailRequired ? "Email (required for card / PayPal)" : "Email (optional)"
          }
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-black"
        />
      ) : null}
      {orderStyle !== "minimal" ? (
        <input
          maxLength={32}
          placeholder="Discount code (optional)"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
          className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-black tracking-wide"
          autoCapitalize="characters"
        />
      ) : null}
      <input
        type="number"
        min={1}
        max={20}
        value={qty}
        onChange={(e) => setQty(Number(e.target.value) || 1)}
        className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-black"
      />
      {orderStyle !== "minimal" ? (
        <PublicShippingQuote
          subdomain={subdomain}
          sellerCountry="SN"
          onChange={({ buyerCountry: c, quote }) => {
            setBuyerCountry(c);
            setShippingQuote(quote);
          }}
        />
      ) : null}
      {shippingQuote ? (
        <p className="text-[10px] opacity-70">Quoted shipping will be saved with your order.</p>
      ) : null}
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
                name="kebu-pay"
                className="mt-0.5"
                checked={pay === m.id}
                onChange={() => setPay(m.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="font-semibold">
                  {m.label}
                  {m.recommended ? (
                    <span className="ml-1 text-[9px] font-bold uppercase tracking-wider opacity-60">
                      Recommended
                    </span>
                  ) : null}
                </span>
                {m.hint && pay === m.id ? (
                  <span className="mt-0.5 block text-[10px] leading-relaxed opacity-70">{m.hint}</span>
                ) : null}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {methods.length === 1 && selectedHint ? (
        <p className="text-[10px] leading-relaxed opacity-70">{selectedHint}</p>
      ) : null}
      {pay === "paypal" && merged.paypalHandle.trim() ? (
        <p className="text-[10px] leading-relaxed opacity-80">
          PayPal: {formatPaypalHint(merged.paypalHandle)}
        </p>
      ) : null}
      {pay === "card" && (merged.cardInstructions.trim() || merged.paymentInstructions.trim()) ? (
        <p className="text-[10px] leading-relaxed opacity-80">
          {merged.cardInstructions.trim() || merged.paymentInstructions.trim()}
        </p>
      ) : null}
      {orderStyle !== "minimal" ? (
        <textarea
          maxLength={400}
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-black"
          rows={2}
        />
      ) : null}
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
            className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-black"
          />
          <input
            required
            maxLength={24}
            placeholder="Recipient WhatsApp / phone"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-black"
          />
          <input
            type="email"
            maxLength={254}
            placeholder="Recipient email (optional)"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-black"
          />
          <textarea
            maxLength={400}
            placeholder="Gift message (optional)"
            value={giftMessage}
            onChange={(e) => setGiftMessage(e.target.value)}
            className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-black"
            rows={2}
          />
        </div>
      ) : null}
      {error ? <p className="text-[11px] text-red-700">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="kebu-cta rounded-full px-3 py-1.5 text-[10px] font-bold disabled:opacity-50"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          className="text-[10px] underline opacity-60"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </>
  );

  if (orderStyle === "sheet") {
    return (
      <div className="kebu-order-sheet-root" role="dialog" aria-label={`Order ${productName}`}>
        <button
          type="button"
          className="kebu-order-sheet-backdrop"
          aria-label="Close"
          onClick={() => setOpen(false)}
        />
        <form
          onSubmit={(e) => void submit(e)}
          className="kebu-order-sheet-panel space-y-2 text-left"
        >
          {formInner}
        </form>
      </div>
    );
  }

  const formClass =
    orderStyle === "card"
      ? "mt-3 space-y-2 text-left rounded-xl border border-black/12 bg-white/95 p-3 shadow-sm"
      : orderStyle === "minimal"
        ? "mt-2 space-y-1.5 text-left"
        : "mt-3 space-y-2 text-left";

  return (
    <form onSubmit={(e) => void submit(e)} className={formClass}>
      {formInner}
    </form>
  );
}
