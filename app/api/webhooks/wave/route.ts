import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { markKebuPurchasePaid } from "@/lib/payments/mark-purchase-paid";
import { fulfillPaidDigitalOrderDurable } from "@/lib/shop/digital-downloads";
import { waveConfigured } from "@/lib/payments/wave-adapter";

export const dynamic = "force-dynamic";

function verifyWaveWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.WAVE_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Wave checkout.session.completed (or equivalent) → shop order paid.
 * Requires WAVE_WEBHOOK_SECRET. Never trusts the browser.
 */
export async function POST(req: NextRequest) {
  if (!waveConfigured() && !process.env.WAVE_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json({ error: "Wave webhooks not configured." }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature =
    req.headers.get("x-wave-signature") ||
    req.headers.get("wave-signature") ||
    req.headers.get("x-webhook-signature");

  if (!verifyWaveWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid Wave signature." }, { status: 401 });
  }

  let payload: {
    type?: string;
    id?: string;
    data?: {
      id?: string;
      client_reference?: string;
      payment_status?: string;
      status?: string;
    };
    client_reference?: string;
    payment_status?: string;
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const status =
    payload.data?.payment_status ||
    payload.data?.status ||
    payload.payment_status ||
    "";
  const type = (payload.type || "").toLowerCase();
  const success =
    status === "succeeded" ||
    status === "successful" ||
    status === "completed" ||
    type.includes("completed") ||
    type.includes("success");

  if (!success) {
    return NextResponse.json({ ok: true, ignored: true, status: status || type || "unknown" });
  }

  const reference =
    payload.data?.client_reference?.trim() || payload.client_reference?.trim() || "";
  if (!reference) {
    return NextResponse.json({ error: "Missing client_reference." }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const paymentId = payload.data?.id || payload.id || null;
  let result = await markKebuPurchasePaid(admin, { reference, paymentId, provider: "wave" });
  if (!result.ok) {
    result = await markKebuPurchasePaid(admin, { reference, paymentId });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  }

  console.info(JSON.stringify({ event: "kebu.purchase_paid_wave", kind: result.kind, reference, result }));

  if (result.kind === "shop_order") {
    await fulfillPaidDigitalOrderDurable(admin, result.orderId);
    return NextResponse.json({ ok: true, kind: "shop_order", orderId: result.orderId });
  }
  return NextResponse.json({ ok: true, kind: result.kind });
}
