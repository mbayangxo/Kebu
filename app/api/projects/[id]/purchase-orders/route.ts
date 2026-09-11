import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Merchant: list purchase orders to suppliers. */
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

  const { data: rows, error } = await access.db
    .from("shop_purchase_orders")
    .select("id, po_number, supplier_name, supplier_contact, items, total_amount_xof, status, expected_at, received_at, note, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (/relation.*does not exist/i.test(error.message) || error.code === "42P01") {
      return NextResponse.json({ purchaseOrders: [], tableReady: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ purchaseOrders: rows ?? [], tableReady: true });
}

const itemSchema = z.object({
  product_name: z.string().trim().min(1).max(200),
  sku: z.string().trim().max(80).optional().default(""),
  quantity: z.number().int().min(1),
  unit_cost_xof: z.number().min(0).optional(),
});

const createSchema = z.object({
  supplier_name: z.string().trim().min(1).max(150),
  supplier_contact: z.string().trim().max(150).optional().default(""),
  items: z.array(itemSchema).min(1).max(50),
  total_amount_xof: z.number().min(0).optional(),
  expected_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().trim().max(500).optional().default(""),
});

/** Create a purchase order. */
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
  const totalXof =
    d.total_amount_xof ??
    d.items.reduce(
      (s: number, i: { unit_cost_xof?: number; quantity: number }) =>
        s + (i.unit_cost_xof ?? 0) * i.quantity,
      0,
    );

  const { data: row, error } = await access.db
    .from("shop_purchase_orders")
    .insert({
      project_id: projectId,
      supplier_name: d.supplier_name,
      supplier_contact: d.supplier_contact,
      items: d.items,
      total_amount_xof: totalXof,
      status: "pending",
      expected_at: d.expected_at ?? null,
      note: d.note,
    })
    .select("id, po_number, supplier_name, status, created_at")
    .single();

  if (error) {
    if (/relation.*does not exist/i.test(error.message) || error.code === "42P01") {
      return NextResponse.json({ error: "Purchase orders table not ready. Ask Kebu support to run migration 061_shop_purchase_orders." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, purchaseOrder: row });
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
