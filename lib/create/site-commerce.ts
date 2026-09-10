import { z } from "zod";
import type { WebsiteDefinition } from "./website-schema";
import type { SiteSeo } from "./site-seo";
import { jokoPayHint } from "@/lib/shop/cauris";

/** How the merchant takes money for product orders — not hosting billing. */
export const siteCommerceSchema = z.object({
  /** WhatsApp number for product orders — digits only or with + */
  merchantWhatsApp: z.string().trim().max(24).default(""),
  /** Accept orders that continue on WhatsApp (default path today). */
  acceptWhatsApp: z.boolean().optional().default(true),
  /** Customer pays on delivery / in person. */
  acceptCod: z.boolean().optional().default(false),
  /** Customer pays with Wave / Orange Money / etc. — use instructions below. */
  acceptMobileMoney: z.boolean().optional().default(false),
  /** Debit / credit card (manual link, terminal, or PSP — instructions below). */
  acceptCard: z.boolean().optional().default(false),
  /** PayPal (paypal.me / email — instructions below). */
  acceptPaypal: z.boolean().optional().default(false),
  /** Plain-language how to pay (Wave number, bank, card link, etc.). Shown on the live shop. */
  paymentInstructions: z.string().trim().max(800).default(""),
  /** Extra steps for card (Stripe Payment Link, terminal, invoice). */
  cardInstructions: z.string().trim().max(800).default(""),
  /** PayPal.me URL, paypal.com/…, or PayPal email. */
  paypalHandle: z.string().trim().max(200).default(""),
  /** Label for the main pay CTA, e.g. "Pay with Wave". */
  mobileMoneyLabel: z.string().trim().max(60).default("Mobile money"),
  /** Label for card option, e.g. "Debit / credit card". */
  cardLabel: z.string().trim().max(60).default("Debit / credit card"),
  /** Label for PayPal option. */
  paypalLabel: z.string().trim().max(60).default("PayPal"),
  /**
   * When true, offer JOKO on the public order form.
   * Paid only after JOKO webhook — never from the browser.
   */
  preferJokoCheckout: z.boolean().optional().default(false),
  /**
   * Merchant explicitly opened Shop for this site (separate from the website).
   * Agencies can have a site with shopOpened false.
   */
  shopOpened: z.boolean().optional().default(false),
  /** ISO timestamp when shop was opened — set server-side on open. */
  shopOpenedAt: z.string().trim().max(40).optional().default(""),
  /** Wave business number or Wave.me / payment link merchants share in Senegal. */
  wavePayLink: z.string().trim().max(300).default(""),
  /** Public JOKO pay / checkout page URL when not using in-app JOKO checkout. */
  jokoPayLink: z.string().trim().max(300).default(""),
  /** Short label for share cards (Instagram / TikTok / WhatsApp status). */
  shareTagline: z.string().trim().max(120).default(""),
});

export type SiteCommerce = z.infer<typeof siteCommerceSchema>;

export const SHOP_PAYMENT_PREFERENCES = [
  "whatsapp",
  "cod",
  "mobile_money",
  "card",
  "paypal",
  "joko",
] as const;

export type ShopPaymentPreference = (typeof SHOP_PAYMENT_PREFERENCES)[number];

export function mergeSiteCommerce(partial: unknown, current?: unknown): SiteCommerce {
  const base = siteCommerceSchema.parse(
    current && typeof current === "object" ? current : {},
  );
  if (!partial || typeof partial !== "object") return base;
  const parsed = siteCommerceSchema.safeParse({ ...base, ...partial });
  return parsed.success ? parsed.data : base;
}

export function normalizeWhatsAppPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Merchant phone from site commerce settings, then whatsapp section, then contact section. */
export function resolveMerchantWhatsApp(
  definition: WebsiteDefinition,
  seo?: SiteSeo | null,
): string {
  const fromSeo = seo?.commerce ? normalizeWhatsAppPhone(seo.commerce.merchantWhatsApp) : "";
  if (fromSeo.length >= 8) return fromSeo;

  for (const page of definition.pages) {
    for (const section of page.sections) {
      if (section.type === "whatsapp") {
        const phone = normalizeWhatsAppPhone(String((section.props as { phone?: string }).phone ?? ""));
        if (phone.length >= 8) return phone;
      }
      if (section.type === "contact") {
        const phone = normalizeWhatsAppPhone(String((section.props as { phone?: string }).phone ?? ""));
        if (phone.length >= 8) return phone;
      }
    }
  }
  return "";
}

