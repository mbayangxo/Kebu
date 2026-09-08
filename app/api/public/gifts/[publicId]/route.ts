import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { giftPublicPath } from "@/lib/shop/gift-order";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ publicId: string }> };

/** Public gift link — recipient-facing summary only (no buyer payment secrets). */
export async function GET(_req: Request, { params }: Params) {
  const { publicId: raw } = await params;
  const publicId = (raw || "").trim().toLowerCase();
  if (!publicId.startsWith("gift_")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: order, error } = await admin
    .from("shop_orders")
    .select(
      "id, order_number, product_name, quantity, price_label, status, is_gift, recipient_name, gift_message, gift_public_id, project_id, created_at",
    )
    .eq("gift_public_id", publicId)
    .maybeSingle();

  if (error || !order || !order.is_gift) {
    return NextResponse.json({ error: "Gift not found." }, { status: 404 });
  }

  const { data: project } = await admin
    .from("projects")
    .select("title")
    .eq("id", order.project_id)
    .maybeSingle();

  const { data: items } = await admin
    .from("shop_order_items")
    .select("product_name, quantity, price_label")
    .eq("order_id", order.id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    gift: {
      publicId: order.gift_public_id,
      path: giftPublicPath(order.gift_public_id),
      orderNumber: order.order_number,
      status: order.status,
      recipientName: order.recipient_name,
      giftMessage: order.gift_message || "",
      productName: order.product_name,
      quantity: order.quantity,
      priceLabel: order.price_label,
      storeName: project?.title || "Shop",
      createdAt: order.created_at,
      items: items ?? [],
    },
  });
}
