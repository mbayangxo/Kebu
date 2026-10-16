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

  return NextResponse.json({ listing, applications: applications ?? [] });
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
