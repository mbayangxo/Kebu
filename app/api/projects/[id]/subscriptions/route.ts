import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  mapSubscription,
  nextBillingDate,
  subscriptionInputSchema,
  type SubscriptionRow,
} from "@/lib/shop/subscriptions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("shop_subscriptions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Apply migration 066_remaining_slices.sql." }, { status: 500 });
  }

  return NextResponse.json({ subscriptions: ((data ?? []) as SubscriptionRow[]).map(mapSubscription) });
}

export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = subscriptionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { data: product } = await supabase
    .from("project_products")
    .select("id, is_subscription, subscription_interval, is_active")
    .eq("id", parsed.data.productId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!product?.is_active) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  if (!product.is_subscription) {
    return NextResponse.json(
      { error: "Enable Subscription on this product before adding subscribers." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("shop_subscriptions")
    .insert({
      project_id: projectId,
      product_id: parsed.data.productId,
      customer_name: parsed.data.customerName,
      customer_phone: parsed.data.customerPhone,
      customer_email: parsed.data.customerEmail ?? null,
      interval: parsed.data.interval,
      price_xof: parsed.data.priceXof,
      status: "active",
      next_billing_at: nextBillingDate(parsed.data.interval),
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not create subscription." }, { status: 500 });
  }

  return NextResponse.json({ subscription: mapSubscription(data as SubscriptionRow) }, { status: 201 });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const subscriptionId = typeof rec.subscriptionId === "string" ? rec.subscriptionId : "";
  const status = rec.status === "active" || rec.status === "paused" || rec.status === "cancelled" ? rec.status : null;
  if (!subscriptionId || !status) {
    return NextResponse.json({ error: "subscriptionId and status required." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("shop_subscriptions")
    .update({ status })
    .eq("id", subscriptionId)
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not update subscription." }, { status: 500 });
  }

  return NextResponse.json({ subscription: mapSubscription(data as SubscriptionRow) });
}
