import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/api-guard";
import { createClient } from "@supabase/supabase-js";
import {
  formatSubscriptionPriceLabel,
  nextBillingDate,
  subscriptionOrderNote,
} from "@/lib/shop/subscriptions";
import { recordPlatformCronRun } from "@/lib/platform/cron-runs";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * C8 — due shop subscriptions: create a pending renewal order and advance next_billing_at.
 * Honest Africa path: does NOT auto-charge cards. Merchant collects via WhatsApp / Wave / JOKO.
 * Set CRON_SECRET and call daily (same pattern as billing-monthly).
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase service credentials missing." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const nowIso = new Date().toISOString();
  const startedAt = new Date();

  const { data: due, error } = await supabase
    .from("shop_subscriptions")
    .select(
      "id, project_id, product_id, customer_name, customer_phone, customer_email, interval, price_xof, next_billing_at",
    )
    .eq("status", "active")
    .lte("next_billing_at", nowIso)
    .order("next_billing_at", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Apply migration 066_remaining_slices.sql."
          : error.message,
      },
      { status: 500 },
    );
  }

  let renewed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of due ?? []) {
    const { data: product } = await supabase
      .from("project_products")
      .select("id, name, is_active")
      .eq("id", row.product_id)
      .maybeSingle();

    if (!product?.is_active) {
      failed += 1;
      errors.push(`${row.id}: product inactive or missing`);
      continue;
    }

    const priceLabel = formatSubscriptionPriceLabel(row.price_xof, row.interval);
    const note = subscriptionOrderNote("renewal", row.interval);

    const { error: orderError } = await supabase.from("shop_orders").insert({
      project_id: row.project_id,
      product_id: row.product_id,
      product_name: product.name,
      price_label: priceLabel,
      quantity: 1,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      customer_note: note,
      customer_email: row.customer_email,
      payment_preference: "whatsapp",
      status: "pending",
      channel: "whatsapp",
    });

    if (orderError) {
      failed += 1;
      errors.push(`${row.id}: ${orderError.message}`);
      continue;
    }

    const nextAt = nextBillingDate(row.interval, new Date(row.next_billing_at ?? nowIso));
    const { error: advError } = await supabase
      .from("shop_subscriptions")
      .update({ next_billing_at: nextAt, updated_at: nowIso })
      .eq("id", row.id)
      .eq("status", "active");

    if (advError) {
      failed += 1;
      errors.push(`${row.id}: advance ${advError.message}`);
      continue;
    }

    renewed += 1;
  }

  const summary = {
    ok: true,
    due: due?.length ?? 0,
    renewed,
    failed,
    errors: errors.slice(0, 20),
    checkedAt: nowIso,
  };
  await recordPlatformCronRun(supabase, {
    jobName: "shop-subscriptions",
    status: failed > 0 ? (renewed === 0 ? "error" : "partial") : "ok",
    startedAt,
    summary,
    errorMessage: failed > 0 ? errors.slice(0, 3).join("; ") : null,
  });
  return NextResponse.json(summary);
}
