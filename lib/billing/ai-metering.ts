import type { SupabaseClient } from "@supabase/supabase-js";
import { getKebuPlan, type KebuPlanId } from "@/lib/billing/plans";
import { resolveOwnerBestTier } from "@/lib/billing/enforce-limits";
import { createServiceClient } from "@/lib/opportunity/admin";

export type AiMeterAction = "website_ai_generate" | "website_ai_improve" | "studio_generate";

export type AiMeterStatus = {
  tier: KebuPlanId;
  limit: number;
  used: number;
  remaining: number;
  periodStart: string;
};

function monthStartIso(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export async function getAiMeterStatus(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<AiMeterStatus | { error: string; status: number }> {
  const tier = await resolveOwnerBestTier(supabase, ownerId);
  const limit = getKebuPlan(tier).limits.aiGenerationsPerMonth;
  const periodStart = monthStartIso();

  const { count, error } = await supabase
    .from("account_ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .gte("created_at", periodStart);

  if (error) {
    const missing = error.message?.includes("does not exist");
    return {
      error: missing
        ? "AI usage table missing. Apply migration 081."
        : "Could not load AI usage.",
      status: missing ? 503 : 500,
    };
  }

  const used = count ?? 0;
  return {
    tier,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    periodStart,
  };
}

export async function assertAiGenerationAllowance(
  supabase: SupabaseClient,
  ownerId: string,
  reservation?: { action: AiMeterAction; projectId?: string },
): Promise<
  | { ok: true; meter: AiMeterStatus }
  | { ok: false; error: string; upgradeHint: string; meter?: AiMeterStatus; status: number }
> {
  const meter = await getAiMeterStatus(supabase, ownerId);
  if ("error" in meter) {
    return { ok: false, error: meter.error, upgradeHint: "", status: meter.status };
  }

  if (meter.limit > 0 && meter.used >= meter.limit) {
    return {
      ok: false,
      status: 402,
      meter,
      error: `You used all ${meter.limit} AI generations on your ${getKebuPlan(meter.tier).name} plan this month.`,
      upgradeHint: "Upgrade your plan for more AI, or wait until next month.",
    };
  }

  if (reservation) {
    const service = createServiceClient();
    if (!service) return { ok: false, status: 503, error: "AI metering is unavailable. Your work is kept.", upgradeHint: "" };
    const { data, error } = await service.rpc("reserve_account_ai_generation", {
      p_owner: ownerId,
      p_project: reservation.projectId ?? null,
      p_id: crypto.randomUUID(),
      p_limit: meter.limit,
      p_action: reservation.action,
    });
    if (error) return { ok: false, status: 503, error: "Could not reserve AI usage. No generation started.", upgradeHint: "" };
    if (data !== true) {
      return { ok: false, status: 402, meter, error: "Your monthly AI allowance is used. Wait until next month or review your plan.", upgradeHint: "Review your plan for more AI." };
    }
  }
  return { ok: true, meter };
}
