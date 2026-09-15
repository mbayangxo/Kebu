import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { activateSiteSubscriptionPayment } from "@/lib/billing/activate-site-subscription";
import { parseHostingPlan } from "@/lib/billing/subscriptions";
import { parseKebuPlanId } from "@/lib/billing/pricing";
import { verifyJokoWebhookSignature, sendJokoPartnerMessage } from "@/lib/joko/payments";
import { normalizeWhatsAppPhone } from "@/lib/create/site-commerce";

export const dynamic = "force-dynamic";

/**
 * After Joko confirms a shop_order payment, send Mbolo messages to buyer and merchant.
 * Fire-and-forget — never awaited on the hot path, never throws.
 */
async function sendShopOrderPaidMessages(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: string,
  projectId: string,
): Promise<void> {
  if (!supabase) return;
  try {
    const [orderRes, deployRes] = await Promise.all([
      supabase
        .from("shop_orders")
        .select("customer_name, customer_phone, product_name, quantity, order_number, amount_xof, payment_preference")
        .eq("id", orderId)
        .maybeSingle(),
      supabase
        .from("deployments")
        .select("snapshot")
        .eq("project_id", projectId)
        .eq("status", "live")
        .maybeSingle(),
    ]);

    const order = orderRes.data;
    if (!order) return;

    const snapshot = deployRes.data?.snapshot as
      | { seo?: { siteTitle?: string; commerce?: { merchantWhatsApp?: string } } }
      | null;
    const shopName = snapshot?.seo?.siteTitle ?? "Kebu Shop";
    const orderRef = (order as { order_number?: string | null }).order_number ||
      orderId.slice(0, 8).toUpperCase();

    // — Buyer confirmation —
    const buyerPhone = normalizeWhatsAppPhone(
      String((order as { customer_phone?: string | null }).customer_phone ?? ""),
    );
    if (buyerPhone) {
      const xof = (order as { amount_xof?: number | null }).amount_xof;
      const amtLabel = xof ? ` (${new Intl.NumberFormat("fr-FR").format(xof)} XOF)` : "";
      const buyerText = [
        `✅ Paiement reçu — ${shopName}`,
        `Merci ${(order as { customer_name?: string }).customer_name ?? ""}!`,
        `Commande #${orderRef}${amtLabel} confirmée.`,
        `Le vendeur va vous contacter pour la livraison.`,
      ].join("\n");
      await sendJokoPartnerMessage({
        toPhone: `+${buyerPhone}`,
        text: buyerText,
        channel: "mbolo_auto",
        metadata: { kind: "buyer_order_confirmation", order_id: orderId },
        idempotencyKey: `buyer-confirm-${orderId}`,
      });
    }

    // — Merchant new-order alert (merchant phone stored in deployment snapshot seo.commerce) —
    const rawMerchantPhone = snapshot?.seo?.commerce?.merchantWhatsApp ?? "";
    const merchantPhone = normalizeWhatsAppPhone(rawMerchantPhone);
    if (merchantPhone) {
      const qty = (order as { quantity?: number }).quantity ?? 1;
      const prod = (order as { product_name?: string }).product_name ?? "produit";
      const customerName = (order as { customer_name?: string }).customer_name ?? "";
      const customerPhone = (order as { customer_phone?: string }).customer_phone ?? "";
      const pay = (order as { payment_preference?: string }).payment_preference ?? "joko";
      const merchantText = [
        `💰 Paiement reçu — ${shopName}`,
        `Client : ${customerName} (${customerPhone})`,
        `Article : ${qty}× ${prod}`,
        `Ref : #${orderRef} · ${pay}`,
        `kebu.africa/shop/${projectId}`,
      ].join("\n");
      await sendJokoPartnerMessage({
        toPhone: `+${merchantPhone}`,
        text: merchantText,
        channel: "mbolo_auto",
        metadata: { kind: "merchant_order_paid", order_id: orderId, project_id: projectId },
        idempotencyKey: `merchant-paid-${orderId}`,
      });
    }
  } catch {
    /* fire-and-forget — never blocks the webhook response */
  }
}

type JokoWebhookPayload = {
  reference?: string;
  payment_id?: string;
  status?: string;
  metadata?: Record<string, string>;
};

