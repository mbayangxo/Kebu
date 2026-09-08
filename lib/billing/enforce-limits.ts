import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getKebuPlan,
  tierAllowsCustomDomain,
  tierAllowsStore,
  type KebuPlanId,
} from "@/lib/billing/plans";
import { getActiveSiteSubscription, subscriptionTierId } from "@/lib/billing/subscriptions";

export type PlanLimitKey = "customDomain" | "store" | "maxProducts";

export type PlanLimitResult =
  | { ok: true; tier: KebuPlanId }
  | { ok: false; tier: KebuPlanId; error: string; upgradeHint: string };

export async function resolveProjectTier(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
): Promise<KebuPlanId> {
  const sub = await getActiveSiteSubscription(supabase, projectId, ownerId);
  return subscriptionTierId(sub);
}

export async function assertProjectPlanLimit(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
  limit: PlanLimitKey,
): Promise<PlanLimitResult> {
  const tier = await resolveProjectTier(supabase, projectId, ownerId);
  const plan = getKebuPlan(tier);

  if (limit === "customDomain" && !tierAllowsCustomDomain(tier)) {
    return {
      ok: false,
      tier,
      error: "Custom domains require Kebu Starter ($2/mo) or higher.",
      upgradeHint: "Upgrade in Site billing, then connect your domain.",
    };
  }

  if (limit === "store" && !tierAllowsStore(tier)) {
    return {
      ok: false,
      tier,
      error: "Online store requires the Kebu Shop plan ($5/mo) or higher.",
      upgradeHint: "Upgrade to Shop to sell products on your site.",
    };
  }

  if (limit === "maxProducts") {
    if (!tierAllowsStore(tier)) {
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
