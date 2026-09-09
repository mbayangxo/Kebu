import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extendPeriodEnd,
  parseHostingPlan,
  restoreSuspendedDeploymentsForProject,
  type HostingPlan,
} from "@/lib/billing/subscriptions";
import { parseKebuPlanId, type KebuPlanId } from "@/lib/billing/pricing";

/**
 * Activate or renew a pending site_subscriptions row after JOKO reports paid.
 * Shared by webhook + billing-monthly cron (charged autopay without waiting on webhook).
 */
export async function activateSiteSubscriptionPayment(
  supabase: SupabaseClient,
  opts: {
    subscriptionId: string;
    paymentId?: string | null;
    previousSubscriptionId?: string | null;
    planHint?: HostingPlan;
    tierHint?: KebuPlanId;
    now?: Date;
  },
): Promise<{
  ok: true;
  projectId: string;
  periodEnd: string;
  restoredDeployments: number;
} | { ok: false; error: string }> {
  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();

  const { data: sub } = await supabase
    .from("site_subscriptions")
    .select("id, project_id, owner_id, status, period_end, plan, billing_interval, tier, autopay_enabled")
    .eq("id", opts.subscriptionId)
    .maybeSingle();

  if (!sub) return { ok: false, error: "Subscription not found." };

  const effectivePlan = parseHostingPlan(sub.billing_interval ?? sub.plan ?? opts.planHint);
  const effectiveTier = parseKebuPlanId(sub.tier ?? opts.tierHint ?? "shop");
  let baseEnd = sub.period_end as string | null;

  if (opts.previousSubscriptionId) {
    const { data: prev } = await supabase
      .from("site_subscriptions")
      .select("period_end, autopay_enabled")
      .eq("id", opts.previousSubscriptionId)
      .maybeSingle();
    if (prev?.period_end) baseEnd = prev.period_end;
    if (prev?.autopay_enabled) {
      await supabase
        .from("site_subscriptions")
        .update({ autopay_enabled: true, autopay_consent_at: nowIso })
        .eq("id", sub.id);
    }
    await supabase
      .from("site_subscriptions")
      .update({ status: "expired", updated_at: nowIso })
      .eq("id", opts.previousSubscriptionId)
      .eq("status", "active");
  }

  const periodEnd = extendPeriodEnd(baseEnd, effectivePlan, now);

  await supabase
    .from("site_subscriptions")
    .update({
      status: "active",
      plan: effectivePlan,
      billing_interval: effectivePlan,
      tier: effectiveTier,
      period_start: nowIso,
      period_end: periodEnd,
      next_billing_at: periodEnd,
      joko_payment_id: opts.paymentId ?? sub.id,
      pending_checkout_url: null,
      updated_at: nowIso,
    })
    .eq("id", sub.id);

  const restored = await restoreSuspendedDeploymentsForProject(supabase, sub.project_id);

  return {
    ok: true,
    projectId: sub.project_id,
    periodEnd,
    restoredDeployments: restored,
  };
}
