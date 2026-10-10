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
    data?: { reference?: string; id?: number; status?: string; amount?:number; currency?:string; metadata?: { kebu_reference?: string } };
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
  const { data: order, error } = await admin.from("shop_orders")
    .select("provider_reference,provider_amount_value,provider_amount_currency")
    .eq("payment_provider","paystack").eq("provider_reference",reference).maybeSingle();
  if (error || !order || payload.data?.reference !== reference
    || !Number.isSafeInteger(payload.data?.amount) || !/^\d+$/.test(order.provider_amount_value ?? "")
    || Number(order.provider_amount_value) !== payload.data?.amount
    || order.provider_amount_currency !== payload.data?.currency) {
    return NextResponse.json({error:"Paystack amount, currency or reference needs reconciliation."},{status:409});
  }

  const paid = await markShopOrderPaidByProviderRef(admin, {
    reference,
    paymentId: payload.data?.id != null ? String(payload.data.id) : payload.data?.reference,
    provider: "paystack",
  });

  if (!paid.ok) {
    return NextResponse.json({error:paid.error},{status:409});
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
