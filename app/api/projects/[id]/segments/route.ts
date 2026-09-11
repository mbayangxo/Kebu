import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export type CustomerSegment = {
  id: string;
  label: string;
  description: string;
  count: number;
  members: {
    key: string;
    name: string;
    phone: string;
    email: string | null;
    orderCount: number;
    lifetimeXof: number;
    lastOrderAt: string | null;
  }[];
};

/** Merchant: customer segments computed from order history. */
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

  // Load all paid/fulfilled orders to compute segments
  const { data: orders, error } = await access.db
    .from("shop_orders")
    .select("customer_name, customer_phone, customer_email, amount_xof, status, created_at")
    .eq("project_id", projectId)
    .in("status", ["confirmed", "fulfilled", "paid"])
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build per-customer profile
  type CustomerAgg = {
    key: string;
    name: string;
    phone: string;
    email: string | null;
    orderCount: number;
    lifetimeXof: number;
    lastOrderAt: string | null;
  };

  const byKey: Record<string, CustomerAgg> = {};
  const now = Date.now();

  for (const o of orders ?? []) {
    const phone = String(o.customer_phone ?? "").trim();
    const email = o.customer_email ? String(o.customer_email).trim() : null;
    const key = email || phone || String(o.customer_name ?? "").trim().toLowerCase().slice(0, 40);
    if (!key) continue;

    if (!byKey[key]) {
      byKey[key] = {
        key,
        name: String(o.customer_name ?? "Unknown"),
        phone,
        email,
        orderCount: 0,
        lifetimeXof: 0,
        lastOrderAt: null,
      };
    }
    byKey[key].orderCount++;
    byKey[key].lifetimeXof += o.amount_xof ?? 0;
    const oDate = o.created_at ? new Date(o.created_at).toISOString() : null;
    if (oDate && (!byKey[key].lastOrderAt || oDate > byKey[key].lastOrderAt)) {
      byKey[key].lastOrderAt = oDate;
    }
  }

  const customers = Object.values(byKey);

  const allLifetimes = customers.map((c) => c.lifetimeXof).sort((a, b) => b - a);
  const top20Threshold = allLifetimes[Math.floor(allLifetimes.length * 0.2)] ?? 0;
  const avgLifetime = customers.length ? customers.reduce((s, c) => s + c.lifetimeXof, 0) / customers.length : 0;

  const ninety = new Date(now - 90 * 86400000).toISOString();
  const thirty = new Date(now - 30 * 86400000).toISOString();

  const segments: CustomerSegment[] = [
    {
      id: "vip",
      label: "VIP",
      description: "Top 20% by lifetime spend",
      count: 0,
      members: [],
    },
    {
      id: "repeat",
      label: "Repeat buyers",
      description: "2+ orders placed",
      count: 0,
      members: [],
    },
    {
      id: "new",
      label: "New this month",
      description: "First order in last 30 days",
      count: 0,
      members: [],
    },
    {
      id: "at-risk",
      label: "At risk",
      description: "No order in 90 days, had previous activity",
      count: 0,
      members: [],
    },
    {
      id: "high-value",
      label: "High value",
      description: `Lifetime spend above average (${Math.round(avgLifetime).toLocaleString()} XOF)`,
      count: 0,
      members: [],
    },
  ];

  for (const c of customers) {
    // VIP: top 20% by lifetime
    if (c.lifetimeXof >= top20Threshold && top20Threshold > 0) {
      segments[0].members.push(c);
    }
    // Repeat
    if (c.orderCount >= 2) {
      segments[1].members.push(c);
    }
    // New this month
    if (c.lastOrderAt && c.lastOrderAt >= thirty && c.orderCount === 1) {
      segments[2].members.push(c);
    }
    // At risk (last order > 90 days ago)
    if (c.lastOrderAt && c.lastOrderAt < ninety) {
      segments[3].members.push(c);
    }
    // High value (above average)
    if (c.lifetimeXof > avgLifetime && avgLifetime > 0) {
      segments[4].members.push(c);
    }
  }

  for (const s of segments) {
    s.count = s.members.length;
    // Limit members per segment for response size
    s.members = s.members.slice(0, 50);
  }

  return NextResponse.json({ segments, totalCustomers: customers.length });
}
