import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { restoreProductStock } from "@/lib/shop/stock";
import { createServiceClient } from "@/lib/opportunity/admin";
import {
  fulfillShopOrder,
  SHOP_ORDER_FULFILL_STATUSES,
  type FulfillNotifyVia,
  type ShopFulfillStatus,
} from "@/lib/shop/fulfillment";
import { SHOP_CARRIERS } from "@/lib/shop/carriers";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Merchant order list for an owned or team shop. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const access = await assertShopProjectAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "shop-orders",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const db = access.db;

  const withFulfill = await db
    .from("shop_orders")
    .select(
      "id, order_number, product_id, product_name, product_upc, product_sku, price_label, quantity, customer_name, customer_phone, customer_email, customer_note, payment_preference, payment_status, amount_xof, status, channel, tracking_number, carrier, tracking_url, fulfilled_at, archived_at, customer_notified_at, customer_notify_via, is_gift, recipient_name, recipient_phone, recipient_email, gift_message, gift_public_id, created_at, updated_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(150);

  let rows: Record<string, unknown>[] | null = withFulfill.data as Record<string, unknown>[] | null;
  let loadError = withFulfill.error;

  if (loadError && /tracking_number|carrier|archived_at|customer_email/i.test(loadError.message)) {
    const mid = await db
      .from("shop_orders")
      .select(
        "id, order_number, product_id, product_name, product_upc, product_sku, price_label, quantity, customer_name, customer_phone, customer_note, payment_preference, payment_status, amount_xof, status, channel, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(150);
    rows = (mid.data ?? []).map((row) => ({
      ...row,
      customer_email: null,
      tracking_number: null,
      carrier: null,
      tracking_url: null,
      fulfilled_at: null,
      archived_at: null,
      customer_notified_at: null,
      customer_notify_via: null,
    }));
    loadError = mid.error;
  }

  if (loadError && /order_number|product_upc|product_sku/i.test(loadError.message)) {
    const midCodes = await db
      .from("shop_orders")
      .select(
        "id, product_id, product_name, price_label, quantity, customer_name, customer_phone, customer_note, payment_preference, payment_status, amount_xof, status, channel, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(150);
    if (!midCodes.error) {
      rows = (midCodes.data ?? []).map((row) => ({
        ...row,
        order_number: null,
        product_upc: null,
        product_sku: null,
        customer_email: null,
        tracking_number: null,
        carrier: null,
        tracking_url: null,
        fulfilled_at: null,
        archived_at: null,
        customer_notified_at: null,
        customer_notify_via: null,
      }));
      loadError = null;
    } else {
      loadError = midCodes.error;
    }
  }

  if (loadError && /payment_status|amount_xof/i.test(loadError.message)) {
    const mid = await db
      .from("shop_orders")
      .select(
        "id, product_id, product_name, price_label, quantity, customer_name, customer_phone, customer_note, payment_preference, status, channel, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(150);
    if (!mid.error) {
      rows = (mid.data ?? []).map((row) => ({
        ...row,
        payment_status: "unpaid",
        amount_xof: null,
        order_number: null,
        product_upc: null,
        product_sku: null,
        customer_email: null,
        tracking_number: null,
        carrier: null,
        tracking_url: null,
        fulfilled_at: null,
        archived_at: null,
        customer_notified_at: null,
        customer_notify_via: null,
      }));
      loadError = null;
    } else {
      loadError = mid.error;
    }
  }

  if (loadError && /payment_preference/i.test(loadError.message)) {
    const fallback = await db
      .from("shop_orders")
      .select(
        "id, product_id, product_name, price_label, quantity, customer_name, customer_phone, customer_note, status, channel, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(150);
    if (fallback.error) {
      return NextResponse.json(
        {
          error: fallback.error.message?.includes("does not exist")
            ? "Orders table missing. Apply APPLY_SHOP_ORDERS.sql in Supabase."
            : "Could not load orders.",
          detail: fallback.error.message,
        },
        { status: 500 },
      );
    }
    return NextResponse.json({
      orders: fallback.data ?? [],
      carriers: SHOP_CARRIERS,
    });
  }

  if (loadError) {
    return NextResponse.json(
      {
        error: loadError.message?.includes("does not exist")
          ? "Orders table missing. Apply APPLY_SHOP_ORDERS.sql in Supabase."
          : "Could not load orders.",
        detail: loadError.message,
      },
      { status: 500 },
    );
  }

  const orders = rows ?? [];
  const orderIds = orders.map((o) => o.id as string);
  let itemsByOrder: Record<
    string,
    {
      product_name: string;
      product_upc: string | null;
      product_sku: string | null;
      price_label: string;
      quantity: number;
      sort_order: number;
    }[]
  > = {};

  if (orderIds.length) {
    const itemsRes = await db
      .from("shop_order_items")
      .select(
        "order_id, product_name, product_upc, product_sku, price_label, quantity, sort_order",
      )
      .in("order_id", orderIds)
      .order("sort_order", { ascending: true });
    if (!itemsRes.error && itemsRes.data) {
      for (const row of itemsRes.data) {
        const oid = row.order_id as string;
        if (!itemsByOrder[oid]) itemsByOrder[oid] = [];
        itemsByOrder[oid]!.push({
          product_name: row.product_name,
          product_upc: row.product_upc ?? null,
          product_sku: row.product_sku ?? null,
          price_label: row.price_label ?? "",
          quantity: row.quantity,
          sort_order: row.sort_order ?? 0,
        });
      }
    }
  }

  return NextResponse.json({
    orders: orders.map((o) => ({
      ...o,
      items: itemsByOrder[o.id as string] ?? [],
    })),
    carriers: SHOP_CARRIERS,
  });
}

/**
 * Update order: status · fulfill (tracking + carrier + notify) · archive · email customer.
 */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const orderId = typeof rec.orderId === "string" ? rec.orderId : "";
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  }

  const access = await assertShopProjectAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    select: "id, owner_id, title, subdomain, business_id",
    action: "shop-orders-patch",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const db = access.db;
  const project = access.project;

  const actionRaw = typeof rec.action === "string" ? rec.action : "status";
  const status = typeof rec.status === "string" ? rec.status : "";
  const trackingNumber =
    typeof rec.trackingNumber === "string" ? rec.trackingNumber : null;
  const carrier = typeof rec.carrier === "string" ? rec.carrier : null;
  const notifyVia = (
    typeof rec.notifyVia === "string" ? rec.notifyVia : "both"
  ) as FulfillNotifyVia;
  const emailCustomer = rec.emailCustomer === true;

  const action =
    actionRaw === "refund"
      ? "refund"
      : actionRaw === "fulfill" || actionRaw === "archive" || actionRaw === "status"
        ? actionRaw
        : status === "archived"
          ? "archive"
          : status === "fulfilled" && (trackingNumber || carrier || emailCustomer)
            ? "fulfill"
            : "status";

  if (action === "refund") {
    const refundNote = typeof rec.refundNote === "string" ? rec.refundNote.slice(0, 500) : null;
    const { data: refunded, error: refundErr } = await db
      .from("shop_orders")
      .update({
        payment_status: "refunded",
        refunded_at: new Date().toISOString(),
        refund_note: refundNote,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("project_id", projectId)
      .select("*")
      .single();

    if (refundErr || !refunded) {
      return NextResponse.json(
        {
          error: refundErr?.message?.includes("refunded")
            ? "Apply migration 066_remaining_slices.sql."
            : "Could not refund order.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ order: refunded, carriers: SHOP_CARRIERS });
  }

  if (action === "status" && !SHOP_ORDER_FULFILL_STATUSES.includes(status as ShopFulfillStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { data: existing } = await db
    .from("shop_orders")
    .select("id, status, product_id, quantity")
    .eq("id", orderId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const admin = createServiceClient();
  const result = await fulfillShopOrder(db, admin, {
    orderId,
    projectId,
    action,
    status: status as ShopFulfillStatus,
    trackingNumber,
    carrier,
    notifyVia: emailCustomer && notifyVia === "none" ? "email" : notifyVia,
    emailCustomer,
    shopName: typeof project.title === "string" ? project.title : "Shop",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 500 },
    );
  }

  if (
    (action === "status" && status === "cancelled") ||
    (result.order.status === "cancelled" && existing.status !== "cancelled")
  ) {
    if (existing.product_id && existing.quantity > 0 && admin) {
      const { data: items } = await db
        .from("shop_order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);
      if (items?.length) {
        for (const it of items) {
          if (it.product_id) {
            await restoreProductStock(admin, it.product_id, it.quantity);
          }
        }
      } else {
        await restoreProductStock(admin, existing.product_id, existing.quantity);
      }
    }
  }

  logCreate("shop.order_fulfill", {
    userId: user.id,
    projectId,
    orderId,
    action,
    status: result.order.status,
    emailed: result.emailed,
  });

  return NextResponse.json({
    order: result.order,
    whatsappHref: result.whatsappHref,
    emailed: result.emailed,
    carriers: SHOP_CARRIERS,
  });
}
