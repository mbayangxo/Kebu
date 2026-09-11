import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export type PayoutWeek = {
  week: string;
  orders: number;
  revenueXof: number;
  methods: { label: string; count: number; amountXof: number }[];
};

export type PayoutSummary = {
  totalPaidXof: number;
  pendingXof: number;
  paidOutXof: number;
  weeks: PayoutWeek[];
  generatedAt: string;
};

/** Merchant: aggregate paid order revenue for payout view. */
export async function GET(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const url = new URL(req.url);
  const days = Math.min(180, Math.max(7, Number(url.searchParams.get("days") ?? "90")));

  const access = await assertShopProjectAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "shop-orders",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: orders, error } = await access.db
    .from("shop_orders")
    .select("payment_status, payment_preference, amount_xof, created_at, payout_at")
    .eq("project_id", projectId)
    .eq("payment_status", "paid")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (orders ?? []) as {
    payment_status: string;
    payment_preference: string | null;
    amount_xof: number | null;
    created_at: string;
    payout_at?: string | null;
  }[];

  let totalPaidXof = 0;
  let paidOutXof = 0;
  let pendingXof = 0;

  // Group by ISO week
  const weekMap: Record<string, { orders: number; revenueXof: number; methods: Record<string, { count: number; amountXof: number }> }> = {};

  for (const r of rows) {
    const amt = r.amount_xof ?? 0;
    totalPaidXof += amt;
    if (r.payout_at) {
      paidOutXof += amt;
    } else {
      pendingXof += amt;
    }

    const d = new Date(r.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay() + 1); // Monday
    const weekKey = weekStart.toISOString().slice(0, 10);

    if (!weekMap[weekKey]) {
      weekMap[weekKey] = { orders: 0, revenueXof: 0, methods: {} };
    }
    weekMap[weekKey].orders++;
    weekMap[weekKey].revenueXof += amt;

    const method = r.payment_preference ?? "other";
    if (!weekMap[weekKey].methods[method]) {
      weekMap[weekKey].methods[method] = { count: 0, amountXof: 0 };
    }
    weekMap[weekKey].methods[method].count++;
    weekMap[weekKey].methods[method].amountXof += amt;
  }

  const weeks: PayoutWeek[] = Object.entries(weekMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12)
    .map(([week, data]) => ({
      week,
      orders: data.orders,
      revenueXof: data.revenueXof,
      methods: Object.entries(data.methods).map(([label, v]) => ({
        label,
        count: v.count,
        amountXof: v.amountXof,
      })),
    }));

  const summary: PayoutSummary = {
    totalPaidXof,
    pendingXof,
    paidOutXof,
    weeks,
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ summary });
}
