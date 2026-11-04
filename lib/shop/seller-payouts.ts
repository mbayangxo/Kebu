import type { SupabaseClient } from "@supabase/supabase-js";

/** Rails whose money actually lands in a Kebu-controlled account (lib/payments/registry.ts). */
export const SHOP_KEBU_CONTROLLED_RAILS = ["paystack", "wave", "orange_money", "paypal", "joko"] as const;

export const SHOP_PAYOUT_METHODS = ["wave", "orange_money", "bank_transfer", "manual"] as const;
export type ShopPayoutMethod = (typeof SHOP_PAYOUT_METHODS)[number];

export type ShopSellerBalance = {
  collectedXof: number;
  /** Joko Fulfillment commission already deducted from availableXof — see migration 20261104030000. */
  fulfillmentCommissionXof: number;
  requestedOrPaidXof: number;
  availableXof: number;
};

export type ShopPayoutRequestRow = {
  id: string;
  project_id: string;
  requested_by: string | null;
  amount_xof: number;
  method: ShopPayoutMethod;
  destination_phone: string;
  destination_account_name: string;
  status: "requested" | "processing" | "paid" | "failed" | "cancelled";
  provider_reference: string | null;
  failure_reason: string | null;
  note: string | null;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
};

function tableMissing(message: string | undefined): boolean {
  return Boolean(message?.includes("does not exist") || message?.includes("schema cache"));
}

/**
 * Read-only balance snapshot for a Shop project — always computed fresh from the payment
 * ledger + payout history (see migration 20261103180000), never from a cached column.
 */
export async function getShopSellerBalance(
  db: SupabaseClient,
  projectId: string,
): Promise<{ ok: true; balance: ShopSellerBalance } | { ok: false; status: number; error: string }> {
  const { data, error } = await db.rpc("shop_seller_balance", { p_project_id: projectId });
  if (error) {
    if (tableMissing(error.message)) {
      return { ok: false, status: 503, error: "Payout ledger not available yet — apply the latest migration." };
    }
    return { ok: false, status: 500, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      ok: true,
      balance: { collectedXof: 0, fulfillmentCommissionXof: 0, requestedOrPaidXof: 0, availableXof: 0 },
    };
  }
  return {
    ok: true,
    balance: {
      collectedXof: Number(row.collected_xof ?? 0),
      fulfillmentCommissionXof: Number(row.fulfillment_commission_xof ?? 0),
      requestedOrPaidXof: Number(row.requested_or_paid_xof ?? 0),
      availableXof: Number(row.available_xof ?? 0),
    },
  };
}

export async function listShopPayoutRequests(
  db: SupabaseClient,
  projectId: string,
): Promise<{ ok: true; items: ShopPayoutRequestRow[] } | { ok: false; status: number; error: string }> {
  const { data, error } = await db
    .from("shop_payout_requests")
    .select("*")
    .eq("project_id", projectId)
    .order("requested_at", { ascending: false })
    .limit(100);
  if (error) {
    if (tableMissing(error.message)) return { ok: true, items: [] };
    return { ok: false, status: 500, error: error.message };
  }
  return { ok: true, items: (data ?? []) as ShopPayoutRequestRow[] };
}

/**
 * Request a payout of a Shop seller's available Kebu balance. Must be called with a
 * service-role client, after the caller has already verified project access (same
 * trust boundary as complete_shop_payment) — this function trusts p_project_id /
 * p_requested_by because the RPC itself is service_role-only (see migration).
 */
export async function requestShopPayout(
  admin: SupabaseClient,
  opts: {
    projectId: string;
    requestedBy: string;
    amountXof: number;
    method: ShopPayoutMethod;
    destinationPhone: string;
    destinationAccountName: string;
  },
): Promise<{ ok: true; request: ShopPayoutRequestRow } | { ok: false; status: number; error: string }> {
  const { data, error } = await admin.rpc("request_shop_payout", {
    p_project_id: opts.projectId,
    p_requested_by: opts.requestedBy,
    p_amount_xof: Math.round(opts.amountXof),
    p_method: opts.method,
    p_destination_phone: opts.destinationPhone,
    p_destination_account_name: opts.destinationAccountName,
  });
  if (error) {
    if (tableMissing(error.message)) {
      return { ok: false, status: 503, error: "Payout ledger not available yet — apply the latest migration." };
    }
    if (/exceeds available balance/i.test(error.message)) {
      return { ok: false, status: 400, error: error.message.replace(/^.*?:\s*/, "") };
    }
    return { ok: false, status: 400, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, status: 500, error: "Payout request could not be created." };
  return { ok: true, request: row as ShopPayoutRequestRow };
}

// --- Admin (service-role client; caller must already have verified admin access) ---

export async function listPendingShopPayouts(
  admin: SupabaseClient,
): Promise<
  | { ok: true; items: (ShopPayoutRequestRow & { projectTitle: string | null })[] }
  | { ok: false; status: number; error: string }
> {
  const { data, error } = await admin
    .from("shop_payout_requests")
    .select("*, projects(title)")
    .in("status", ["requested", "processing"])
    .order("requested_at", { ascending: true });
  if (error) return { ok: false, status: 500, error: error.message };
  const items = (data ?? []).map((row) => {
    const r = row as ShopPayoutRequestRow & { projects?: { title?: string } | { title?: string }[] | null };
    const p = r.projects;
    const title = Array.isArray(p) ? p[0]?.title : p?.title;
    return { ...r, projectTitle: title ?? null };
  });
  return { ok: true, items };
}

/** Honest manual path: an admin actually sent the money (Wave/Orange Money/bank) outside the app and records it here. */
export async function markShopPayoutPaid(
  admin: SupabaseClient,
  payoutId: string,
  adminUserId: string | null,
  note?: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data, error } = await admin
    .from("shop_payout_requests")
    .update({
      status: "paid",
      processed_at: new Date().toISOString(),
      processed_by: adminUserId,
      note: note?.trim().slice(0, 500) || null,
    })
    .eq("id", payoutId)
    .in("status", ["requested", "processing"])
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: false, status: 409, error: "Payout already processed or not found." };
  return { ok: true };
}

export async function markShopPayoutFailed(
  admin: SupabaseClient,
  payoutId: string,
  adminUserId: string | null,
  reason: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data, error } = await admin
    .from("shop_payout_requests")
    .update({
      status: "failed",
      processed_at: new Date().toISOString(),
      processed_by: adminUserId,
      failure_reason: reason.trim().slice(0, 500),
    })
    .eq("id", payoutId)
    .in("status", ["requested", "processing"])
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: false, status: 409, error: "Payout already processed or not found." };
  return { ok: true };
}
