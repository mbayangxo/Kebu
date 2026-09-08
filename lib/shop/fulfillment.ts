import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCampaignEmail } from "@/lib/email/send-campaign";
import { normalizeWhatsAppPhone, whatsAppOrderHref } from "@/lib/create/site-commerce";
import {
  buildTrackingUrl,
  carrierLabel,
  isShopCarrierId,
  type ShopCarrierId,
} from "@/lib/shop/carriers";
import { refreshShopCustomerFromOrders } from "@/lib/shop/customer-profiles";

export const SHOP_ORDER_FULFILL_STATUSES = [
  "pending",
  "contacted",
  "fulfilled",
  "cancelled",
  "archived",
] as const;

export type ShopFulfillStatus = (typeof SHOP_ORDER_FULFILL_STATUSES)[number];

export type FulfillNotifyVia = "email" | "whatsapp" | "both" | "none";

export type FulfillOrderInput = {
  orderId: string;
  projectId: string;
  action: "fulfill" | "archive" | "status";
  status?: ShopFulfillStatus;
  trackingNumber?: string | null;
  carrier?: string | null;
  notifyVia?: FulfillNotifyVia;
  /** Also send a plain “order update” email without requiring tracking. */
  emailCustomer?: boolean;
  shopName?: string;
};

export function trackingMessage(opts: {
  shopName: string;
  orderLabel: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}): string {
  const lines = [
    `Hi — update from ${opts.shopName}.`,
    `Your order ${opts.orderLabel} is on the way.`,
  ];
  if (opts.carrier && opts.carrier !== "pickup") {
    lines.push(`Carrier: ${carrierLabel(opts.carrier)}`);
  }
  if (opts.trackingNumber) {
    lines.push(`Tracking: ${opts.trackingNumber}`);
  }
  if (opts.trackingUrl) {
    lines.push(`Track here: ${opts.trackingUrl}`);
  }
  if (opts.carrier === "pickup") {
    lines.push("Ready for pickup — reply if you need directions.");
  }
  return lines.join("\n");
}

