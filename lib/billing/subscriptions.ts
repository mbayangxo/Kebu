import type { SupabaseClient } from "@supabase/supabase-js";
import { isBillingExemptEmail } from "./exempt";
import {
  amountCentsForTierSubscription,
  getKebuPlan,
  parseKebuPlanId,
  planRequiresPayment,
  type KebuPlanId,
} from "./pricing";

/** Billing interval (charge cadence). */
export type HostingPlan = "monthly" | "yearly";

export type SiteSubscriptionRow = {
  id: string;
  project_id: string;
  owner_id: string;
  status: string;
  amount_usd_cents: number;
  period_start: string | null;
  period_end: string | null;
  joko_reference: string | null;
  joko_payment_id?: string | null;
  /** @deprecated Use billing_interval — kept for older rows. */
  plan?: HostingPlan | null;
  billing_interval?: HostingPlan | null;
  tier?: KebuPlanId | null;
  autopay_enabled?: boolean | null;
  next_billing_at?: string | null;
  pending_checkout_url?: string | null;
  last_renewal_attempt_at?: string | null;
};

const SUB_SELECT =
  "id, project_id, owner_id, status, amount_usd_cents, period_start, period_end, joko_reference, joko_payment_id, plan, billing_interval, tier, autopay_enabled, next_billing_at, pending_checkout_url, last_renewal_attempt_at";

export function billingDevBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.JOKO_BILLING_DEV_BYPASS === "true";
}

export function subscriptionTierId(row: SiteSubscriptionRow | null | undefined): KebuPlanId {
  return parseKebuPlanId(row?.tier ?? "free");
}

export function subscriptionInterval(row: SiteSubscriptionRow | null | undefined): HostingPlan {
  return parseHostingPlan(row?.billing_interval ?? row?.plan);
}

export async function getActiveSiteSubscription(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
): Promise<SiteSubscriptionRow | null> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("site_subscriptions")
    .select(SUB_SELECT)
    .eq("project_id", projectId)
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .gt("period_end", now)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

