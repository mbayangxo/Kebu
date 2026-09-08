import type { SupabaseClient } from "@supabase/supabase-js";

export type LikedProduct = { name: string; quantity: number; orders: number };

export type ShopCustomerProfile = {
  id: string | null;
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  orderCount: number;
  lifetimeAmountXof: number;
  averageOrderAmountXof: number;
  likedProducts: LikedProduct[];
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  transactions: {
    id: string;
    orderNumber: string | null;
    productName: string;
    priceLabel: string;
    quantity: number;
    amountXof: number | null;
    status: string;
    paymentStatus: string | null;
    createdAt: string;
    trackingNumber: string | null;
    carrier: string | null;
    trackingUrl: string | null;
  }[];
};

export function customerKeyFromContact(
  phone: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const e = email?.trim().toLowerCase() || "";
  const p = phone?.replace(/\D/g, "") || "";
  if (e.includes("@")) return `e:${e}`;
  if (p.length >= 8) return `p:${p}`;
  return null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** Recompute one customer profile from all their orders on this store. */
export async function refreshShopCustomerFromOrders(
  supabase: SupabaseClient,
  opts: {
    projectId: string;
    phone?: string | null;
    email?: string | null;
    customerKey?: string | null;
  },
): Promise<{ ok: true; key: string } | { ok: false; error: string }> {
  const key =
    opts.customerKey || customerKeyFromContact(opts.phone ?? null, opts.email ?? null);
  if (!key) return { ok: false, error: "Need phone or email." };

  let query = supabase
    .from("shop_orders")
    .select(
      "id, customer_name, customer_phone, customer_email, product_name, price_label, quantity, amount_xof, status, created_at",
    )
    .eq("project_id", opts.projectId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true })
    .limit(500);

  if (key.startsWith("e:")) {
    query = query.ilike("customer_email", key.slice(2));
  } else if (key.startsWith("p:")) {
    const digits = key.slice(2);
    query = query.or(
      `customer_phone.ilike.%${digits.slice(-9)}%,customer_phone.ilike.%${digits}%`,
    );
  }

  const { data: orders, error } = await query;
  if (error) {
    return { ok: false, error: error.message };
  }

  const matched = (orders ?? []).filter((o) => {
    const k = customerKeyFromContact(
      typeof o.customer_phone === "string" ? o.customer_phone : null,
      typeof o.customer_email === "string" ? o.customer_email : null,
    );
    return k === key;
  });

  if (matched.length === 0) {
    return { ok: false, error: "No orders for customer." };
  }

  const productMap = new Map<string, LikedProduct>();
  let lifetime = 0;
  let name = "Customer";
  let phone: string | null = null;
  let email: string | null = null;
  let first: string | null = null;
  let last: string | null = null;

  for (const o of matched) {
    if (o.customer_name) name = String(o.customer_name);
    if (o.customer_phone) phone = String(o.customer_phone);
    if (o.customer_email) email = String(o.customer_email).trim().toLowerCase();
    const created = o.created_at ? String(o.created_at) : null;
    if (created) {
      if (!first) first = created;
      last = created;
    }
    const amt = asNumber(o.amount_xof);
    if (amt != null && amt > 0) lifetime += amt;

    const pname = String(o.product_name ?? "Item").trim() || "Item";
    const qty = typeof o.quantity === "number" ? o.quantity : 1;
    const prev = productMap.get(pname) ?? { name: pname, quantity: 0, orders: 0 };
    prev.quantity += qty;
    prev.orders += 1;
    productMap.set(pname, prev);
  }

  // Pull line items for richer “what they like”
  const orderIds = matched.map((o) => o.id);
  if (orderIds.length) {
    const { data: items } = await supabase
      .from("shop_order_items")
      .select("product_name, quantity")
      .in("order_id", orderIds);
    if (items?.length) {
      productMap.clear();
      for (const it of items) {
        const pname = String(it.product_name ?? "Item").trim() || "Item";
        const qty = typeof it.quantity === "number" ? it.quantity : 1;
        const prev = productMap.get(pname) ?? { name: pname, quantity: 0, orders: 0 };
        prev.quantity += qty;
        prev.orders += 1;
        productMap.set(pname, prev);
      }
    }
  }

  const liked = [...productMap.values()]
    .sort((a, b) => b.quantity - a.quantity || b.orders - a.orders)
    .slice(0, 12);

  const orderCount = matched.length;
  const average = orderCount > 0 ? Math.round((lifetime / orderCount) * 100) / 100 : 0;

  const row = {
    project_id: opts.projectId,
    customer_key: key,
    name,
    phone,
    email,
    order_count: orderCount,
    lifetime_amount_xof: lifetime,
    average_order_amount_xof: average,
    liked_products: liked,
    first_order_at: first,
    last_order_at: last,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase.from("shop_customers").upsert(row, {
    onConflict: "project_id,customer_key",
  });

  if (upsertErr) {
    return {
      ok: false,
      error: upsertErr.message?.includes("does not exist")
        ? "Apply 054_shop_fulfillment_customers.sql"
        : upsertErr.message,
    };
  }

  return { ok: true, key };
}

/** After a new order is saved — refresh that buyer’s store profile. */
export async function upsertShopCustomerAfterOrder(
  supabase: SupabaseClient,
  opts: {
    projectId: string;
    phone?: string | null;
    email?: string | null;
  },
): Promise<void> {
  await refreshShopCustomerFromOrders(supabase, opts);
}

export async function getShopCustomerProfile(
  supabase: SupabaseClient,
  opts: { projectId: string; customerKey: string },
): Promise<{ profile: ShopCustomerProfile | null; error?: string }> {
  const key = opts.customerKey.trim();
  if (!key.startsWith("e:") && !key.startsWith("p:")) {
    return { profile: null, error: "Invalid customer key." };
  }

  await refreshShopCustomerFromOrders(supabase, {
    projectId: opts.projectId,
    customerKey: key,
  });

  const { data: row } = await supabase
    .from("shop_customers")
    .select(
      "id, customer_key, name, phone, email, order_count, lifetime_amount_xof, average_order_amount_xof, liked_products, first_order_at, last_order_at",
    )
    .eq("project_id", opts.projectId)
    .eq("customer_key", key)
    .maybeSingle();

  let orderQuery = supabase
    .from("shop_orders")
    .select(
      "id, order_number, product_name, price_label, quantity, amount_xof, status, payment_status, created_at, tracking_number, carrier, tracking_url, customer_phone, customer_email",
    )
    .eq("project_id", opts.projectId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (key.startsWith("e:")) {
    orderQuery = orderQuery.ilike("customer_email", key.slice(2));
  } else {
    const digits = key.slice(2);
    orderQuery = orderQuery.or(
      `customer_phone.ilike.%${digits.slice(-9)}%,customer_phone.ilike.%${digits}%`,
    );
  }

  const { data: orders, error: orderErr } = await orderQuery;
  if (orderErr) {
    return { profile: null, error: orderErr.message };
  }

  const transactions = (orders ?? [])
    .filter((o) => {
      const k = customerKeyFromContact(
        typeof o.customer_phone === "string" ? o.customer_phone : null,
        typeof o.customer_email === "string" ? o.customer_email : null,
      );
      return k === key;
    })
    .map((o) => ({
      id: o.id as string,
      orderNumber: (o.order_number as string) ?? null,
      productName: String(o.product_name ?? ""),
      priceLabel: String(o.price_label ?? ""),
      quantity: typeof o.quantity === "number" ? o.quantity : 1,
      amountXof: asNumber(o.amount_xof),
      status: String(o.status ?? "pending"),
      paymentStatus: (o.payment_status as string) ?? null,
      createdAt: String(o.created_at ?? ""),
      trackingNumber: (o.tracking_number as string) ?? null,
      carrier: (o.carrier as string) ?? null,
      trackingUrl: (o.tracking_url as string) ?? null,
    }));

  const likedRaw = row?.liked_products;
  const likedProducts: LikedProduct[] = Array.isArray(likedRaw)
    ? (likedRaw as LikedProduct[])
    : [];

  return {
    profile: {
      id: row?.id ?? null,
      key,
      name: row?.name ?? transactions[0]?.productName ?? "Customer",
      phone: row?.phone ?? null,
      email: row?.email ?? null,
      orderCount: row?.order_count ?? transactions.length,
      lifetimeAmountXof: asNumber(row?.lifetime_amount_xof) ?? 0,
      averageOrderAmountXof: asNumber(row?.average_order_amount_xof) ?? 0,
      likedProducts,
      firstOrderAt: row?.first_order_at ?? null,
      lastOrderAt: row?.last_order_at ?? null,
      transactions,
    },
  };
}
