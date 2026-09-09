import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireCronSecret } from "@/lib/api-guard";
import { createClient } from "@supabase/supabase-js";
import { activateSiteSubscriptionPayment } from "@/lib/billing/activate-site-subscription";
import {
  defaultHostingAmountCents,
  isWithinAutopayWindow,
  parseHostingPlan,
  suspendLiveDeploymentsForProject,
  type SiteSubscriptionRow,
} from "@/lib/billing/subscriptions";
import { isBillingExemptEmail } from "@/lib/billing/exempt";
import { recordPlatformCronRun } from "@/lib/platform/cron-runs";
import { createJokoAutopayCharge } from "@/lib/joko/payments";
import { parseKebuPlanId, planLabel } from "@/lib/billing/pricing";
import { sendCampaignEmail } from "@/lib/email/send-campaign";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily billing job:
 * 1) Expire unpaid periods + suspend live deployments
 * 2) For autopay sites near period end, create JOKO charge / checkout link
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase service credentials missing." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const nowIso = now.toISOString();
  const startedAt = now;

  let expired = 0;
  let suspended = 0;
  let autopayCheckout = 0;
  let autopayCharged = 0;
  let autopaySkippedExempt = 0;

  // Mark active rows past period_end as expired and take sites offline.
  const { data: lapsed } = await supabase
    .from("site_subscriptions")
    .select("id, project_id, owner_id, tier")
    .eq("status", "active")
    .lt("period_end", nowIso)
    .neq("tier", "free")
    .limit(200);

  for (const row of lapsed ?? []) {
    await supabase
      .from("site_subscriptions")
      .update({ status: "expired", updated_at: nowIso })
      .eq("id", row.id);
    expired += 1;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("id", row.owner_id)
      .maybeSingle();

    if (isBillingExemptEmail(profile?.email)) {
      autopaySkippedExempt += 1;
      continue;
    }

    suspended += await suspendLiveDeploymentsForProject(supabase, row.project_id);
  }

  // Autopay renewals for paid opted-in sites (never free).
  const { data: autopayRows } = await supabase
    .from("site_subscriptions")
    .select(
      "id, project_id, owner_id, status, amount_usd_cents, period_end, plan, billing_interval, tier, autopay_enabled, joko_payment_id, last_renewal_attempt_at",
    )
    .eq("autopay_enabled", true)
    .neq("tier", "free")
    .in("status", ["active", "past_due", "expired"])
    .order("period_end", { ascending: true })
    .limit(100);

  for (const row of autopayRows ?? []) {
    const sub = row as SiteSubscriptionRow;
    if (!isWithinAutopayWindow(sub.period_end, now) && sub.status === "active") continue;

    if (sub.last_renewal_attempt_at) {
      const last = new Date(sub.last_renewal_attempt_at).getTime();
      if (Date.now() - last < 20 * 60 * 60 * 1000) continue; // at most once / ~day
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("id", sub.owner_id)
      .maybeSingle();

    if (isBillingExemptEmail(profile?.email)) {
      autopaySkippedExempt += 1;
      continue;
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id, title")
      .eq("id", sub.project_id)
      .maybeSingle();
    if (!project) continue;

    const plan = parseHostingPlan(sub.billing_interval ?? sub.plan);
    const tier = parseKebuPlanId(sub.tier ?? "shop");
    const amountUsdCents = sub.amount_usd_cents || defaultHostingAmountCents(plan, tier);
    const reference = `kebu-auto-${sub.project_id.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
    const label = planLabel(tier);

    const { data: pending, error: insertErr } = await supabase
      .from("site_subscriptions")
      .insert({
        project_id: sub.project_id,
        owner_id: sub.owner_id,
        status: "pending",
        tier,
        plan,
        billing_interval: plan,
        amount_usd_cents: amountUsdCents,
        joko_reference: reference,
        autopay_enabled: true,
        autopay_consent_at: nowIso,
      })
      .select("id")
      .single();

    if (insertErr || !pending) continue;

    const charge = await createJokoAutopayCharge({
      reference,
      amountUsdCents,
      description: `${label} autopay — ${project.title}`,
      customerEmail: profile?.email ?? undefined,
      previousPaymentId: sub.joko_payment_id,
      returnUrl: `${appUrl}/create/${sub.project_id}?billing=success`,
      cancelUrl: `${appUrl}/create/${sub.project_id}?billing=cancelled`,
      webhookUrl: `${appUrl}/api/webhooks/joko`,
      metadata: {
        kind: "site_subscription",
        project_id: sub.project_id,
        subscription_id: pending.id,
        owner_id: sub.owner_id,
        plan,
        tier,
        renew: "true",
        autopay: "true",
        previous_subscription_id: sub.id,
      },
    });

    await supabase
      .from("site_subscriptions")
      .update({ last_renewal_attempt_at: nowIso, updated_at: nowIso })
      .eq("id", sub.id);

    if (!charge.ok) {
      await supabase
        .from("site_subscriptions")
        .update({ status: "cancelled", updated_at: nowIso })
        .eq("id", pending.id);
      if (sub.status === "active" && sub.period_end && new Date(sub.period_end) < now) {
        await supabase
          .from("site_subscriptions")
          .update({ status: "past_due", updated_at: nowIso })
          .eq("id", sub.id);
      }
      const ownerEmail = profile?.email?.trim();
      const from =
        process.env.RESEND_FROM_EMAIL?.trim() ||
        process.env.NOTIFY_FROM_EMAIL?.trim() ||
        process.env.EMAIL_FROM?.trim();
      if (ownerEmail && process.env.RESEND_API_KEY && from) {
        const renewUrl = `${appUrl}/create/${sub.project_id}?billing=renew`;
        void sendCampaignEmail({
          to: ownerEmail,
          from,
          fromName: "Kebu",
          subject: `Hosting renew needs attention — ${project.title}`,
          text: `Autopay could not renew hosting for ${project.title}. Pay here: ${renewUrl}`,
          html: `<p>Autopay could not renew hosting for <strong>${project.title}</strong>.</p><p><a href="${renewUrl}">Renew hosting</a></p>`,
        }).catch(() => undefined);
      }
      continue;
    }

    if (charge.mode === "charged") {
      autopayCharged += 1;
      // Activate immediately so renew does not stall if webhook is delayed.
      const activated = await activateSiteSubscriptionPayment(supabase, {
        subscriptionId: pending.id,
        paymentId: charge.paymentId,
        previousSubscriptionId: sub.id,
        planHint: plan,
        tierHint: tier,
        now,
      });
      if (!activated.ok) {
        await supabase
          .from("site_subscriptions")
          .update({
            joko_payment_id: charge.paymentId,
            pending_checkout_url: null,
            updated_at: nowIso,
          })
          .eq("id", pending.id);
      }
    } else {
      autopayCheckout += 1;
      await supabase
        .from("site_subscriptions")
        .update({
          joko_payment_id: charge.paymentId,
          pending_checkout_url: charge.paymentUrl,
          updated_at: nowIso,
        })
        .eq("id", pending.id);
      await supabase
        .from("site_subscriptions")
        .update({
          status: sub.status === "active" ? "past_due" : sub.status,
          pending_checkout_url: charge.paymentUrl,
          updated_at: nowIso,
        })
        .eq("id", sub.id);
    }
  }

  const summary = {
    ok: true,
    checkedAt: nowIso,
    expired,
    suspendedDeployments: suspended,
    autopayCheckout,
    autopayCharged,
    autopaySkippedExempt,
  };
  await recordPlatformCronRun(supabase, {
    jobName: "billing-monthly",
    status: "ok",
    startedAt,
    summary,
  });
  return NextResponse.json(summary);
}
