import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";
import { generateShopPoNumber } from "@/lib/shop/codes";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const PO_COLUMNS =
  "id, po_number, supplier_name, supplier_phone, supplier_email, status, currency, subtotal_xof, shipping_xof, total_xof, note, expected_at, received_at, created_at";
const ITEM_COLUMNS = "id, purchase_order_id, product_name, sku, qty_ordered, qty_received, unit_cost_xof, line_total_xof";

/** Merchant: list purchase orders to suppliers, with their line items. */
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

  const { data: orders, error } = await access.db
    .from("shop_purchase_orders")
    .select(PO_COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (/relation.*does not exist/i.test(error.message) || error.code === "42P01") {
      return NextResponse.json({ purchaseOrders: [], tableReady: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const poIds = (orders ?? []).map((po) => po.id);
  let itemsByPo = new Map<string, unknown[]>();
  if (poIds.length > 0) {
    const { data: items, error: itemsError } = await access.db
      .from("shop_purchase_order_items")
      .select(ITEM_COLUMNS)
      .in("purchase_order_id", poIds);
    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
    itemsByPo = new Map();
    for (const item of items ?? []) {
      const list = itemsByPo.get(item.purchase_order_id) ?? [];
      list.push(item);
      itemsByPo.set(item.purchase_order_id, list);
    }
  }

  const purchaseOrders = (orders ?? []).map((po) => ({
    ...po,
    items: itemsByPo.get(po.id) ?? [],
  }));

  return NextResponse.json({ purchaseOrders, tableReady: true });
}

const itemSchema = z.object({
  product_name: z.string().trim().min(1).max(200),
  sku: z.string().trim().max(80).optional().default(""),
  quantity: z.number().int().min(1),
  unit_cost_xof: z.number().min(0).optional().default(0),
});

const createSchema = z.object({
  supplier_name: z.string().trim().min(1).max(150),
  supplier_phone: z.string().trim().max(60).optional().default(""),
  supplier_email: z.string().trim().max(200).optional().default(""),
  items: z.array(itemSchema).min(1).max(50),
  shipping_xof: z.number().min(0).optional().default(0),
  expected_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().trim().max(500).optional().default(""),
});

/** Create a purchase order with its line items. */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data.", issues: parsed.error.issues }, { status: 400 });
  }

  const d = parsed.data;
  const subtotalXof = d.items.reduce((s, i) => s + i.unit_cost_xof * i.quantity, 0);

  const { data: row, error } = await access.db
    .from("shop_purchase_orders")
    .insert({
      project_id: projectId,
      po_number: generateShopPoNumber(projectId),
      supplier_name: d.supplier_name,
      supplier_phone: d.supplier_phone || null,
      supplier_email: d.supplier_email || null,
      status: "ordered",
      subtotal_xof: subtotalXof,
      shipping_xof: d.shipping_xof,
      expected_at: d.expected_at ?? null,
      note: d.note || null,
      created_by: user.id,
    })
    .select(PO_COLUMNS)
    .single();

  if (error) {
    if (/relation.*does not exist/i.test(error.message) || error.code === "42P01") {
      return NextResponse.json(
        { error: "Purchase orders table not ready. Ask Kebu support to run migration 088_shop_purchase_orders." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: items, error: itemsError } = await access.db
    .from("shop_purchase_order_items")
    .insert(
      d.items.map((i) => ({
        purchase_order_id: row.id,
        product_name: i.product_name,
        sku: i.sku || null,
        qty_ordered: i.quantity,
        unit_cost_xof: i.unit_cost_xof,
      })),
    )
    .select(ITEM_COLUMNS);

  if (itemsError) {
    // The parent PO was already created; delete it rather than leave an
    // orphaned purchase order with no line items the merchant never saw.
    await access.db.from("shop_purchase_orders").delete().eq("id", row.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, purchaseOrder: { ...row, items: items ?? [] } });
}

const patchSchema = z.object({
  poId: z.string().uuid(),
  action: z.enum(["receive", "cancel"]),
  received_at: z.string().optional(),
});

/** Mark a purchase order as received or cancelled. */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { poId, action } = parsed.data;
  const updates: Record<string, unknown> =
    action === "receive"
      ? { status: "received", received_at: parsed.data.received_at ?? new Date().toISOString() }
      : { status: "cancelled" };

  const { error } = await access.db
    .from("shop_purchase_orders")
    .update(updates)
    .eq("id", poId)
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
