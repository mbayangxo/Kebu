import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { markShopOrderPaidByProviderRef } from "@/lib/shop/adapter-checkout";
import { paypalCaptureOrder, paypalConfigured } from "@/lib/payments/paypal-adapter";

export const dynamic = "force-dynamic";

/**
 * After PayPal approve redirect — capture on the server using stored provider_payment_id.
 * Marks paid only if PayPal capture succeeds (browser cannot fake capture).
 */
export async function POST(req: NextRequest) {
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "PayPal not configured." }, { status: 503 });
  }

  let body: { orderId?: string; paypalOrderId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId required." }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: order } = await admin
    .from("shop_orders")
    .select(
      "id, payment_status, payment_provider, payment_preference, provider_reference, provider_payment_id, joko_reference",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.payment_status === "paid") {
    return NextResponse.json({ ok: true, alreadyPaid: true, orderId: order.id });
  }

  const looksPaypal =
    order.payment_provider === "paypal" || order.payment_preference === "paypal";

  if (!looksPaypal) {
    return NextResponse.json({ error: "Order is not a PayPal checkout." }, { status: 400 });
  }

  const paypalOrderId = (body.paypalOrderId || order.provider_payment_id || "").trim();
  if (!paypalOrderId) {
    return NextResponse.json({ error: "Missing PayPal order id." }, { status: 400 });
  }

  // Guard: token from browser must match stored provider_payment_id when we have one
  if (
    order.provider_payment_id &&
    body.paypalOrderId &&
    order.provider_payment_id !== body.paypalOrderId.trim()
  ) {
    return NextResponse.json({ error: "PayPal order mismatch." }, { status: 403 });
  }

  const captured = await paypalCaptureOrder(paypalOrderId);
  if (!captured) {
    return NextResponse.json({ error: "PayPal capture failed." }, { status: 402 });
  }

  const reference = order.provider_reference || order.joko_reference;
  if (!reference) {
    // Capture succeeded — mark by provider_payment_id lookup
    const paid = await markShopOrderPaidByProviderRef(admin, {
      reference: paypalOrderId,
      paymentId: paypalOrderId,
      provider: "paypal",
    });
    if (!paid.ok) {
      // Last resort: update by id after verified capture
      const { error } = await admin
        .from("shop_orders")
        .update({
          payment_status: "paid",
          payment_provider: "paypal",
          provider_payment_id: paypalOrderId,
          status: "contacted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, orderId: order.id, paid: true });
    }
    return NextResponse.json({ ok: true, orderId: paid.orderId, paid: true });
  }

  const paid = await markShopOrderPaidByProviderRef(admin, {
    reference,
    paymentId: paypalOrderId,
    provider: order.payment_provider === "paypal" ? "paypal" : undefined,
  });
  if (!paid.ok) {
    return NextResponse.json({ error: paid.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orderId: paid.orderId, paid: true });
}
