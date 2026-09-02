import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import {
  opportunityIntakeSchema,
  rowToOpportunityProfile,
} from "@/lib/opportunity/intake-schema";

export const dynamic = "force-dynamic";

/** Load signed-in user's Opportunity OS intake profile. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("opportunity_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("does not exist") ? "Apply migration 026." : "Could not load profile." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({
      profile: null,
      needsIntake: true,
    });
  }

  return NextResponse.json({
    profile: rowToOpportunityProfile(data),
    needsIntake: !data.intake_complete,
  });
}

/** Save Opportunity OS intake — required before personalized recommendations. */
export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = opportunityIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid intake.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const row = {
    user_id: user.id,
    main_goal: parsed.data.mainGoal,
    goals: parsed.data.goals,
    interest_paths: parsed.data.interestPaths,
    resource_needs: parsed.data.resourceNeeds,
    starting_budget_band: parsed.data.startingBudgetBand,
    preferred_country_codes: parsed.data.preferredCountryCodes.map((c) => c.toUpperCase()),
    enjoy_doing: parsed.data.enjoyDoing,
    intake_complete: parsed.data.intakeComplete !== false,
    intake_version: "v1",
  };

  const { data, error } = await supabase
    .from("opportunity_profiles")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("does not exist") ? "Apply migration 026." : "Could not save intake." },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile: rowToOpportunityProfile(data), needsIntake: false });
}
