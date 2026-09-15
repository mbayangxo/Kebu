import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export type NavCounts = {
  pendingOrders: number;
  draftOrders: number;
  abandonedCarts: number;
  unreadMessages: number;
  lowStockItems: number;
  paymentIssues: number;
  todayRevenue: number;
  todayOrders: number;
  currency: string;
};

/** Returns badge counts for the shop admin sidebar nav. Fast — count queries only. */
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [
    pendingRes,
    draftRes,
    abandonedRes,
    messagesRes,
    lowStockRes,
    paymentIssuesRes,
    todayOrdersRes,
    todayRevenueRes,
  ] = await Promise.all([
    // Pending (unfulfilled paid orders)
    db.from("shop_orders")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["pending", "confirmed"])
      .eq("payment_status", "paid")
      .is("fulfilled_at", null)
      .is("archived_at", null),

    // Draft orders
    db.from("shop_orders")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "draft")
      .is("archived_at", null),

    // Abandoned carts (last 7 days)
    db.from("shop_abandoned_carts")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .is("recovered_at", null),

    // Unread messages
    db.from("shop_messages")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("read", false)
      .eq("direction", "inbound"),

    // Low stock products (quantity <= 5 and track inventory)
    db.from("shop_products")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("track_inventory", true)
      .lte("inventory_quantity", 5)
      .eq("status", "active"),

    // Payment issues (failed or disputed)
    db.from("shop_payments")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["failed", "disputed", "chargeback"]),

    // Today's order count
    db.from("shop_orders")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gte("created_at", todayIso)
      .is("archived_at", null),

    // Today's revenue (sum)
    db.from("shop_orders")
      .select("amount_xof")
      .eq("project_id", projectId)
      .eq("payment_status", "paid")
      .gte("created_at", todayIso)
      .is("archived_at", null),
  ]);

  const todayRevenue = (todayRevenueRes.data ?? []).reduce(
    (sum, r) => sum + (Number(r.amount_xof) || 0),
    0,
  );

  const counts: NavCounts = {
    pendingOrders:  pendingRes.count ?? 0,
    draftOrders:    draftRes.count ?? 0,
    abandonedCarts: abandonedRes.count ?? 0,
    unreadMessages: messagesRes.count ?? 0,
    lowStockItems:  lowStockRes.count ?? 0,
    paymentIssues:  paymentIssuesRes.count ?? 0,
    todayOrders:    todayOrdersRes.count ?? 0,
    todayRevenue,
    currency:       "XOF",
  };

  return NextResponse.json(counts);
}
