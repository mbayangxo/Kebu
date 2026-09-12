import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { shopCustomerProfileSchema } from "@/lib/shop/customer-account";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

async function resolveLiveProject(subdomain: string) {
  const admin = createServiceClient();
  if (!admin) return { error: NextResponse.json({ error: "Service unavailable." }, { status: 503 }) };
  const { data: live } = await admin
    .from("deployments")
    .select("project_id, status")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();
  if (!live?.project_id) {
    return { error: NextResponse.json({ error: "Site is not live." }, { status: 404 }) };
  }
  return { admin, projectId: live.project_id as string };
}

/** Signed-in shopper: profile + purchase history for this store. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subdomain)) {
    return NextResponse.json({ error: "Invalid site." }, { status: 400 });
  }

  const live = await resolveLiveProject(subdomain);
  if ("error" in live) return live.error;
  const { projectId } = live;

  const { data: profile } = await supabase
    .from("shop_customer_profiles")
    .select("display_name, phone, updated_at")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .maybeSingle();

  let ordersQuery = await supabase
    .from("shop_orders")
    .select(
      "id, order_number, product_name, product_upc, price_label, quantity, status, payment_status, payment_preference, amount_xof, created_at, customer_note",
    )
    .eq("project_id", projectId)
    .eq("customer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (ordersQuery.error && /customer_user_id|order_number|product_upc/i.test(ordersQuery.error.message ?? "")) {
    return NextResponse.json({
      user: { id: user.id, email: user.email ?? null },
      profile: null,
      orders: [],
      needsMigration: true,
      message: "Shopper accounts need migration 048. Apply APPLY_SHOP_ORDERS.sql.",
    });
  }

  if (ordersQuery.error) {
    return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
  }

  const orderIds = (ordersQuery.data ?? []).map((o) => o.id);
  let itemsByOrder: Record<string, { product_name: string; quantity: number; price_label: string }[]> = {};
  if (orderIds.length) {
    const items = await supabase
      .from("shop_order_items")
      .select("order_id, product_name, quantity, price_label")
      .in("order_id", orderIds)
      .order("sort_order", { ascending: true });
    if (!items.error && items.data) {
      for (const row of items.data) {
        const oid = row.order_id as string;
        if (!itemsByOrder[oid]) itemsByOrder[oid] = [];
        itemsByOrder[oid]!.push({
          product_name: row.product_name,
          quantity: row.quantity,
          price_label: row.price_label ?? "",
        });
      }
    }
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email ?? null },
    profile: profile
      ? {
          displayName: profile.display_name ?? "",
          phone: profile.phone ?? "",
          updatedAt: profile.updated_at,
        }
      : null,
    orders: (ordersQuery.data ?? []).map((o) => ({
      ...o,
      items: itemsByOrder[o.id] ?? [],
    })),
  });
}

/** Upsert shopper profile for this store. */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = shopCustomerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile." }, { status: 400 });
  }

  const live = await resolveLiveProject(subdomain);
  if ("error" in live) return live.error;

  const { data, error } = await supabase
    .from("shop_customer_profiles")
    .upsert(
      {
        user_id: user.id,
        project_id: live.projectId,
        display_name: parsed.data.displayName,
        phone: parsed.data.phone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,project_id" },
    )
    .select("display_name, phone")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Shopper profiles need migration 048. Apply APPLY_SHOP_ORDERS.sql."
          : "Could not save profile.",
      },
      { status: 500 },
    );
  }

  logCreate("shop.customer_profile_saved", { userId: user.id, projectId: live.projectId });
  return NextResponse.json({
    profile: { displayName: data.display_name, phone: data.phone },
  });
}