/** JOKO payment confirmation — activates / renews site hosting or template purchase. */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-joko-signature") || req.headers.get("x-webhook-signature");

  if (!verifyJokoWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: JokoWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as JokoWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (payload.status !== "paid" && payload.status !== "completed" && payload.status !== "success") {
    return NextResponse.json({ ok: true, ignored: true, status: payload.status ?? "unknown" });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server database not configured." }, { status: 503 });
  }

  const kind = payload.metadata?.kind;
  const reference = payload.reference;
  const paymentId = payload.payment_id;

  if (kind === "site_subscription" && reference) {
    const plan = parseHostingPlan(payload.metadata?.plan);
    const tier = parseKebuPlanId(payload.metadata?.tier ?? "shop");

    const { data: sub } = await supabase
      .from("site_subscriptions")
      .select("id, project_id, owner_id")
      .eq("joko_reference", reference)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }

    const activated = await activateSiteSubscriptionPayment(supabase, {
      subscriptionId: sub.id,
      paymentId,
      previousSubscriptionId: payload.metadata?.previous_subscription_id || null,
      planHint: plan,
      tierHint: tier,
    });

    if (!activated.ok) {
      return NextResponse.json({ error: activated.error }, { status: 404 });
    }

    console.info(
      JSON.stringify({
        event: "billing.site_subscription_activated",
        projectId: activated.projectId,
        ownerId: sub.owner_id,
        reference,
        periodEnd: activated.periodEnd,
        restoredDeployments: activated.restoredDeployments,
      }),
    );

    return NextResponse.json({
      ok: true,
      kind: "site_subscription",
      subscriptionId: sub.id,
      periodEnd: activated.periodEnd,
      restoredDeployments: activated.restoredDeployments,
    });
  }

  if (kind === "template_purchase" && reference) {
    const now = new Date().toISOString();
    const { data: purchase } = await supabase
      .from("template_purchases")
      .select("id, owner_id, template_slug")
      .eq("joko_reference", reference)
      .maybeSingle();

    if (!purchase) {
      return NextResponse.json({ error: "Template purchase not found." }, { status: 404 });
    }

    await supabase
      .from("template_purchases")
      .update({
        status: "paid",
        purchased_at: now,
        joko_payment_id: paymentId ?? purchase.id,
      })
      .eq("id", purchase.id);

    console.info(
      JSON.stringify({
        event: "billing.template_purchased",
        ownerId: purchase.owner_id,
        templateSlug: purchase.template_slug,
        reference,
      }),
    );

    return NextResponse.json({ ok: true, kind: "template_purchase", purchaseId: purchase.id });
  }

  if (kind === "aesthetic_purchase" && reference) {
    const { markAestheticPurchasePaid } = await import("@/lib/create/aesthetics-marketplace");
    const paid = await markAestheticPurchasePaid(supabase, reference, paymentId ?? null);
    if (!paid.ok) {
      return NextResponse.json({ error: paid.error }, { status: 404 });
    }
    console.info(
      JSON.stringify({
        event: "billing.aesthetic_purchased",
        libraryId: paid.libraryId,
        marketplaceId: paid.marketplaceId,
        reference,
      }),
    );
    return NextResponse.json({ ok: true, kind: "aesthetic_purchase", libraryId: paid.libraryId });
  }

  if (kind === "shop_order" && reference) {
    const { markShopOrderPaid } = await import("@/lib/shop/joko-order");
    const paid = await markShopOrderPaid(supabase, reference, paymentId ?? null);
    if (!paid.ok) {
      return NextResponse.json({ error: paid.error }, { status: 404 });
    }
    console.info(
      JSON.stringify({
        event: "shop.order_paid_joko",
        orderId: paid.orderId,
        projectId: paid.projectId,
        reference,
      }),
    );
    void sendShopOrderPaidMessages(supabase, paid.orderId, paid.projectId);
    return NextResponse.json({ ok: true, kind: "shop_order", orderId: paid.orderId });
  }

  // Metadata kind sometimes missing — fall back on reference prefix.
  if ((!kind || kind === "unknown") && reference?.startsWith("shop_order_")) {
    const { markShopOrderPaid } = await import("@/lib/shop/joko-order");
    const paid = await markShopOrderPaid(supabase, reference, paymentId ?? null);
    if (!paid.ok) {
      return NextResponse.json({ error: paid.error }, { status: 404 });
    }
    void sendShopOrderPaidMessages(supabase, paid.orderId, paid.projectId);
    return NextResponse.json({ ok: true, kind: "shop_order", orderId: paid.orderId });
  }

  return NextResponse.json({ ok: true, ignored: true, reason: "unknown_kind" });
}
