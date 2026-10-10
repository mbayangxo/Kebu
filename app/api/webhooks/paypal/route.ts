import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { markShopOrderPaidByProviderRef } from "@/lib/shop/adapter-checkout";
import { paypalCaptureOrder, paypalVerifyCapturedOrder, paypalConfigured } from "@/lib/payments/paypal-adapter";

export const dynamic = "force-dynamic";

type PayPalEvent = {
  event_type?: string;
  resource?: {
    id?: string;
    custom_id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
    purchase_units?: { custom_id?: string; reference_id?: string; payments?: { captures?: { id?: string }[] } }[];
  };
};

/**
 * PayPal webhooks — PAYMENT.CAPTURE.COMPLETED / CHECKOUT.ORDER.APPROVED.
 * Signature: when PAYPAL_WEBHOOK_ID is set we verify via PayPal API.
 * Sandbox-only bypass: PAYPAL_WEBHOOK_SKIP_VERIFY=true (never use in production).
 */
async function verifyPayPalWebhook(req: NextRequest, rawBody: string): Promise<boolean> {
  if (process.env.PAYPAL_WEBHOOK_SKIP_VERIFY === "true") {
    const mode = (process.env.PAYPAL_MODE ?? "sandbox").toLowerCase();
    if (mode === "live" || process.env.NODE_ENV === "production") {
      console.error("PAYPAL_WEBHOOK_SKIP_VERIFY blocked in live/production");
      return false;
    }
    return true;
  }

  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (!webhookId || !paypalConfigured()) return false;

  const transmissionId = req.headers.get("paypal-transmission-id");
  const transmissionTime = req.headers.get("paypal-transmission-time");
  const certUrl = req.headers.get("paypal-cert-url");
  const authAlgo = req.headers.get("paypal-auth-algo");
  const transmissionSig = req.headers.get("paypal-transmission-sig");
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }

  const id = process.env.PAYPAL_CLIENT_ID!.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET!.trim();
  const mode = (process.env.PAYPAL_MODE ?? "sandbox").toLowerCase();
  const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) return false;
  const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string };
  if (!accessToken) return false;

  const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  if (!verifyRes.ok) return false;
  const result = (await verifyRes.json()) as { verification_status?: string };
  return result.verification_status === "SUCCESS";
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const ok = await verifyPayPalWebhook(req, rawBody);
  if (!ok) {
    return NextResponse.json({ error: "Invalid PayPal webhook." }, { status: 401 });
  }

  let event: PayPalEvent;
  try {
    event = JSON.parse(rawBody) as PayPalEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const type = event.event_type || "";
  const resource = event.resource;
  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  if (!["PAYMENT.CAPTURE.COMPLETED", "CHECKOUT.ORDER.COMPLETED", "CHECKOUT.ORDER.APPROVED"].includes(type)) {
    return NextResponse.json({ ok: true, ignored: true, event: type });
  }
  const paypalOrderId = type === "PAYMENT.CAPTURE.COMPLETED"
    ? resource?.supplementary_data?.related_ids?.order_id : resource?.id;
  if (!paypalOrderId) return NextResponse.json({ error: "Missing PayPal checkout binding." }, { status: 400 });
  const { data: order, error } = await admin.from("shop_orders")
    .select("id, status, payment_status, provider_reference, provider_payment_id, provider_amount_value, provider_amount_currency")
    .eq("payment_provider", "paypal").eq("provider_payment_id", paypalOrderId).maybeSingle();
  if (error || !order) return NextResponse.json({ error: "PayPal checkout needs reconciliation." }, { status: 409 });
  if (order.status === "cancelled" || order.payment_status === "refunded") {
    return NextResponse.json({ error: "Order cannot accept payment." }, { status: 409 });
  }
  const expected = { reference: order.provider_reference || "", value: order.provider_amount_value || "", currency: order.provider_amount_currency || "" };
  const verified = type === "CHECKOUT.ORDER.APPROVED"
    ? await paypalCaptureOrder(paypalOrderId, expected)
    : await paypalVerifyCapturedOrder(paypalOrderId, expected);
  if (!verified) return NextResponse.json({ error: "PayPal capture amount or status is not verified." }, { status: 409 });
  const paid = await markShopOrderPaidByProviderRef(admin, {
    reference: expected.reference, paymentId: paypalOrderId, provider: "paypal",
  });
  if (!paid.ok) return NextResponse.json({ error: paid.error }, { status: 409 });
  return NextResponse.json({ ok: true, kind: "shop_order", orderId: paid.orderId });
}
