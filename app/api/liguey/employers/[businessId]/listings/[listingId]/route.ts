import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertEmployerManager } from "@/lib/liguey/assert-employer-manager";
import { updateJobListingSchema } from "@/lib/liguey/job-listing";

export const dynamic = "force-dynamic";

const LISTING_COLUMNS = "id, business_id, public_id, title, description, requirements, employment_type, location_type, location, status, created_by, created_at, updated_at";

type Params = { params: Promise<{ businessId: string; listingId: string }> };

/** One listing plus the applications submitted to it (any active member can read both). */
export async function GET(_req: Request, { params }: Params) {
  const { businessId, listingId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { data: listing, error } = await supabase
    .from("job_listings")
    .select(LISTING_COLUMNS)
    .eq("id", listingId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load listing." }, { status: 503 });
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  const { data: applications } = await supabase
    .from("job_applications")
    .select("id, applicant_user_id, cover_note, status, decided_at, decided_by, created_at, updated_at")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  // K066 case 6: a reviewer may now see the applicant's worker_profile and
  // portfolio evidence (not just their cover_note) — RLS grants this only
  // for a worker with a non-withdrawn application to this business, and
  // only for as long as that stays true (20261016200000). No separate
  // authorization check is needed here: a withdrawn application's
  // applicant simply returns no profile row, matching the DB's own grant.
  const applicantIds = [...new Set((applications ?? []).map((application) => application.applicant_user_id))];
  let profiles: { user_id: string; headline: string | null; skills: string[]; languages: string[]; experience: unknown[] }[] = [];
  let evidence: { user_id: string; library_node_id: string; label: string | null }[] = [];
  let evidenceNodes: { id: string; title: string; kind: string }[] = [];
  if (applicantIds.length) {
    const [profileResult, evidenceResult] = await Promise.all([
      supabase.from("worker_profiles").select("user_id, headline, skills, languages, experience").in("user_id", applicantIds),
      supabase.from("worker_profile_evidence").select("user_id, library_node_id, label").in("user_id", applicantIds),
    ]);
    profiles = profileResult.data ?? [];
    evidence = evidenceResult.data ?? [];
    const nodeIds = [...new Set(evidence.map((link) => link.library_node_id))];
    if (nodeIds.length) {
      const { data } = await supabase.from("library_nodes").select("id, title, kind").in("id", nodeIds);
      evidenceNodes = data ?? [];
    }
  }

  // Any previously generated Yande insight is visible to every active
  // business member (not only whichever manager happened to generate it) —
  // matches the applicant-insights table's own read policy.
  const applicationIds = (applications ?? []).map((application) => application.id);
  let insights: { application_id: string; model: string; summary: string; strengths: string[]; questions_to_ask: string[]; caution: string }[] = [];
  if (applicationIds.length) {
    const { data } = await supabase
      .from("liguey_applicant_insights")
      .select("application_id, model, summary, strengths, questions_to_ask, caution")
      .in("application_id", applicationIds);
    insights = data ?? [];
  }

  return NextResponse.json({ listing, applications: applications ?? [], applicantProfiles: profiles, applicantEvidence: evidence, evidenceNodes, applicantInsights: insights });
}

/** Update a listing (including publishing/closing/archiving it) — manager-gated. */
export async function PATCH(req: Request, { params }: Params) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const { businessId, listingId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!(await assertEmployerManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = updateJobListingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid listing.", issues: parsed.error.flatten() }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.requirements !== undefined) patch.requirements = parsed.data.requirements;
  if (parsed.data.employmentType !== undefined) patch.employment_type = parsed.data.employmentType;
  if (parsed.data.locationType !== undefined) patch.location_type = parsed.data.locationType;
  if (parsed.data.location !== undefined) patch.location = parsed.data.location;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const { data, error } = await supabase
    .from("job_listings")
    .update(patch)
    .eq("id", listingId)
    .eq("business_id", businessId)
    .select(LISTING_COLUMNS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update listing." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  return NextResponse.json({ listing: data });
}
