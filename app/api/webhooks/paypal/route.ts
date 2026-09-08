import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { markShopOrderPaidByProviderRef } from "@/lib/shop/adapter-checkout";
import { paypalCaptureOrder, paypalConfigured } from "@/lib/payments/paypal-adapter";

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
  const reference =
    resource?.custom_id?.trim() ||
    resource?.purchase_units?.[0]?.custom_id?.trim() ||
    resource?.purchase_units?.[0]?.reference_id?.trim() ||
    "";

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  if (type === "CHECKOUT.ORDER.APPROVED" && resource?.id) {
    const captured = await paypalCaptureOrder(resource.id);
    if (!captured) {
      return NextResponse.json({ ok: true, capture: "failed" });
    }
  }

  if (
    type !== "PAYMENT.CAPTURE.COMPLETED" &&
    type !== "CHECKOUT.ORDER.COMPLETED" &&
    type !== "CHECKOUT.ORDER.APPROVED"
  ) {
    return NextResponse.json({ ok: true, ignored: true, event: type });
  }

  if (!reference) {
    // Fall back: look up by PayPal order id stored as provider_payment_id
    const paypalOrderId =
      resource?.supplementary_data?.related_ids?.order_id || resource?.id || null;
    if (paypalOrderId) {
      const { data: order } = await admin
        .from("shop_orders")
        .select("id, provider_reference, payment_status")
        .eq("provider_payment_id", paypalOrderId)
        .maybeSingle();
      if (order?.provider_reference) {
        const paid = await markShopOrderPaidByProviderRef(admin, {
          reference: order.provider_reference,
          paymentId: resource?.id ?? paypalOrderId,
          provider: "paypal",
        });
        if (paid.ok) {
          return NextResponse.json({ ok: true, kind: "shop_order", orderId: paid.orderId });
        }
      }
    }
    return NextResponse.json({ error: "Missing custom_id / reference." }, { status: 400 });
  }

  const paid = await markShopOrderPaidByProviderRef(admin, {
    reference,
    paymentId: resource?.id ?? null,
    provider: "paypal",
  });
  if (!paid.ok) {
    const retry = await markShopOrderPaidByProviderRef(admin, {
      reference,
      paymentId: resource?.id ?? null,
    });
    if (!retry.ok) return NextResponse.json({ error: retry.error }, { status: 404 });
    console.info(
      JSON.stringify({
        event: "shop.order_paid_paypal",
        orderId: retry.orderId,
        projectId: retry.projectId,
        reference,
      }),
    );
    return NextResponse.json({ ok: true, kind: "shop_order", orderId: retry.orderId });
  }

  console.info(
    JSON.stringify({
      event: "shop.order_paid_paypal",
      orderId: paid.orderId,
      projectId: paid.projectId,
      reference,
    }),
  );
  return NextResponse.json({ ok: true, kind: "shop_order", orderId: paid.orderId });
}
