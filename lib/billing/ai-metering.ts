import type { SupabaseClient } from "@supabase/supabase-js";
import { getKebuPlan, type KebuPlanId } from "@/lib/billing/plans";
import { resolveOwnerBestTier } from "@/lib/billing/enforce-limits";

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

  return { ok: true, meter };
}

export async function recordAiGeneration(
  supabase: SupabaseClient,
  opts: {
    ownerId: string;
    action: AiMeterAction;
    projectId?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("account_ai_usage_events").insert({
    owner_id: opts.ownerId,
    action: opts.action,
    project_id: opts.projectId ?? null,
    meta: opts.meta ?? {},
  });

  if (error) {
    if (error.message?.includes("does not exist")) {
      return { ok: false, error: "AI usage table missing. Apply migration 081." };
    }
    return { ok: false, error: "Could not record AI usage." };
  }
  return { ok: true };
}
