import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertEmployerManager } from "@/lib/liguey/assert-employer-manager";
import { generateApplicantInsight } from "@/lib/liguey/applicant-insight";

export const dynamic = "force-dynamic";

const INSIGHT_COLUMNS = "application_id, model, summary, strengths, questions_to_ask, caution, created_at, updated_at";
const MONTHLY_LIMIT = Number(process.env.LIGUEY_AI_MONTHLY_LIMIT || 50);

type Params = { params: Promise<{ businessId: string; listingId: string; applicationId: string }> };

/** Any active business member can read a previously generated insight. */
export async function GET(_req: Request, { params }: Params) {
  const { businessId, applicationId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("liguey_applicant_insights")
    .select(INSIGHT_COLUMNS)
    .eq("application_id", applicationId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load this insight." }, { status: 500 });
  return NextResponse.json({ insight: data ?? null });
}

/** A manager asks Yande to generate (or regenerate) a qualitative note for one applicant. */
export async function POST(req: Request, { params }: Params) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const { businessId, listingId, applicationId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!(await assertEmployerManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { data: listing } = await supabase
    .from("job_listings")
    .select("title, description, requirements, employment_type, location_type")
    .eq("id", listingId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  const { data: application } = await supabase
    .from("job_applications")
    .select("id, applicant_user_id, cover_note")
    .eq("id", applicationId)
    .eq("listing_id", listingId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const { data: profile } = await supabase
    .from("worker_profiles")
    .select("headline, bio, skills, languages, experience")
    .eq("user_id", application.applicant_user_id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "This applicant has no profile to review yet." }, { status: 409 });

  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "Yande is unavailable right now." }, { status: 503 });

  const { data: allowed, error: quotaError } = await service.rpc("liguey_reserve_ai_generation", {
    p_business_id: businessId,
    p_limit: MONTHLY_LIMIT,
  });
  if (quotaError) return NextResponse.json({ error: "Could not check Yande usage." }, { status: 503 });
  if (!allowed) {
    return NextResponse.json({
      error: "This business has reached its monthly Yande limit for applicant insights.",
      code: "LIGUEY_AI_LIMIT",
    }, { status: 429 });
  }

  let result;
  try {
    result = await generateApplicantInsight({
      listing: {
        title: listing.title,
        description: listing.description,
        requirements: listing.requirements,
        employmentType: listing.employment_type,
        locationType: listing.location_type,
      },
      applicant: {
        headline: profile.headline,
        bio: profile.bio,
        skills: profile.skills ?? [],
        languages: profile.languages ?? [],
        experience: (profile.experience ?? []) as Array<{ title: string; description: string; kind: "formal" | "informal" }>,
      },
      coverNote: application.cover_note,
      userId: user.id,
    });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Yande could not generate an insight." }, { status: 502 });
  }

  const { data: insight, error } = await supabase
    .from("liguey_applicant_insights")
    .upsert({
      application_id: applicationId,
      business_id: businessId,
      generated_by: user.id,
      model: result.model,
      summary: result.summary,
      strengths: result.strengths,
      questions_to_ask: result.questionsToAsk,
      caution: result.caution,
    }, { onConflict: "application_id" })
    .select(INSIGHT_COLUMNS)
    .single();

  if (error || !insight) return NextResponse.json({ error: "Could not save Yande's insight." }, { status: 500 });
  return NextResponse.json({ insight });
}
