import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { markShopOrderPaidByProviderRef } from "@/lib/shop/adapter-checkout";
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
    data?: { reference?: string; id?: number; status?: string; metadata?: { kebu_reference?: string } };
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

  const paid = await markShopOrderPaidByProviderRef(admin, {
    reference,
    paymentId: payload.data?.id != null ? String(payload.data.id) : payload.data?.reference,
    provider: "paystack",
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
    }),
  );
  return NextResponse.json({ ok: true, kind: "shop_order", orderId: paid.orderId });
}
