import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Merchant: list draft orders (manually entered phone/walk-in orders). */
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
    .from("shop_orders")
    .select(
      "id, order_number, product_name, price_label, quantity, customer_name, customer_phone, customer_email, customer_note, payment_preference, payment_status, amount_xof, status, created_at",
    )
    .eq("project_id", projectId)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: orders ?? [] });
}

const createSchema = z.object({
  customer_name: z.string().trim().min(1).max(120),
  customer_phone: z.string().trim().max(30).default(""),
  customer_email: z.string().trim().email().max(120).optional().or(z.literal("")),
  customer_note: z.string().trim().max(500).default(""),
  product_name: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(999).default(1),
  price_label: z.string().trim().max(80).default(""),
  amount_xof: z.number().min(0).optional(),
  payment_preference: z.string().trim().max(40).optional(),
});

/** Create a draft order (phone/walk-in sale entered manually). */
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
    return NextResponse.json({ error: "Invalid order data.", issues: parsed.error.issues }, { status: 400 });
  }

  const d = parsed.data;
  const { data: order, error } = await access.db
    .from("shop_orders")
    .insert({
      project_id: projectId,
      customer_name: d.customer_name,
      customer_phone: d.customer_phone,
      customer_email: d.customer_email || null,
      customer_note: d.customer_note,
      product_name: d.product_name,
      quantity: d.quantity,
      price_label: d.price_label,
      amount_xof: d.amount_xof ?? null,
      payment_preference: d.payment_preference ?? null,
      status: "draft",
      channel: "merchant",
    })
    .select("id, order_number, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, order });
}

const patchSchema = z.object({
  orderId: z.string().uuid(),
  action: z.enum(["confirm", "cancel"]),
  payment_status: z.string().trim().max(30).optional(),
});

/** Confirm (convert to real order) or cancel a draft. */
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

  const { orderId, action, payment_status } = parsed.data;

  const newStatus =
    action === "confirm" ? "confirmed" : "cancelled";

  const updates: Record<string, unknown> = { status: newStatus };
  if (action === "confirm" && payment_status) {
    updates.payment_status = payment_status;
  }

  const { error } = await access.db
    .from("shop_orders")
    .update(updates)
    .eq("id", orderId)
    .eq("project_id", projectId)
    .eq("status", "draft");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, newStatus });
}
