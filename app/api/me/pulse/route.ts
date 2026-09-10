import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { projectShopOpened } from "@/lib/create/site-shop";

export const dynamic = "force-dynamic";

export type PulseItem = {
  id: string;
  kind: "order" | "message" | "update" | "shop" | "site";
  title: string;
  body: string;
  href: string;
  businessId: string | null;
  businessName: string | null;
  projectId: string | null;
  projectTitle: string | null;
  at: string | null;
};

/**
 * Cross-business pulse — real orders to fulfill + open message threads + site updates.
 * Deep-links into the right shop/business. No fake todos.
 */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .eq("status", "active");

  const businessIds = (memberships ?? []).map((m) => m.business_id);
  const bizName = new Map<string, string>();
  if (businessIds.length > 0) {
    const { data: bizRows } = await supabase
      .from("businesses")
      .select("id, legal_name, trading_name")
      .in("id", businessIds);
    for (const b of bizRows ?? []) {
      bizName.set(b.id, b.trading_name || b.legal_name);
    }
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, business_id, seo, status, updated_at, subdomain")
    .eq("owner_id", user.id)
    .eq("project_type", "website")
    .order("updated_at", { ascending: false })
    .limit(40);

  const projectList = projects ?? [];
  const items: PulseItem[] = [];

  const shopProjectIds = projectList.filter((p) => projectShopOpened(p.seo)).map((p) => p.id);
  const metaById = new Map(
    projectList.map((p) => [
      p.id,
      {
        title: p.title as string,
        businessId: (p.business_id as string | null) ?? null,
        businessName: p.business_id ? bizName.get(p.business_id as string) ?? null : null,
      },
    ]),
  );

  if (shopProjectIds.length > 0) {
    const { data: orders } = await supabase
      .from("shop_orders")
      .select("id, project_id, order_number, product_name, status, customer_name, created_at")
      .in("project_id", shopProjectIds)
      .eq("status", "pending")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(30);

    for (const o of orders ?? []) {
      const meta = metaById.get(o.project_id as string);
      items.push({
        id: `order-${o.id}`,
        kind: "order",
        title: `Fulfill order ${o.order_number ?? ""}`.trim(),
        body: `${o.product_name ?? "Order"}${o.customer_name ? ` · ${o.customer_name}` : ""} · ${meta?.title ?? "Shop"}`,
        href: `/shop/${o.project_id}?tab=orders`,
        businessId: meta?.businessId ?? null,
        businessName: meta?.businessName ?? null,
        projectId: o.project_id as string,
        projectTitle: meta?.title ?? null,
        at: (o.created_at as string) ?? null,
      });
    }

    const { data: threads, error: threadErr } = await supabase
      .from("shop_message_threads")
      .select("id, project_id, subject, status, last_message_at, updated_at")
      .in("project_id", shopProjectIds)
      .in("status", ["open"])
      .order("last_message_at", { ascending: false })
      .limit(20);

    if (!threadErr) {
      for (const t of threads ?? []) {
        const meta = metaById.get(t.project_id as string);
        items.push({
          id: `msg-${t.id}`,
          kind: "message",
          title: t.subject?.trim() || "Customer message",
          body: `Needs a reply · ${meta?.title ?? "Shop"}`,
          href: `/shop/${t.project_id}?tab=messages`,
          businessId: meta?.businessId ?? null,
          businessName: meta?.businessName ?? null,
          projectId: t.project_id as string,
          projectTitle: meta?.title ?? null,
          at: (t.last_message_at as string) || (t.updated_at as string) || null,
        });
      }
    }
  }

  for (const p of projectList.slice(0, 8)) {
    if (!projectShopOpened(p.seo)) {
      items.push({
        id: `site-${p.id}`,
        kind: "site",
        title: p.title,
        body: p.status === "published" || p.status === "live" ? "Website live" : "Website draft — open to edit",
        href: `/my-sites/${p.id}`,
        businessId: (p.business_id as string | null) ?? null,
        businessName: p.business_id ? bizName.get(p.business_id as string) ?? null : null,
        projectId: p.id,
        projectTitle: p.title,
        at: p.updated_at as string,
      });
    } else {
      items.push({
        id: `shop-open-${p.id}`,
        kind: "shop",
        title: `${p.title} shop`,
        body: "Shop open — manage products & orders",
        href: `/shop/${p.id}`,
        businessId: (p.business_id as string | null) ?? null,
        businessName: p.business_id ? bizName.get(p.business_id as string) ?? null : null,
        projectId: p.id,
        projectTitle: p.title,
        at: p.updated_at as string,
      });
    }
  }

  items.sort((a, b) => {
    const ta = a.at ? Date.parse(a.at) : 0;
    const tb = b.at ? Date.parse(b.at) : 0;
    return tb - ta;
  });

  const pendingOrders = items.filter((i) => i.kind === "order").length;
  const openMessages = items.filter((i) => i.kind === "message").length;
  const shopsOpen = shopProjectIds.length;

  return NextResponse.json({
    pulse: {
      pendingOrders,
      openMessages,
      shopsOpen,
      businesses: businessIds.length,
      items: items.slice(0, 40),
    },
  });
}
