import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET — review request settings + recent sends. */
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

  // Load settings from project.seo
  const { data: project } = await access.db
    .from("projects")
    .select("seo")
    .eq("id", projectId)
    .maybeSingle();

  const seo = (project?.seo && typeof project.seo === "object" ? project.seo : {}) as Record<string, unknown>;
  const settings = (seo.reviewRequests && typeof seo.reviewRequests === "object"
    ? seo.reviewRequests
    : {}) as Record<string, unknown>;

  // Load recent review request sends (graceful if table missing)
  const { data: rows, error } = await access.db
    .from("shop_review_requests")
    .select("id, order_id, customer_name, customer_phone, customer_email, channel, discount_code, status, sent_at, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);

  // Load orders eligible for review request (fulfilled/paid, no request sent yet)
  const { data: eligibleOrders, error: ordersError } = await access.db
    .from("shop_orders")
    .select("id, order_number, customer_name, customer_phone, customer_email, status, payment_status, created_at")
    .eq("project_id", projectId)
    .in("status", ["fulfilled", "paid", "delivered"])
    .order("created_at", { ascending: false })
    .limit(50);

  const sentOrderIds = new Set((rows ?? []).map((r: { order_id: string }) => r.order_id));
  const eligible = (eligibleOrders ?? []).filter(
    (o: { id: string }) => !sentOrderIds.has(o.id)
  );

  return NextResponse.json({
    settings: {
      enabled: Boolean(settings.enabled ?? false),
      daysAfterFulfillment: Number(settings.daysAfterFulfillment ?? 3),
      discountPercent: Number(settings.discountPercent ?? 10),
      channel: String(settings.channel ?? "whatsapp"),
      messageTemplate: String(settings.messageTemplate ?? ""),
    },
    requests: error || /relation.*does not exist/i.test(error?.message ?? "") ? [] : (rows ?? []),
    tableReady: !error || (!/relation.*does not exist/i.test(error.message) && error.code !== "42P01"),
    eligibleOrders: ordersError ? [] : eligible,
  });
}

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  daysAfterFulfillment: z.number().int().min(1).max(30).optional(),
  discountPercent: z.number().min(0).max(50).optional(),
  channel: z.enum(["whatsapp", "email", "both"]).optional(),
  messageTemplate: z.string().trim().max(1000).optional(),
});

/** PATCH — save review request settings. */
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
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
  }

  const { data: project } = await access.db
    .from("projects")
    .select("seo")
    .eq("id", projectId)
    .maybeSingle();

  const currentSeo = (project?.seo && typeof project.seo === "object" ? project.seo : {}) as Record<string, unknown>;
  const currentSettings = (currentSeo.reviewRequests && typeof currentSeo.reviewRequests === "object"
    ? currentSeo.reviewRequests
    : {}) as Record<string, unknown>;

  const nextSettings = { ...currentSettings, ...parsed.data };
  const nextSeo = { ...currentSeo, reviewRequests: nextSettings };

  const { error } = await access.db
    .from("projects")
    .update({ seo: nextSeo, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings: nextSettings });
}

const sendSchema = z.object({
  orderId: z.string().uuid(),
  channel: z.enum(["whatsapp", "email", "both"]),
  discountCode: z.string().trim().max(30).optional().default(""),
  discountPercent: z.number().min(0).max(50).optional(),
  note: z.string().trim().max(300).optional().default(""),
});

/** POST — log a review request send for an order. */
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
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data.", issues: parsed.error.issues }, { status: 400 });
  }

  const d = parsed.data;

  // Look up the order
  const { data: order } = await access.db
    .from("shop_orders")
    .select("id, order_number, customer_name, customer_phone, customer_email")
    .eq("id", d.orderId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const { data: row, error } = await access.db
    .from("shop_review_requests")
    .insert({
      project_id: projectId,
      order_id: d.orderId,
      customer_name: (order as { customer_name: string }).customer_name,
      customer_phone: (order as { customer_phone: string }).customer_phone,
      customer_email: (order as { customer_email: string }).customer_email,
      channel: d.channel,
      discount_code: d.discountCode || null,
      discount_percent: d.discountPercent ?? null,
      status: "sent",
      sent_at: new Date().toISOString(),
      note: d.note || null,
    })
    .select("id, status, sent_at")
    .single();

  if (error) {
    if (/relation.*does not exist/i.test(error.message) || error.code === "42P01") {
      return NextResponse.json({
        error: "Review requests table not ready. Ask Kebu support to run migration 063_shop_review_requests.",
      }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, request: row });
}
