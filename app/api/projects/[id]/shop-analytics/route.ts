import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { buildCommerceAnalytics, type CommerceOrderInput } from "@/lib/shop/commerce-insights";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Owner / team shop analytics — patterns from real orders, cart drafts, and site pageviews.
 * Never returns hard-coded “demo” metrics.
 */
export async function GET(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const access = await assertShopProjectAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "shop-analytics",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const { project, db } = access;

  const url = new URL(req.url);
  const rangeDays = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 30) || 30));
  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: orderRows, error: orderErr } = await db
    .from("shop_orders")
    .select(
      "id, product_name, quantity, payment_status, payment_preference, status, amount_xof, customer_phone, customer_email, customer_user_id, discount_code, channel, created_at",
    )
    .eq("project_id", projectId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (orderErr) {
    return NextResponse.json(
      {
        error: orderErr.message?.includes("does not exist")
          ? "Shop orders missing. Apply APPLY_SHOP_ORDERS.sql."
          : "Could not load orders for analytics.",
        detail: orderErr.message,
      },
      { status: 500 },
    );
  }

  let drafts: {
    id: string;
    status: string;
    last_seen_at: string;
    customer_email: string | null;
    customer_phone: string | null;
  }[] = [];

  const { data: draftRows, error: draftErr } = await db
    .from("shop_cart_drafts")
    .select("id, status, last_seen_at, customer_email, customer_phone")
    .eq("project_id", projectId)
    .gte("updated_at", since)
    .limit(1000);

  if (!draftErr && draftRows) {
    drafts = draftRows;
  }

  const { data: openDrafts } = await db
    .from("shop_cart_drafts")
    .select("id, status, last_seen_at, customer_email, customer_phone")
    .eq("project_id", projectId)
    .eq("status", "open")
    .limit(200);

  if (openDrafts?.length) {
    const seen = new Set(drafts.map((d) => d.id));
    for (const d of openDrafts) {
      if (!seen.has(d.id)) drafts.push(d);
    }
  }

  let pageviews: number | null = null;
  const { count, error: pvErr } = await db
    .from("site_analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("event_type", "pageview")
    .gte("created_at", since);

  if (!pvErr && typeof count === "number") {
    pageviews = count;
  }

  async function countEvents(type: string): Promise<number> {
    const { count: c, error } = await db
      .from("site_analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("event_type", type)
      .gte("created_at", since);
    return !error && typeof c === "number" ? c : 0;
  }

  const [productViews, addToCart, checkoutStart, purchases] = await Promise.all([
    countEvents("product_view"),
    countEvents("add_to_cart"),
    countEvents("checkout_start"),
    countEvents("purchase"),
  ]);

  const visitorBuckets = {
    countries: {} as Record<string, number>,
    referrers: {} as Record<string, number>,
    devices: {} as Record<string, number>,
  };

  const { data: pvRows } = await db
    .from("site_analytics_events")
    .select("device, meta")
    .eq("project_id", projectId)
    .eq("event_type", "pageview")
    .gte("created_at", since)
    .limit(2000);

  for (const row of pvRows ?? []) {
    const device = typeof row.device === "string" && row.device ? row.device : "unknown";
    visitorBuckets.devices[device] = (visitorBuckets.devices[device] ?? 0) + 1;
    const meta =
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? (row.meta as Record<string, unknown>)
        : {};
    const country = String(meta.country ?? meta.cfCountry ?? "").trim().toUpperCase() || "unknown";
    visitorBuckets.countries[country] = (visitorBuckets.countries[country] ?? 0) + 1;
    const refRaw = String(meta.referrer ?? meta.ref ?? "").trim();
    let referrer = "direct";
    if (refRaw) {
      try {
        referrer = new URL(refRaw).hostname.replace(/^www\./, "") || refRaw.slice(0, 60);
      } catch {
        referrer = refRaw.slice(0, 60);
      }
    }
    visitorBuckets.referrers[referrer] = (visitorBuckets.referrers[referrer] ?? 0) + 1;
  }

  const summary = buildCommerceAnalytics({
    rangeDays,
    projectId,
    orders: (orderRows ?? []) as CommerceOrderInput[],
    drafts,
    pageviews,
    funnel: { productViews, addToCart, checkoutStart, purchases },
    visitorBuckets,
  });

  logCreate("shop.analytics_viewed", {
    projectId,
    rangeDays,
    orders: summary.orders.total,
    insights: summary.insights.length,
    via: access.via,
  });

  return NextResponse.json({
    project: {
      id: project.id,
      title: project.title,
      subdomain: project.subdomain,
    },
    summary,
  });
}
