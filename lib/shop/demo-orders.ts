import type { SupabaseClient } from "@supabase/supabase-js";
import { allocateShopOrderNumber } from "@/lib/shop/codes";
import { upsertShopCustomerAfterOrder } from "@/lib/shop/customer-profiles";

export type DemoOrderWhich = 1 | 2;

export const DEMOS_WHICH: DemoOrderWhich[] = [1, 2];

const DEMOS: Record<
  DemoOrderWhich,
  {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    note: string;
    quantity: number;
  }
> = {
  1: {
    customerName: "Demo Buyer One",
    customerPhone: "+221770000001",
    customerEmail: "demo1@kebu.local",
    note: "[DEMO 1] Practice order — safe to fulfill / archive. Not a real customer.",
    quantity: 1,
  },
  2: {
    customerName: "Demo Buyer Two",
    customerPhone: "+221770000002",
    customerEmail: "demo2@kebu.local",
    note: "[DEMO 2] Second practice order — try tracking + notify. Not a real customer.",
    quantity: 2,
  },
};

/**
 * Create merchant practice order 1 or 2 so owners can see the Orders UI end-to-end.
 * Never decrements stock. Never marks paid. Tagged is_demo + channel demo.
 */
export async function createDemoShopOrder(
  supabase: SupabaseClient,
  opts: { projectId: string; which: DemoOrderWhich },
): Promise<
  | { ok: true; orderId: string; orderNumber: string; alreadyExists?: boolean }
  | { ok: false; error: string }
> {
  const demo = DEMOS[opts.which];
  const marker = `[DEMO ${opts.which}]`;

  const { data: existing } = await supabase
    .from("shop_orders")
    .select("id, order_number")
    .eq("project_id", opts.projectId)
    .eq("is_demo", true)
    .ilike("customer_note", `${marker}%`)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return {
      ok: true,
      orderId: existing.id,
      orderNumber: existing.order_number ?? `DEMO-${opts.which}`,
      alreadyExists: true,
    };
  }

  const { data: product } = await supabase
    .from("project_products")
    .select("id, name, price_label, upc, sku")
    .eq("project_id", opts.projectId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const productName = product?.name?.trim() || "Demo product";
  const priceLabel = product?.price_label?.trim() || "5 000 XOF";
  const amountXof = 5000 * demo.quantity;

  let orderNumber: string;
  try {
    orderNumber = await allocateShopOrderNumber(supabase, opts.projectId);
  } catch {
    orderNumber = `DEMO-${opts.which}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  const insert: Record<string, unknown> = {
    project_id: opts.projectId,
    product_id: product?.id ?? null,
    product_name: productName,
    price_label: priceLabel,
    quantity: demo.quantity,
    customer_name: demo.customerName,
    customer_phone: demo.customerPhone,
    customer_email: demo.customerEmail,
    customer_note: demo.note,
    payment_preference: "joko",
    payment_status: "unpaid",
    amount_xof: amountXof,
    status: "pending",
    channel: "demo",
    is_demo: true,
    order_number: orderNumber,
  };
  if (product?.upc) insert.product_upc = product.upc;
  if (product?.sku) insert.product_sku = product.sku;

  const { data: order, error } = await supabase
    .from("shop_orders")
    .insert(insert)
    .select("id, order_number")
    .single();

  if (error || !order) {
    // Fallback when is_demo / channel demo not migrated yet
    if (error?.message && /is_demo|channel/i.test(error.message)) {
      delete insert.is_demo;
      insert.channel = "whatsapp";
      insert.customer_note = `${demo.note} (apply 055 for demo channel)`;
      const retry = await supabase.from("shop_orders").insert(insert).select("id, order_number").single();
      if (retry.error || !retry.data) {
        return {
          ok: false,
          error: retry.error?.message?.includes("does not exist")
            ? "Orders table missing. Apply APPLY_SHOP_ORDERS.sql."
            : retry.error?.message || "Could not create demo order. Apply 055_team_invites_demo_orders.sql.",
        };
      }
      await afterDemo(supabase, opts.projectId, retry.data.id, productName, priceLabel, demo);
      return {
        ok: true,
        orderId: retry.data.id,
        orderNumber: retry.data.order_number ?? orderNumber,
      };
    }
    return {
      ok: false,
      error: error?.message?.includes("does not exist")
        ? "Orders table missing. Apply APPLY_SHOP_ORDERS.sql."
        : error?.message || "Could not create demo order.",
    };
  }

  await afterDemo(supabase, opts.projectId, order.id, productName, priceLabel, demo);
  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.order_number ?? orderNumber,
  };
}

async function afterDemo(
  supabase: SupabaseClient,
  projectId: string,
  orderId: string,
  productName: string,
  priceLabel: string,
  demo: (typeof DEMOS)[DemoOrderWhich],
) {
  await supabase.from("shop_order_items").insert({
    order_id: orderId,
    project_id: projectId,
    product_name: productName,
    price_label: priceLabel,
    quantity: demo.quantity,
    line_amount_xof: 5000 * demo.quantity,
    sort_order: 0,
  });
  try {
    await upsertShopCustomerAfterOrder(supabase, {
      projectId,
      phone: demo.customerPhone,
      email: demo.customerEmail,
    });
  } catch {
    /* profile best-effort */
  }
}
