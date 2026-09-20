import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { fulfillPaidDigitalOrder } from "@/lib/shop/digital-downloads";
import { verifyPaystackSignature } from "@/lib/payments/paystack-adapter";

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
      status?: string;
      metadata?: {
        kebu_reference?: string;
        order_id?: string;
        project_id?: string;
        amount_xof?: string;
      };
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

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const metadata = payload.data?.metadata;
  const expectedAmount = metadata?.amount_xof ? Number(metadata.amount_xof) : null;
  if (expectedAmount != null && (!Number.isInteger(expectedAmount) || expectedAmount <= 0)) {
    return NextResponse.json({ error: "Invalid payment metadata." }, { status: 400 });
  }
  const { data: completed, error } = await admin.rpc("complete_shop_payment", {
    p_reference: reference,
    p_provider: "paystack",
    p_payment_id: payload.data?.id != null ? String(payload.data.id) : payload.data?.reference ?? null,
    p_expected_order_id: metadata?.order_id ?? null,
    p_expected_project_id: metadata?.project_id ?? null,
    p_expected_amount_xof: expectedAmount,
  });
  const paid = Array.isArray(completed) ? completed[0] : completed;
  if (error || !paid?.order_id || !paid?.project_id) {
    console.warn(JSON.stringify({ event: "shop.payment_completion_failed", reference, error: error?.message ?? "not_found" }));
    return NextResponse.json({ error: "Payment could not be matched to an active checkout." }, { status: 404 });
  }

  console.info(
    JSON.stringify({
      event: "shop.order_paid_paystack",
      orderId: paid.order_id,
      projectId: paid.project_id,
      reference,
      alreadyPaid: Boolean(paid.already_paid),
    }),
  );
  await fulfillPaidDigitalOrder(admin, paid.order_id);
  return NextResponse.json({ ok: true, kind: "shop_order", orderId: paid.order_id });
}
