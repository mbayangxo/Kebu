import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { subscriptionPeriodEnd } from "@/lib/billing/subscriptions";
import { verifyJokoWebhookSignature } from "@/lib/joko/payments";

export const dynamic = "force-dynamic";

type JokoWebhookPayload = {
  reference?: string;
  payment_id?: string;
  status?: string;
  metadata?: Record<string, string>;
};

/** JOKO payment confirmation — activates site hosting or template purchase. */
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
    const now = new Date().toISOString();
    const periodEnd = subscriptionPeriodEnd(new Date());

    const { data: sub } = await supabase
      .from("site_subscriptions")
      .select("id, project_id, owner_id, status")
      .eq("joko_reference", reference)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }

    await supabase
      .from("site_subscriptions")
      .update({
        status: "active",
        period_start: now,
        period_end: periodEnd,
        joko_payment_id: paymentId ?? sub.id,
        updated_at: now,
      })
      .eq("id", sub.id);

    console.info(
      JSON.stringify({
        event: "billing.site_subscription_activated",
        projectId: sub.project_id,
        ownerId: sub.owner_id,
        reference,
      }),
    );

    return NextResponse.json({ ok: true, kind: "site_subscription", subscriptionId: sub.id });
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

  return NextResponse.json({ ok: true, ignored: true, reason: "unknown_kind" });
}
