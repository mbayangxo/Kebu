import { NextResponse } from "next/server";
import { shopOrderRateLimit } from "@/lib/api-guard";
import { logCreate } from "@/lib/create/auth";
import { resolveMerchantWhatsApp } from "@/lib/create/site-commerce";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { createServiceClient } from "@/lib/opportunity/admin";
import { parseXofFromLabel } from "@/lib/shop/joko-order";
import {
  formatSubscriptionPriceLabel,
  mapSubscription,
  nextBillingDate,
  publicSubscribeSchema,
  subscriptionOrderNote,
  type SubscriptionRow,
} from "@/lib/shop/subscriptions";
import { shopOrderWhatsAppHref } from "@/lib/shop/create-order";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

/**
 * C8 — customer subscribes to a subscription product on a live site.
 * Creates shop_subscriptions + first pending period order (collect via WhatsApp/Wave/JOKO — not auto-charged).
 */
export async function POST(req: Request, { params }: Params) {
  const limited = shopOrderRateLimit(req);
  if (limited) return limited;

  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subdomain) || subdomain.length < 3) {
    return NextResponse.json({ error: "Invalid site address." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = publicSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: live } = await admin
    .from("deployments")
    .select("id, project_id, snapshot, status")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();

  if (!live?.project_id) {
    return NextResponse.json({ error: "Site is not live." }, { status: 404 });
  }

  let { data: product, error: productError } = await admin
    .from("project_products")
    .select(
      "id, project_id, name, price_label, price_xof, is_active, is_subscription, subscription_interval",
    )
    .eq("id", parsed.data.productId)
    .eq("project_id", live.project_id)
    .eq("is_active", true)
    .maybeSingle();

  if (productError && /is_subscription|subscription_interval/i.test(productError.message ?? "")) {
    return NextResponse.json(
      { error: "Subscriptions need migration 066_remaining_slices.sql on this database." },
      { status: 503 },
    );
  }

  if (productError || !product) {
    return NextResponse.json({ error: "That product is not available." }, { status: 404 });
  }

  if (!product.is_subscription) {
    return NextResponse.json(
      { error: "This product is not set up for subscriptions. Ask the merchant to enable Subscribe on it." },
      { status: 400 },
    );
  }

  const interval =
    parsed.data.interval ??
    (product.subscription_interval as "weekly" | "monthly" | "quarterly" | "yearly" | null) ??
    "monthly";

  const priceXof =
    typeof product.price_xof === "number" && product.price_xof >= 0
      ? product.price_xof
      : parseXofFromLabel(product.price_label) ?? 0;

  const { data: sub, error: subError } = await admin
    .from("shop_subscriptions")
    .insert({
      project_id: live.project_id,
      product_id: product.id,
      customer_name: parsed.data.customerName,
      customer_phone: parsed.data.customerPhone,
      customer_email: parsed.data.customerEmail ?? null,
      interval,
      price_xof: priceXof,
      status: "active",
      next_billing_at: nextBillingDate(interval),
    })
    .select("*")
    .single();

  if (subError || !sub) {
    logCreate("shop.subscribe_failed", {
      projectId: live.project_id,
      message: subError?.message,
    });
    return NextResponse.json(
      {
        error: subError?.message?.includes("does not exist")
          ? "Apply migration 066_remaining_slices.sql."
          : "Could not start subscription.",
      },
      { status: 500 },
    );
  }

  const priceLabel = formatSubscriptionPriceLabel(priceXof, interval);
  const note = subscriptionOrderNote("first", interval);

  const { data: order, error: orderError } = await admin
    .from("shop_orders")
    .insert({
      project_id: live.project_id,
      product_id: product.id,
      product_name: product.name,
      price_label: priceLabel,
      quantity: 1,
      customer_name: parsed.data.customerName,
      customer_phone: parsed.data.customerPhone,
      customer_note: note,
      customer_email: parsed.data.customerEmail ?? null,
      payment_preference: "whatsapp",
      status: "pending",
      channel: "whatsapp",
    })
    .select("id")
    .maybeSingle();

  if (orderError) {
    logCreate("shop.subscribe_order_failed", {
      projectId: live.project_id,
      subscriptionId: sub.id,
      message: orderError.message,
    });
  }

  const snap = live.snapshot as { definition?: WebsiteDefinition } | null;
  const merchantPhone = resolveMerchantWhatsApp(snap?.definition ?? null);
  const whatsappHref = merchantPhone
    ? shopOrderWhatsAppHref(
        merchantPhone,
        [
          `Hi — new subscription for ${product.name}`,
          priceLabel,
          `Customer: ${parsed.data.customerName}`,
          `Phone: ${parsed.data.customerPhone}`,
          note,
        ].join("\n"),
      )
    : null;

  return NextResponse.json(
    {
      subscription: mapSubscription(sub as SubscriptionRow),
      orderId: order?.id ?? null,
      whatsappHref,
      message:
        "Subscription started. First period order is pending — pay the merchant on WhatsApp, Wave, or JOKO when they contact you.",
    },
    { status: 201 },
  );
}
