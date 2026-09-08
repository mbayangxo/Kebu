import {
  mergeSiteCommerce,
  normalizeWhatsAppPhone,
  whatsAppOrderHref,
  type SiteCommerce,
} from "@/lib/create/site-commerce";

export type ShareOrderPayload = {
  storeUrl: string;
  productName?: string;
  priceLabel?: string;
  productId?: string;
  businessName?: string;
};

/** Absolute product deep link on the live Kebu storefront (shop page + query). */
export function productShareUrl(
  storeUrl: string,
  productId?: string,
  from: "share" | "qr" | "social" | "web" = "share",
): string {
  const base = storeUrl.replace(/\/$/, "");
  const shop = productId
    ? base.includes("/shop")
      ? base
      : `${base}/shop`
    : base;
  const params = new URLSearchParams();
  if (productId) params.set("product", productId);
  params.set("from", from);
  const join = shop.includes("?") ? "&" : "?";
  return `${shop}${join}${params.toString()}`;
}

export function buildOrderShareText(payload: ShareOrderPayload, commerce?: SiteCommerce | null): string {
  const c = mergeSiteCommerce(commerce);
  const name = payload.productName?.trim() || "this product";
  const price = payload.priceLabel?.trim();
  const biz = payload.businessName?.trim();
  const tag = c.shareTagline?.trim();
  const link = productShareUrl(payload.storeUrl, payload.productId);
  const lines = [
    biz ? `${biz}` : null,
    tag || null,
    price ? `Order: ${name} — ${price}` : `Order: ${name}`,
    `Link: ${link}`,
    "Pay: WhatsApp · Wave · JOKO (as the seller confirms)",
  ].filter(Boolean);
  return lines.join("\n");
}

export function shareChannelHrefs(
  payload: ShareOrderPayload,
  commerce?: SiteCommerce | null,
): {
  whatsapp: string;
  wave: string | null;
  joko: string | null;
  facebook: string;
  twitter: string;
  copyText: string;
  qrUrl: string;
} {
  const c = mergeSiteCommerce(commerce);
  const text = buildOrderShareText(payload, c);
  const link = productShareUrl(payload.storeUrl, payload.productId, "share");
  const socialLink = productShareUrl(payload.storeUrl, payload.productId, "social");
  const qrLink = productShareUrl(payload.storeUrl, payload.productId, "qr");
  const phone = normalizeWhatsAppPhone(c.merchantWhatsApp);
  const whatsapp = whatsAppOrderHref(phone, text);
  const wave = c.wavePayLink?.trim() || null;
  const joko = c.jokoPayLink?.trim() || (c.preferJokoCheckout ? link : null);
  return {
    whatsapp,
    wave,
    joko,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(socialLink)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(socialLink)}`,
    copyText: text,
    qrUrl: qrLink,
  };
}
