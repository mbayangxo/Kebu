import type { SupabaseClient } from "@supabase/supabase-js";
import { getPaymentAdapter } from "@/lib/payments/registry";

export type RequestRefundOpts = {
  orderId: string;
  idempotencyKey: string;
  amountXof: number;
};

/**
 * Create a refund row via atomic RPC (validates cap, idempotent).
 * Does not call the PSP — that happens in processRefund via the job queue.
 */
export async function requestRefund(
  admin: SupabaseClient,
  opts: RequestRefundOpts,
): Promise<{ ok: true; refundId: string; alreadyExists: boolean } | { ok: false; error: string }> {
  const { data, error } = await admin.rpc("create_shop_refund", {
    p_order_id: opts.orderId,
    p_idempotency_key: opts.idempotencyKey,
    p_amount_xof: opts.amountXof,
  });
  if (error) return { ok: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.refund_id) return { ok: false, error: "create_shop_refund returned no row" };
  return { ok: true, refundId: row.refund_id, alreadyExists: !!row.already_exists };
}

export type ProcessRefundResult =
  | { ok: true; providerRefundId: string }
  | { ok: false; error: string; retryable: boolean };

/**
 * Idempotent refund processor — calls the PSP and commits the result.
 * Called by the platform worker for job type "payment.refund".
 */
export async function processRefund(
  admin: SupabaseClient,
  refundId: string,
): Promise<ProcessRefundResult> {
  const { data: refund, error: fetchErr } = await admin
    .from("shop_refunds")
    .select("id, order_id, provider, provider_capture_reference, requested_amount_xof, currency, status, provider_refund_id, attempts, max_attempts, idempotency_key")
    .eq("id", refundId)
    .maybeSingle();

  if (fetchErr || !refund) return { ok: false, error: "Refund not found", retryable: false };

  // Idempotent: already done.
  if (refund.status === "succeeded") {
    return { ok: true, providerRefundId: refund.provider_refund_id ?? refundId };
  }
  if (refund.status === "failed") {
    return { ok: false, error: "Refund previously failed", retryable: false };
  }

  // PSP already confirmed; only the DB write is missing — skip the PSP call.
  if (refund.status === "reconciling") {
    if (!refund.provider_refund_id) {
      return { ok: false, error: "Reconciling refund has no provider_refund_id", retryable: false };
    }
    const { data: commitData, error: commitErr } = await admin.rpc("complete_shop_refund", {
      p_refund_id: refundId,
      p_provider_refund_id: refund.provider_refund_id,
    });
    if (commitErr) {
      return { ok: false, error: `Reconcile DB commit failed: ${commitErr.message}`, retryable: true };
    }
    const commitRow = Array.isArray(commitData) ? commitData[0] : commitData;
    if (!commitRow?.ok) {
      return { ok: false, error: `complete_shop_refund returned not-ok: ${commitRow?.reason ?? "unknown"}`, retryable: false };
    }
    return { ok: true, providerRefundId: refund.provider_refund_id };
  }

  // Check attempt ceiling.
  if (refund.attempts >= refund.max_attempts) {
    await admin.from("shop_refunds").update({ status: "failed", failure_reason: "max_attempts_exceeded" }).eq("id", refundId);
    return { ok: false, error: "Max refund attempts exceeded", retryable: false };
  }

  await admin.from("shop_refunds").update({ status: "processing", attempts: refund.attempts + 1 }).eq("id", refundId);

  const adapter = getPaymentAdapter(refund.provider);
  if (!adapter?.refund) {
    await admin.from("shop_refunds").update({ status: "failed", failure_reason: "adapter_no_refund_support" }).eq("id", refundId);
    return { ok: false, error: `Provider ${refund.provider} does not support refunds`, retryable: false };
  }

  const result = await adapter.refund({
    providerPaymentId: refund.provider_capture_reference ?? "",
    amountMinor: refund.requested_amount_xof,
    currency: refund.currency ?? "XOF",
    idempotencyKey: refund.idempotency_key,
  });

  if (!result.ok) {
    const newStatus = result.retryable ? "pending" : "failed";
    await admin.from("shop_refunds").update({ status: newStatus, failure_reason: result.error }).eq("id", refundId);
    return { ok: false, error: result.error, retryable: result.retryable };
  }

  // Commit via atomic RPC (writes ledger event inside the same transaction).
  const { data: commitData, error: commitErr } = await admin.rpc("complete_shop_refund", {
    p_refund_id: refundId,
    p_provider_refund_id: result.providerRefundId,
  });
  if (commitErr) {
    // PSP succeeded but DB write failed — mark reconciling for background retry.
    await admin.from("shop_refunds").update({
      status: "reconciling",
      provider_refund_id: result.providerRefundId,
      failure_reason: commitErr.message,
    }).eq("id", refundId);
    return { ok: false, error: `PSP refund succeeded but DB commit failed: ${commitErr.message}`, retryable: true };
  }

  const commitRow = Array.isArray(commitData) ? commitData[0] : commitData;
  if (!commitRow?.ok) {
    return { ok: false, error: `complete_shop_refund returned not-ok: ${commitRow?.reason}`, retryable: false };
  }

  return { ok: true, providerRefundId: result.providerRefundId };
}

/**
 * Restock products for a refunded order. Idempotent — checks restock_status first.
 * Called after processRefund succeeds.
 */
export async function restockFromRefund(
  admin: SupabaseClient,
  refundId: string,
): Promise<{ ok: boolean; reason: string }> {
  const { data: refund, error } = await admin
    .from("shop_refunds")
    .select("id, order_id, restock_status, status")
    .eq("id", refundId)
    .maybeSingle();

  if (error || !refund) return { ok: false, reason: "refund_not_found" };
  if (refund.restock_status === "restocked") return { ok: true, reason: "already_restocked" };
  if (refund.restock_status === "skipped") return { ok: true, reason: "skipped" };
  if (refund.status !== "succeeded") return { ok: false, reason: "refund_not_succeeded" };

  // Get order items to determine what to restock.
  const { data: items } = await admin
    .from("shop_order_items")
    .select("product_id, quantity")
    .eq("order_id", refund.order_id);

  if (items && items.length > 0) {
    for (const item of items) {
      if (!item.product_id) continue;
      await admin.rpc("restore_product_stock_atomic", {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });
    }
  }

  await admin.from("shop_refunds").update({ restock_status: "restocked" }).eq("id", refundId);
  return { ok: true, reason: "restocked" };
}
