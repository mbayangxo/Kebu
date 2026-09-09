import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { activateSiteSubscriptionPayment } from "@/lib/billing/activate-site-subscription";
import { parseHostingPlan } from "@/lib/billing/subscriptions";
import { parseKebuPlanId } from "@/lib/billing/pricing";
import { verifyJokoWebhookSignature } from "@/lib/joko/payments";

export const dynamic = "force-dynamic";

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
    return NextResponse.json({ ok: true, kind: "shop_order", orderId: paid.orderId });
  }

  // Metadata kind sometimes missing — fall back on reference prefix.
  if ((!kind || kind === "unknown") && reference?.startsWith("shop_order_")) {
    const { markShopOrderPaid } = await import("@/lib/shop/joko-order");
    const paid = await markShopOrderPaid(supabase, reference, paymentId ?? null);
    if (!paid.ok) {
      return NextResponse.json({ error: paid.error }, { status: 404 });
    }
    return NextResponse.json({ ok: true, kind: "shop_order", orderId: paid.orderId });
  }

  return NextResponse.json({ ok: true, ignored: true, reason: "unknown_kind" });
}
