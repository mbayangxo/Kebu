import { z } from "zod";
import {
  normalizeWhatsAppPhone,
  paymentPreferenceLabel,
  SHOP_PAYMENT_PREFERENCES,
  whatsAppOrderHref,
  type ShopPaymentPreference,
} from "@/lib/create/site-commerce";
import { giftWhatsAppSuffix, shopGiftFieldsSchema } from "@/lib/shop/gift-order";

export const SHOP_ORDER_STATUSES = [
  "pending",
  "contacted",
  "fulfilled",
  "cancelled",
  "archived",
] as const;
export type ShopOrderStatus = (typeof SHOP_ORDER_STATUSES)[number];

export const shopOrderInputSchema = z
  .object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional().nullable(),
    customerName: z.string().trim().min(1).max(80),
    customerPhone: z.string().trim().min(8).max(24),
    customerNote: z.string().trim().max(400).default(""),
    customerEmail: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().email().max(254).optional(),
    ),
    emailVerificationToken: z
      .preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
        z.string().trim().min(16).max(128).optional(),
      )
      .optional(),
    quantity: z.coerce.number().int().min(1).max(20).default(1),
    paymentPreference: z.enum(SHOP_PAYMENT_PREFERENCES).optional().default("whatsapp"),
    /** Client hint: share · social · qr · web — where the buyer came from. */
    clientChannel: z
      .enum(["whatsapp", "web", "share", "social", "qr", "wave", "joko"])
      .optional(),
    /** Buyer destination ISO country (for corridor shipping quote). */
    buyerCountry: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/)
      .optional(),
    discountCode: z
      .preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
        z.string().trim().max(32).optional(),
      )
      .optional(),
  })
  .and(shopGiftFieldsSchema);

export type ShopOrderInput = z.infer<typeof shopOrderInputSchema>;

export function shopOrderWhatsAppMessage(opts: {
  orderId: string;
  orderNumber?: string | null;
  productName: string;
  productUpc?: string | null;
  quantity: number;
  priceLabel: string;
  customerName: string;
  customerNote: string;
  paymentPreference?: ShopPaymentPreference | string;
  discountCode?: string | null;
  discountPercent?: number | null;
  isGift?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  giftMessage?: string;
}): string {
  const ref =
    opts.orderNumber?.trim() ||
    opts.orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const note = opts.customerNote.trim() ? `\nNote: ${opts.customerNote.trim()}` : "";
  const price = opts.priceLabel.trim() ? ` (${opts.priceLabel.trim()})` : "";
  const upc = opts.productUpc?.trim() ? `\nUPC: ${opts.productUpc.trim()}` : "";
  const pay = opts.paymentPreference
    ? `\nPay preference: ${paymentPreferenceLabel(opts.paymentPreference)}`
    : "";
  const disc =
    opts.discountCode && opts.discountPercent
      ? `\nDiscount: ${opts.discountCode} (−${opts.discountPercent}%)`
      : "";
  const gift = giftWhatsAppSuffix(opts);
  return `Hi — I placed a Kebu shop order ${ref}.\n${opts.quantity}× ${opts.productName}${price}${upc}\nFrom: ${opts.customerName}${pay}${disc}${note}${gift}`;
}

export function shopOrderWhatsAppHref(merchantPhone: string, message: string): string {
  return whatsAppOrderHref(normalizeWhatsAppPhone(merchantPhone), message);
}
