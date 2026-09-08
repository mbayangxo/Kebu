import type { SupabaseClient } from "@supabase/supabase-js";
import {
  customerKeyFromContact,
  type LikedProduct,
} from "@/lib/shop/customer-profiles";

export type ShopCustomerRow = {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  sources: string[];
  orderCount: number;
  lastOrderAt: string | null;
  subscribedAt: string | null;
  lifetimeAmountXof: number;
  averageOrderAmountXof: number;
  likedProducts: LikedProduct[];
};

/** Merge persisted shop_customers + order buyers + newsletter for one shop. */
export async function listShopCustomers(
  supabase: SupabaseClient,
  opts: { projectId: string; businessId: string | null },
): Promise<{ customers: ShopCustomerRow[]; error?: string }> {
  const { data: profiles } = await supabase
    .from("shop_customers")
    .select(
      "customer_key, name, phone, email, order_count, lifetime_amount_xof, average_order_amount_xof, liked_products, last_order_at",
    )
    .eq("project_id", opts.projectId)
    .order("last_order_at", { ascending: false })
    .limit(500);

  const byKey = new Map<string, ShopCustomerRow>();

  for (const p of profiles ?? []) {
    const key = String(p.customer_key);
    const liked = Array.isArray(p.liked_products) ? (p.liked_products as LikedProduct[]) : [];
    byKey.set(key, {
      key,
      name: String(p.name ?? "Customer"),
      phone: typeof p.phone === "string" ? p.phone : null,
      email: typeof p.email === "string" ? p.email : null,
      sources: ["order"],
      orderCount: typeof p.order_count === "number" ? p.order_count : 0,
      lastOrderAt: p.last_order_at ?? null,
      subscribedAt: null,
      lifetimeAmountXof:
        typeof p.lifetime_amount_xof === "number"
          ? p.lifetime_amount_xof
          : Number(p.lifetime_amount_xof) || 0,
      averageOrderAmountXof:
        typeof p.average_order_amount_xof === "number"
          ? p.average_order_amount_xof
          : Number(p.average_order_amount_xof) || 0,
      likedProducts: liked,
    });
  }

  const { data: orders, error: orderErr } = await supabase
    .from("shop_orders")
    .select("customer_name, customer_phone, customer_email, created_at, amount_xof, status")
    .eq("project_id", opts.projectId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (orderErr) {
    return {
      customers: [...byKey.values()],
      error: orderErr.message?.includes("does not exist")
        ? "Orders table missing. Apply APPLY_SHOP_ORDERS.sql."
        : orderErr.message,
    };
  }

  for (const o of orders ?? []) {
    if (o.status === "cancelled") continue;
    const phone = typeof o.customer_phone === "string" ? o.customer_phone : null;
    const email =
      typeof o.customer_email === "string" ? o.customer_email.trim().toLowerCase() : null;
    const key = customerKeyFromContact(phone, email);
    if (!key) continue;
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.sources.includes("order")) existing.sources.push("order");
      if (!existing.email && email) existing.email = email;
      if (!existing.phone && phone) existing.phone = phone;
      if (o.customer_name && existing.name.length < String(o.customer_name).length) {
        existing.name = String(o.customer_name);
      }
      if (!existing.lastOrderAt && o.created_at) existing.lastOrderAt = o.created_at;
    } else {
      byKey.set(key, {
        name: String(o.customer_name ?? "Customer"),
        phone,
        email,
        key,
        sources: ["order"],
        orderCount: 1,
        lastOrderAt: o.created_at ?? null,
        subscribedAt: null,
        lifetimeAmountXof: typeof o.amount_xof === "number" ? o.amount_xof : Number(o.amount_xof) || 0,
        averageOrderAmountXof:
          typeof o.amount_xof === "number" ? o.amount_xof : Number(o.amount_xof) || 0,
        likedProducts: [],
      });
    }
  }

  if (opts.businessId) {
    const { data: subs } = await supabase
      .from("business_email_subscribers")
      .select("email, name, source, created_at, project_id, unsubscribed_at")
      .eq("business_id", opts.businessId)
      .is("unsubscribed_at", null)
      .or(`project_id.eq.${opts.projectId},project_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(500);

    for (const s of subs ?? []) {
      const email = String(s.email).trim().toLowerCase();
      if (!email) continue;
      const key = customerKeyFromContact(null, email);
      if (!key) continue;
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.sources.includes(String(s.source || "site"))) {
          existing.sources.push(String(s.source || "site"));
        }
        if (!existing.email) existing.email = email;
        if (s.name && !existing.name) existing.name = String(s.name);
        existing.subscribedAt = s.created_at ?? existing.subscribedAt;
      } else {
        byKey.set(key, {
          name: String(s.name ?? email),
          phone: null,
          email,
          key,
          sources: [String(s.source || "site")],
          orderCount: 0,
          lastOrderAt: null,
          subscribedAt: s.created_at ?? null,
          lifetimeAmountXof: 0,
          averageOrderAmountXof: 0,
          likedProducts: [],
        });
      }
    }
  }

  const customers = [...byKey.values()].sort((a, b) => {
    const ta = a.lastOrderAt || a.subscribedAt || "";
    const tb = b.lastOrderAt || b.subscribedAt || "";
    return tb.localeCompare(ta);
  });

  return { customers };
}

export async function upsertOrderSubscriber(
  admin: SupabaseClient,
  opts: {
    businessId: string;
    projectId: string;
    email: string;
    name?: string | null;
  },
): Promise<void> {
  const email = opts.email.trim().toLowerCase();
  if (!email.includes("@")) return;
  await admin.from("business_email_subscribers").upsert(
    {
      business_id: opts.businessId,
      project_id: opts.projectId,
      email,
      name: opts.name?.trim() || null,
      source: "order",
      unsubscribed_at: null,
    },
    { onConflict: "business_id,email" },
  );
}