export function whatsAppOrderHref(phone: string, message: string): string {
  const digits = normalizeWhatsAppPhone(phone);
  if (!digits) return `https://wa.me/?text=${encodeURIComponent(message)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function jokoCheckoutAvailable(): boolean {
  return Boolean(process.env.JOKO_API_BASE_URL?.trim() && process.env.JOKO_API_SECRET?.trim());
}

/** Short badges for the public shop (honest — no fake paid checkout). */
export function commercePaymentLabels(commerce: SiteCommerce | null | undefined): string[] {
  if (!commerce) return ["WhatsApp order"];
  const labels: string[] = [];
  if (commerce.acceptWhatsApp !== false) labels.push("WhatsApp");
  if (commerce.acceptCod) labels.push("Pay on delivery");
  if (commerce.acceptMobileMoney) {
    labels.push(commerce.mobileMoneyLabel?.trim() || "Mobile money");
  }
  if (commerce.acceptCard) {
    labels.push(commerce.cardLabel?.trim() || "Debit / credit card");
  }
  if (commerce.acceptPaypal) {
    labels.push(commerce.paypalLabel?.trim() || "PayPal");
  }
  if (commerce.preferJokoCheckout) labels.push("Joko · Cauris");
  return labels.length ? labels : ["WhatsApp order"];
}

/** Options the customer can pick on Place order — Joko first when offered (native rail). */
export function commercePaymentOptions(
  commerce: SiteCommerce | null | undefined,
  opts?: { amountXof?: number | null },
): { id: ShopPaymentPreference; label: string; hint?: string; recommended?: boolean }[] {
  const c = mergeSiteCommerce(commerce);
  const optsList: { id: ShopPaymentPreference; label: string; hint?: string; recommended?: boolean }[] = [];

  if (c.preferJokoCheckout) {
    optsList.push({
      id: "joko",
      label: "Joko (Cauris)",
      recommended: true,
      hint: jokoPayHint(opts?.amountXof ?? null),
    });
  }
  if (c.acceptWhatsApp !== false) {
    optsList.push({ id: "whatsapp", label: "WhatsApp", hint: "Confirm and pay with the merchant on chat." });
  }
  if (c.acceptCod) {
    optsList.push({ id: "cod", label: "Pay on delivery", hint: "Cash or mobile money when you receive it." });
  }
  if (c.acceptMobileMoney) {
    optsList.push({
      id: "mobile_money",
      label: c.mobileMoneyLabel?.trim() || "Mobile money",
      hint: c.paymentInstructions?.trim() || "Wave, Orange Money, and other local wallets — follow the shop’s steps.",
    });
  }
  if (c.acceptCard) {
    optsList.push({
      id: "card",
      label: c.cardLabel?.trim() || "Debit / credit card",
      hint:
        c.cardInstructions?.trim() ||
        "Live card checkout when Paystack is configured; otherwise follow the shop’s card steps.",
    });
  }
  if (c.acceptPaypal) {
    const handle = c.paypalHandle?.trim();
    optsList.push({
      id: "paypal",
      label: c.paypalLabel?.trim() || "PayPal",
      hint:
        handle ||
        "Live PayPal checkout when keys are set; otherwise the merchant shares PayPal details.",
    });
  }
  return optsList.length ? optsList : [{ id: "whatsapp", label: "WhatsApp" }];
}

/** Default pay method: Joko when offered, else first option. */
export function defaultPaymentPreference(
  commerce: SiteCommerce | null | undefined,
): ShopPaymentPreference {
  const opts = commercePaymentOptions(commerce);
  const joko = opts.find((o) => o.id === "joko");
  return joko?.id ?? opts[0]?.id ?? "whatsapp";
}

export function paymentPreferenceLabel(id: ShopPaymentPreference | string | null | undefined): string {
  switch (id) {
    case "cod":
      return "Pay on delivery";
    case "mobile_money":
      return "Mobile money";
    case "card":
      return "Debit / credit card";
    case "paypal":
      return "PayPal";
    case "joko":
      return "Joko (Cauris)";
    case "whatsapp":
    default:
      return "WhatsApp";
  }
}

/** Normalize PayPal.me / email / URL for display (not a live checkout redirect). */
export function formatPaypalHint(handle: string): string {
  const t = handle.trim();
  if (!t) return "";
  if (t.includes("@") && !t.includes("://")) return `PayPal: ${t}`;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.toLowerCase().startsWith("paypal.me/")) return `https://${t}`;
  return t;
}
