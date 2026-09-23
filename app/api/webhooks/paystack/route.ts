import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { markShopOrderPaidByProviderRef } from "@/lib/shop/adapter-checkout";
import { verifyPaystackSignature, paystackAmountToXof } from "@/lib/payments/paystack-adapter";
import { fulfillPaidDigitalOrder } from "@/lib/shop/digital-downloads";

export const dynamic = "force-dynamic";

/** Paystack charge.success → shop order Money: paid. Browser cannot set paid. */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid Paystack signature." }, { status: 401 });
  }

  let payload: {
    event?: string;
    data?: {
      reference?: string;
      id?: number;
      amount?: number;
      status?: string;
      metadata?: { kebu_reference?: string; amount_xof?: string };
    };
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (payload.event !== "charge.success" || payload.data?.status !== "success") {
    return NextResponse.json({ ok: true, ignored: true, event: payload.event ?? "unknown" });
  }

  const reference =
    payload.data?.metadata?.kebu_reference?.trim() || payload.data?.reference?.trim() || "";
  if (!reference) {
    return NextResponse.json({ error: "Missing reference." }, { status: 400 });
  }

  // Always validate metadata.amount_xof format when present (reject malformed input early).
  const rawAmountXof = payload.data?.metadata?.amount_xof;
  if (rawAmountXof !== undefined) {
    const metaParsed = Number(rawAmountXof);
    if (!Number.isFinite(metaParsed) || metaParsed <= 0) {
      return NextResponse.json({ error: "Invalid amount_xof metadata." }, { status: 400 });
    }
  }

  // Use Paystack's own data.amount as the authoritative charge figure.
  // Falls back to metadata when data.amount is absent (older webhook formats or non-XOF
  // currencies where conversion requires a rate env var that may not be set).
  let expectedAmountXof: number | null = null;
  const paystackChargeAmount = payload.data?.amount;
  if (paystackChargeAmount != null && Number.isFinite(paystackChargeAmount) && paystackChargeAmount > 0) {
    const converted = paystackAmountToXof(paystackChargeAmount);
    expectedAmountXof = converted !== null
      ? converted
      : rawAmountXof !== undefined ? Number(rawAmountXof) : null;
  } else {
    expectedAmountXof = rawAmountXof !== undefined ? Number(rawAmountXof) : null;
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const paid = await markShopOrderPaidByProviderRef(admin, {
    reference,
    paymentId: payload.data?.id != null ? String(payload.data.id) : payload.data?.reference,
    provider: "paystack",
    expectedAmountXof,
  });

  if (!paid.ok) {
    // Try without provider filter (legacy / race)
    const retry = await markShopOrderPaidByProviderRef(admin, {
      reference,
      paymentId: payload.data?.reference,
    });
    if (!retry.ok) {
      return NextResponse.json({ error: retry.error }, { status: 404 });
    }
    console.info(
      JSON.stringify({
        event: "shop.order_paid_paystack",
        orderId: retry.orderId,
        projectId: retry.projectId,
        reference,
      }),
    );
    return NextResponse.json({ ok: true, kind: "shop_order", orderId: retry.orderId });
  }

  console.info(
    JSON.stringify({
      event: "shop.order_paid_paystack",
      orderId: paid.orderId,
      projectId: paid.projectId,
      reference,
      alreadyPaid: paid.alreadyPaid,
    }),
  );
  if (!paid.alreadyPaid) {
    try {
      await fulfillPaidDigitalOrder(admin, paid.orderId);
    } catch {
      /* digital fulfillment is best-effort — payment is already recorded */
    }
  }
  return NextResponse.json({ ok: true, kind: "shop_order", orderId: paid.orderId, alreadyPaid: paid.alreadyPaid });
}
