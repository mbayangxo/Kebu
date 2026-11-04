import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * JOKO Fulfillment — honest scope.
 *
 * This module is the opt-in, bookkeeping, and operations-queue layer for a
 * seller choosing to have Kebu pick up and deliver their orders instead of
 * self-fulfilling. It does NOT perform, track, or simulate any real pickup
 * or delivery: there is no courier fleet or warehouse behind this code. The
 * `status` field a real Kebu operations person updates by hand as they
 * actually complete each step in the physical world — nothing here
 * auto-advances it or infers it from anything.
 */

export const JOKO_FULFILLMENT_STATUSES = [
  "awaiting_pickup",
  "picked_up",
  "in_transit",
  "delivered",
  "failed_delivery",
  "returned",
  "cancelled",
] as const;

/**
 * Statuses where the commission does not apply — the pickup+delivery service was
 * never completed. Reasoned default, not a certainty: 'returned' (delivery
 * succeeded, customer returned the item afterward through a separate process)
 * still counts as a completed service and keeps the commission. Flag this for
 * explicit confirmation rather than treating it as final.
 */
export const JOKO_FULFILLMENT_NO_COMMISSION_STATUSES = ["cancelled", "failed_delivery"] as const;
export type JokoFulfillmentStatus = (typeof JOKO_FULFILLMENT_STATUSES)[number];

/** Platform default when a seller enables Joko Fulfillment without setting their own rate. */
export const DEFAULT_JOKO_FULFILLMENT_COMMISSION_BPS = 1500; // 15% — tune via shop_shipping_options.commission_bps

/** Commission is a share of the order subtotal (the goods Kebu actually handles), never the shipping fee itself. */
export function computeJokoFulfillmentCommissionXof(
  subtotalXof: number,
  commissionBps: number | null | undefined,
): number {
  const bps = commissionBps ?? DEFAULT_JOKO_FULFILLMENT_COMMISSION_BPS;
  if (!Number.isFinite(subtotalXof) || subtotalXof <= 0) return 0;
  return Math.round((subtotalXof * bps) / 10000);
}

export type FulfillmentOrderRow = {
  id: string;
  order_id: string;
  project_id: string;
  shipping_option_id: string | null;
  commission_xof: number;
  status: JokoFulfillmentStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function tableMissing(message: string | undefined): boolean {
  return Boolean(message?.includes("does not exist") || message?.includes("schema cache"));
}

/**
 * Best-effort: called after a shop order is successfully inserted, only when
 * the chosen shipping option is fulfillment_type = 'joko_fulfillment'. Never
 * throws — an order that was already paid for must not be rolled back
 * because this bookkeeping insert failed; the gap is instead visible as a
 * missing ops-queue row an admin can reconcile by hand.
 */
export async function recordJokoFulfillmentOrder(
  admin: SupabaseClient,
  opts: {
    orderId: string;
    projectId: string;
    shippingOptionId: string;
    commissionXof: number;
  },
): Promise<void> {
  try {
    const { error } = await admin.from("shop_fulfillment_orders").insert({
      order_id: opts.orderId,
      project_id: opts.projectId,
      shipping_option_id: opts.shippingOptionId,
      commission_xof: Math.max(0, Math.round(opts.commissionXof)),
    });
    if (error && !tableMissing(error.message)) {
      console.warn(JSON.stringify({ event: "joko_fulfillment.record_failed", orderId: opts.orderId, error: error.message }));
    }
  } catch {
    /* best-effort — see function doc */
  }
}

/**
 * Admin ops queue: every fulfillment order that might still need an action —
 * includes 'delivered' (a customer could still return it) but excludes the true
 * terminal states (failed_delivery/returned/cancelled), which need no more
 * admin attention once reached. Oldest first.
 */
export async function listOpenFulfillmentOrders(
  admin: SupabaseClient,
): Promise<
  | { ok: true; items: (FulfillmentOrderRow & { order_number: string | null; customer_name: string | null })[] }
  | { ok: false; error: string }
> {
  const { data, error } = await admin
    .from("shop_fulfillment_orders")
    .select(
      "id, order_id, project_id, shipping_option_id, commission_xof, status, note, created_at, updated_at, shop_orders(order_number, customer_name)",
    )
    .in("status", ["awaiting_pickup", "picked_up", "in_transit", "delivered"])
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) {
    if (tableMissing(error.message)) return { ok: true, items: [] };
    return { ok: false, error: error.message };
  }
  const items = (data ?? []).map((row) => {
    const joined = row as unknown as FulfillmentOrderRow & {
      shop_orders: { order_number: string | null; customer_name: string | null } | null;
    };
    return {
      ...joined,
      order_number: joined.shop_orders?.order_number ?? null,
      customer_name: joined.shop_orders?.customer_name ?? null,
    };
  });
  return { ok: true, items };
}

/** Admin-only status transition — the real-world step a Kebu ops person just completed by hand. */
export async function transitionFulfillmentStatus(
  admin: SupabaseClient,
  opts: { id: string; status: JokoFulfillmentStatus; updatedBy: string | null; note?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!JOKO_FULFILLMENT_STATUSES.includes(opts.status)) {
    return { ok: false, error: "Invalid fulfillment status." };
  }
  const patch: Record<string, unknown> = { status: opts.status, updated_by: opts.updatedBy };
  if (opts.note !== undefined) patch.note = opts.note?.slice(0, 500) ?? null;
  const { error } = await admin.from("shop_fulfillment_orders").update(patch).eq("id", opts.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Seller-facing, read-only: fulfillment status for their own orders (RLS-scoped select only). */
export async function listFulfillmentOrdersForProject(
  db: SupabaseClient,
  projectId: string,
): Promise<FulfillmentOrderRow[]> {
  const { data, error } = await db
    .from("shop_fulfillment_orders")
    .select("id, order_id, project_id, shipping_option_id, commission_xof, status, note, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    if (tableMissing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as FulfillmentOrderRow[];
}
