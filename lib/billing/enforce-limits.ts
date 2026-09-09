import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getKebuPlan,
  KEBU_PLAN_ORDER,
  type KebuPlanId,
} from "@/lib/billing/plans";
import {
  getActiveSiteSubscription,
  subscriptionTierId,
  type SiteSubscriptionRow,
} from "@/lib/billing/subscriptions";

export type PlanLimitKey = "customDomain" | "store" | "maxProducts" | "maxWebsites";

export type PlanLimitResult =
  | { ok: true; tier: KebuPlanId }
  | { ok: false; tier: KebuPlanId; error: string; upgradeHint: string };

function tierRank(tier: KebuPlanId): number {
  return KEBU_PLAN_ORDER.indexOf(tier);
}

export function bestTierAmong(tiers: KebuPlanId[]): KebuPlanId {
  let best: KebuPlanId = "free";
  for (const t of tiers) {
    if (tierRank(t) > tierRank(best)) best = t;
  }
  return best;
}

export async function resolveProjectTier(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
): Promise<KebuPlanId> {
  const sub = await getActiveSiteSubscription(supabase, projectId, ownerId);
  return subscriptionTierId(sub);
}

/** Highest active hosting tier across the owner's sites (account capability). */
export async function resolveOwnerBestTier(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<KebuPlanId> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("site_subscriptions")
    .select("tier, status, period_end")
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .gt("period_end", now)
    .limit(50);

  const tiers = (data ?? []).map((r) => subscriptionTierId(r as SiteSubscriptionRow));
  return bestTierAmong(tiers.length ? tiers : ["free"]);
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

export async function assertOwnerWebsiteLimit(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<PlanLimitResult> {
  const tier = await resolveOwnerBestTier(supabase, ownerId);
  const plan = getKebuPlan(tier);
  const used = await countOwnerWebsites(supabase, ownerId);
  const max = plan.limits.maxWebsites;
  if (max > 0 && used >= max) {
    return {
      ok: false,
      tier,
      error: `Your ${plan.name} plan allows ${max} website${max === 1 ? "" : "s"}. You already have ${used}.`,
      upgradeHint:
        tier === "free" || tier === "starter" || tier === "shop"
          ? "Upgrade to Business ($10) for more websites, or Pro for teams."
          : "Upgrade to Pro for more websites.",
    };
  }
  return { ok: true, tier };
}

export async function assertProjectPlanLimit(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
  limit: PlanLimitKey,
): Promise<PlanLimitResult> {
  if (limit === "maxWebsites") {
    return assertOwnerWebsiteLimit(supabase, ownerId);
  }

  const tier = await resolveProjectTier(supabase, projectId, ownerId);
  const plan = getKebuPlan(tier);

  if (limit === "customDomain" && !plan.limits.customDomain) {
    return {
      ok: false,
      tier,
      error: "Custom domains require Kebu Starter ($2/mo) or higher.",
      upgradeHint: "Upgrade in Site billing, then connect your domain.",
    };
  }

  if (limit === "store" && !plan.limits.store) {
    return {
      ok: false,
      tier,
      error: "Online store requires the Kebu Shop plan ($5/mo) or higher.",
      upgradeHint: "Upgrade to Shop to sell products on your site.",
    };
  }

  if (limit === "maxProducts") {
    if (!plan.limits.store) {
      return {
        ok: false,
        tier,
        error: "Products require the Kebu Shop plan ($5/mo) or higher.",
        upgradeHint: "Upgrade to Shop to add products.",
      };
    }
    const { count } = await supabase
      .from("project_products")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    const max = plan.limits.maxProducts;
    if (max > 0 && (count ?? 0) >= max) {
      return {
        ok: false,
        tier,
        error: `Your ${plan.name} plan allows up to ${max} products.`,
        upgradeHint: "Upgrade to Business for a higher product limit.",
      };
    }
  }

  return { ok: true, tier };
}