export async function notifyCustomerOrderUpdate(opts: {
  customerEmail: string | null;
  customerPhone: string | null;
  notifyVia: FulfillNotifyVia;
  subject: string;
  text: string;
  shopName: string;
}): Promise<{ emailed: boolean; whatsappHref: string | null }> {
  let emailed = false;
  let whatsappHref: string | null = null;

  const wantEmail = opts.notifyVia === "email" || opts.notifyVia === "both";
  const wantWa = opts.notifyVia === "whatsapp" || opts.notifyVia === "both";

  if (wantEmail && opts.customerEmail?.includes("@")) {
    const from =
      process.env.RESEND_FROM_EMAIL?.trim() ||
      process.env.CAMPAIGN_FROM_EMAIL?.trim() ||
      "orders@kebu.africa";
    emailed = await sendCampaignEmail({
      to: opts.customerEmail.trim().toLowerCase(),
      from,
      fromName: opts.shopName.slice(0, 60),
      subject: opts.subject,
      text: opts.text,
      html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${opts.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</pre>`,
    });
  }

  if (wantWa && opts.customerPhone) {
    const phone = normalizeWhatsAppPhone(opts.customerPhone);
    if (phone) {
      whatsappHref = whatsAppOrderHref(phone, opts.text);
    }
  }

  return { emailed, whatsappHref };
}

export async function fulfillShopOrder(
  supabase: SupabaseClient,
  admin: SupabaseClient | null,
  opts: FulfillOrderInput,
): Promise<
  | {
      ok: true;
      order: Record<string, unknown>;
      whatsappHref: string | null;
      emailed: boolean;
    }
  | { ok: false; error: string; status?: number }
> {
  const { data: existing } = await supabase
    .from("shop_orders")
    .select(
      "id, status, product_id, quantity, customer_name, customer_phone, customer_email, order_number, product_name, tracking_number, carrier, tracking_url",
    )
    .eq("id", opts.orderId)
    .eq("project_id", opts.projectId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Order not found.", status: 404 };
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};

  if (opts.action === "archive") {
    patch.status = "archived";
    patch.archived_at = now;
  } else if (opts.action === "status" && opts.status) {
    if (!SHOP_ORDER_FULFILL_STATUSES.includes(opts.status)) {
      return { ok: false, error: "Invalid status.", status: 400 };
    }
    patch.status = opts.status;
    if (opts.status === "fulfilled") patch.fulfilled_at = now;
    if (opts.status === "archived") patch.archived_at = now;
  } else if (opts.action === "fulfill") {
    const tracking = opts.trackingNumber?.trim() || null;
    const carrierRaw = opts.carrier?.trim() || null;
    if (carrierRaw && !isShopCarrierId(carrierRaw)) {
      return { ok: false, error: "Unknown carrier.", status: 400 };
    }
    const carrier = (carrierRaw as ShopCarrierId | null) ?? (tracking ? "other" : "pickup");
    const trackingUrl = buildTrackingUrl(carrier, tracking);
    patch.status = "fulfilled";
    patch.fulfilled_at = now;
    patch.tracking_number = tracking;
    patch.carrier = carrier;
    patch.tracking_url = trackingUrl;
  } else {
    return { ok: false, error: "Invalid action.", status: 400 };
  }

  // Optional tracking update when marking status fulfilled with fields present
  if (opts.action === "status" && opts.status === "fulfilled") {
    if (opts.trackingNumber?.trim()) {
      const carrier =
        opts.carrier && isShopCarrierId(opts.carrier) ? opts.carrier : "other";
      patch.tracking_number = opts.trackingNumber.trim();
      patch.carrier = carrier;
      patch.tracking_url = buildTrackingUrl(carrier, opts.trackingNumber.trim());
    }
  }

  const notifyVia: FulfillNotifyVia =
    opts.notifyVia ??
    (opts.emailCustomer ? "email" : opts.action === "fulfill" ? "both" : "none");

  const { data: updated, error } = await supabase
    .from("shop_orders")
    .update(patch)
    .eq("id", opts.orderId)
    .eq("project_id", opts.projectId)
    .select(
      "id, status, tracking_number, carrier, tracking_url, fulfilled_at, archived_at, customer_notified_at, customer_notify_via, customer_name, customer_phone, customer_email, order_number, product_name",
    )
    .maybeSingle();

  if (error || !updated) {
    return {
      ok: false,
      error: error?.message?.includes("tracking_number") || error?.message?.includes("carrier")
        ? "Apply migration 054_shop_fulfillment_customers.sql (or re-run APPLY_SHOP_ORDERS.sql)."
        : "Could not update order.",
      status: 500,
    };
  }

  const shopName = opts.shopName?.trim() || "Your shop";
  const orderLabel =
    (typeof updated.order_number === "string" && updated.order_number) ||
    String(updated.id).replace(/-/g, "").slice(0, 8).toUpperCase();

  let emailed = false;
  let whatsappHref: string | null = null;

  const shouldNotify =
    notifyVia !== "none" &&
    (opts.action === "fulfill" ||
      opts.emailCustomer ||
      (opts.action === "status" && opts.status === "fulfilled"));

  if (shouldNotify) {
    const text = trackingMessage({
      shopName,
      orderLabel,
      carrier: (updated.carrier as string) ?? null,
      trackingNumber: (updated.tracking_number as string) ?? null,
      trackingUrl: (updated.tracking_url as string) ?? null,
    });
    const result = await notifyCustomerOrderUpdate({
      customerEmail: (updated.customer_email as string) ?? null,
      customerPhone: (updated.customer_phone as string) ?? null,
      notifyVia,
      subject: `${shopName} — order ${orderLabel} update`,
      text,
      shopName,
    });
    emailed = result.emailed;
    whatsappHref = result.whatsappHref;

    if (emailed || whatsappHref) {
      await supabase
        .from("shop_orders")
        .update({
          customer_notified_at: now,
          customer_notify_via: notifyVia,
        })
        .eq("id", opts.orderId)
        .eq("project_id", opts.projectId);
    }
  }

  const writer = admin ?? supabase;
  try {
    await refreshShopCustomerFromOrders(writer, {
      projectId: opts.projectId,
      phone: (updated.customer_phone as string) ?? null,
      email: (updated.customer_email as string) ?? null,
    });
  } catch {
    /* profile refresh best-effort */
  }

  return {
    ok: true,
    order: updated as Record<string, unknown>,
    whatsappHref,
    emailed,
  };
}