/** Latest subscription row for a project (any status) — for renew / autopay UI. */
export async function getLatestSiteSubscription(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
): Promise<SiteSubscriptionRow | null> {
  const { data } = await supabase
    .from("site_subscriptions")
    .select(SUB_SELECT)
    .eq("project_id", projectId)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/**
 * Free tier: long-lived active row (no JOKO). Paid tiers: active paid period.
 * Ensures the founder can publish on Free without a card.
 * Requires migration 038 so RLS allows active free inserts (010 only allowed pending).
 */
export function freeHostingEntitlementInsert(
  projectId: string,
  ownerId: string,
  now = new Date(),
): Record<string, unknown> {
  const far = new Date(now);
  far.setUTCFullYear(far.getUTCFullYear() + 10);
  return {
    project_id: projectId,
    owner_id: ownerId,
    status: "active",
    tier: "free",
    plan: "monthly",
    billing_interval: "monthly",
    amount_usd_cents: 0,
    period_start: now.toISOString(),
    period_end: far.toISOString(),
    next_billing_at: null,
    autopay_enabled: false,
    joko_reference: `kebu-free-${projectId.slice(0, 8)}`,
  };
}

export async function ensureFreeHostingEntitlement(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
): Promise<SiteSubscriptionRow | null> {
  const active = await getActiveSiteSubscription(supabase, projectId, ownerId);
  if (active) {
    await restoreSuspendedDeploymentsForProject(supabase, projectId);
    return active;
  }

  const { data, error } = await supabase
    .from("site_subscriptions")
    .insert(freeHostingEntitlementInsert(projectId, ownerId))
    .select(SUB_SELECT)
    .single();

  if (error) {
    // Unique race or missing columns — re-read.
    const again = await getActiveSiteSubscription(supabase, projectId, ownerId);
    if (again) {
      await restoreSuspendedDeploymentsForProject(supabase, projectId);
      return again;
    }
    return null;
  }

  await restoreSuspendedDeploymentsForProject(supabase, projectId);
  return data;
}

export async function projectHasLiveHosting(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
  ownerEmail?: string | null,
): Promise<boolean> {
  if (billingDevBypassEnabled()) return true;
  if (isBillingExemptEmail(ownerEmail)) return true;
  const active = await getActiveSiteSubscription(supabase, projectId, ownerId);
  if (active) return true;
  // Free is allowed: provision entitlement on demand.
  const free = await ensureFreeHostingEntitlement(supabase, projectId, ownerId);
  return Boolean(free);
}

/** Public / cron: hosting still valid (paid, free, or exempt). */
export async function projectHostingIsPaid(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ paid: boolean; exempt: boolean; reason: string; tier?: KebuPlanId }> {
  if (billingDevBypassEnabled()) {
    return { paid: true, exempt: true, reason: "dev_bypass", tier: "pro" };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { paid: false, exempt: false, reason: "project_missing" };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("email")
    .eq("id", project.owner_id)
    .maybeSingle();

  if (isBillingExemptEmail(profile?.email)) {
    return { paid: true, exempt: true, reason: "billing_exempt", tier: "pro" };
  }

  const now = new Date().toISOString();
  const { data: active } = await supabase
    .from("site_subscriptions")
    .select(SUB_SELECT)
    .eq("project_id", projectId)
    .eq("status", "active")
    .gt("period_end", now)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) {
    return {
      paid: true,
      exempt: false,
      reason: active.tier === "free" ? "free_tier" : "active_subscription",
      tier: subscriptionTierId(active),
    };
  }
  return { paid: false, exempt: false, reason: "unpaid_or_expired" };
}

export async function countOwnerWebsites(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<number> {
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("project_type", "website");
  return count ?? 0;
}

export async function ownerEffectiveTier(
  supabase: SupabaseClient,
  ownerId: string,
  ownerEmail?: string | null,
): Promise<KebuPlanId> {
  if (isBillingExemptEmail(ownerEmail)) return "pro";
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("site_subscriptions")
    .select("tier, period_end, status")
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .gt("period_end", now)
    .order("amount_usd_cents", { ascending: false })
    .limit(1)
    .maybeSingle();
  return parseKebuPlanId(data?.tier ?? "free");
}

export async function userOwnsTemplate(
  supabase: SupabaseClient,
  ownerId: string,
  templateSlug: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("template_purchases")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("template_slug", templateSlug)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export async function templateRequiresPurchase(
  supabase: SupabaseClient,
  templateSlug: string,
): Promise<{ required: boolean; priceUsdCents: number }> {
  const { data } = await supabase
    .from("site_templates")
    .select("price_usd_cents, requires_purchase")
    .eq("slug", templateSlug)
    .maybeSingle();

  if (!data) return { required: false, priceUsdCents: 0 };
  const priceUsdCents = data.price_usd_cents ?? 0;
  const required = Boolean(data.requires_purchase) && priceUsdCents > 0;
  return { required, priceUsdCents };
}

export function subscriptionPeriodEnd(from = new Date(), plan: HostingPlan = "monthly"): string {
  const end = new Date(from);
  if (plan === "yearly") {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  } else {
    end.setUTCDate(end.getUTCDate() + 30);
  }
  return end.toISOString();
}

export function defaultHostingAmountCents(
  interval: HostingPlan = "monthly",
  tier: KebuPlanId = "shop",
): number {
  if (!planRequiresPayment(tier)) return 0;
  return amountCentsForTierSubscription(tier, interval);
}

export function parseHostingPlan(raw: unknown): HostingPlan {
  return raw === "yearly" ? "yearly" : "monthly";
}

/** Days before period_end when we start renewal / autopay attempts. */
export const AUTOPAY_LEAD_DAYS = 5;

export function isWithinAutopayWindow(periodEndIso: string | null | undefined, now = new Date()): boolean {
  if (!periodEndIso) return false;
  const end = new Date(periodEndIso).getTime();
  if (!Number.isFinite(end)) return false;
  const leadMs = AUTOPAY_LEAD_DAYS * 24 * 60 * 60 * 1000;
  return end - now.getTime() <= leadMs;
}

/** After successful payment: activate or extend the paid window from remaining time. */
export function extendPeriodEnd(
  currentEnd: string | null | undefined,
  plan: HostingPlan,
  now = new Date(),
): string {
  const cur = currentEnd ? new Date(currentEnd) : null;
  const from = cur && cur.getTime() > now.getTime() ? cur : now;
  return subscriptionPeriodEnd(from, plan);
}

export async function suspendLiveDeploymentsForProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<number> {
  const { data } = await supabase
    .from("deployments")
    .update({ status: "suspended" })
    .eq("project_id", projectId)
    .eq("status", "live")
    .select("id");
  return data?.length ?? 0;
}

export async function restoreSuspendedDeploymentsForProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<number> {
  const { data } = await supabase
    .from("deployments")
    .update({ status: "live" })
    .eq("project_id", projectId)
    .eq("status", "suspended")
    .select("id");
  return data?.length ?? 0;
}

export function describeTierForCheckout(tier: KebuPlanId): string {
  const p = getKebuPlan(tier);
  return `${p.name} — ${p.tagline}`;
}
