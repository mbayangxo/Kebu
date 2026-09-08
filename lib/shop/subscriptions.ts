import { z } from "zod";

export const SUBSCRIPTION_INTERVALS = ["weekly", "monthly", "quarterly", "yearly"] as const;
export type SubscriptionInterval = (typeof SUBSCRIPTION_INTERVALS)[number];

export const subscriptionInputSchema = z.object({
  productId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(80),
  customerPhone: z.string().trim().min(8).max(24),
  customerEmail: z.string().trim().email().max(254).optional(),
  interval: z.enum(SUBSCRIPTION_INTERVALS),
  priceXof: z.number().int().min(0),
});

/** Customer subscribe on a live published site (C8). Price/interval come from the product when omitted. */
export const publicSubscribeSchema = z.object({
  productId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(80),
  customerPhone: z.string().trim().min(8).max(24),
  customerEmail: z.string().trim().email().max(254).optional(),
  interval: z.enum(SUBSCRIPTION_INTERVALS).optional(),
});

export type SubscriptionRow = {
  id: string;
  project_id: string;
  product_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  interval: string;
  price_xof: number;
  status: string;
  next_billing_at: string | null;
  created_at: string;
};

export function mapSubscription(row: SubscriptionRow) {
  return {
    id: row.id,
    productId: row.product_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    interval: row.interval,
    priceXof: row.price_xof,
    status: row.status,
    nextBillingAt: row.next_billing_at,
    createdAt: row.created_at,
  };
}

export function nextBillingDate(interval: string, from = new Date()): string {
  const d = new Date(from.getTime());
  if (interval === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (interval === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  else if (interval === "quarterly") d.setUTCMonth(d.getUTCMonth() + 3);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
}

export function labelSubscriptionInterval(interval: string): string {
  switch (interval) {
    case "weekly":
      return "every week";
    case "monthly":
      return "every month";
    case "quarterly":
      return "every 3 months";
    case "yearly":
      return "every year";
    default:
      return interval;
  }
}

export function subscriptionOrderNote(kind: "first" | "renewal", interval: string): string {
  const label = labelSubscriptionInterval(interval);
  if (kind === "first") {
    return `Subscription · first period (${label}). Collect via WhatsApp / Wave / JOKO — not auto-charged.`;
  }
  return `Subscription · renewal (${label}). Collect payment with the customer — Africa-honest, no silent card charge.`;
}

export function formatSubscriptionPriceLabel(priceXof: number, interval: string): string {
  return `${priceXof.toLocaleString("fr-FR")} XOF · ${labelSubscriptionInterval(interval)}`;
}
