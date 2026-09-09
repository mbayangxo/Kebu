import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { getAiMeterStatus } from "@/lib/billing/ai-metering";
import {
  assertOwnerWebsiteLimit,
  countOwnerWebsites,
  resolveOwnerBestTier,
} from "@/lib/billing/enforce-limits";
import { getKebuPlan } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

/** Account plan usage: websites + AI generations this month. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const tier = await resolveOwnerBestTier(supabase, user.id);
  const plan = getKebuPlan(tier);
  const websitesUsed = await countOwnerWebsites(supabase, user.id);
  const websiteGate = await assertOwnerWebsiteLimit(supabase, user.id);
  const ai = await getAiMeterStatus(supabase, user.id);

  if ("error" in ai) {
    return NextResponse.json(
      {
        tier,
        planName: plan.name,
        websites: {
          used: websitesUsed,
          limit: plan.limits.maxWebsites,
          canCreate: websiteGate.ok,
        },
        ai: null,
        error: ai.error,
      },
      { status: ai.status === 503 ? 200 : ai.status },
    );
  }

  return NextResponse.json({
    tier,
    planName: plan.name,
    websites: {
      used: websitesUsed,
      limit: plan.limits.maxWebsites,
      canCreate: websiteGate.ok,
    },
    ai: {
      used: ai.used,
      limit: ai.limit,
      remaining: ai.remaining,
      periodStart: ai.periodStart,
    },
    limits: plan.limits,
  });
}
