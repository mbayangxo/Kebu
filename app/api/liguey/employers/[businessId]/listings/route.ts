import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertEmployerManager } from "@/lib/liguey/assert-employer-manager";
import { createJobListingSchema, newJobListingPublicId } from "@/lib/liguey/job-listing";

export const dynamic = "force-dynamic";

const LISTING_COLUMNS = "id, business_id, public_id, title, description, requirements, employment_type, location_type, location, pay_label, photo_url, status, created_by, created_at, updated_at";

type Params = { params: Promise<{ businessId: string }> };

/** List a business's own listings (any active member — RLS enforces this independently). */
export async function GET(_req: Request, { params }: Params) {
  const { businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("job_listings")
    .select(LISTING_COLUMNS)
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Could not load listings." }, { status: 503 });
  return NextResponse.json({ listings: data ?? [] });
}

/** Create a listing — manager-gated at the application level; RLS enforces it independently. */
export async function POST(req: Request, { params }: Params) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const { businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!(await assertEmployerManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = createJobListingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid listing.", issues: parsed.error.flatten() }, { status: 400 });

  let publicId = newJobListingPublicId();
  for (let i = 0; i < 5; i += 1) {
    const { data: clash } = await supabase.from("job_listings").select("id").eq("public_id", publicId).maybeSingle();
    if (!clash) break;
    publicId = newJobListingPublicId();
  }

  const { data, error } = await supabase
    .from("job_listings")
    .insert({
      business_id: businessId,
      public_id: publicId,
      title: parsed.data.title,
      description: parsed.data.description,
      requirements: parsed.data.requirements,
      employment_type: parsed.data.employmentType,
      location_type: parsed.data.locationType,
      location: parsed.data.location,
      pay_label: parsed.data.payLabel,
      status: parsed.data.status,
      created_by: user.id,
    })
    .select(LISTING_COLUMNS)
    .single();
  if (error || !data) return NextResponse.json({ error: "Could not create listing." }, { status: 500 });
  return NextResponse.json({ listing: data }, { status: 201 });
}
