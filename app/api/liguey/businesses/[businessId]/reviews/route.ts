import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { companyReviewSchema, summarizeRatings } from "@/lib/liguey/company-review";

export const dynamic = "force-dynamic";

const REVIEW_COLUMNS = "id, reviewer_user_id, rating, body, is_anonymous, status, created_at, updated_at";

type Params = { params: Promise<{ businessId: string }> };

/**
 * Real visible reviews for this business, plus whether the signed-in
 * user is eligible to write one (RLS already limits what comes back to
 * everyone's visible reviews + this user's own row regardless of
 * status — see 20261020020000).
 */
export async function GET(_req: Request, { params }: Params) {
  const { businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const [{ data: rows, error }, { data: acceptedApplication }] = await Promise.all([
    supabase.from("liguey_company_reviews").select(REVIEW_COLUMNS).eq("business_id", businessId).order("created_at", { ascending: false }),
    supabase.from("job_applications").select("id").eq("business_id", businessId).eq("applicant_user_id", user.id).eq("status", "accepted").limit(1).maybeSingle(),
  ]);
  if (error) return NextResponse.json({ error: "Could not load reviews." }, { status: 503 });

  const all = rows ?? [];
  const visible = all.filter((row) => row.status === "visible");
  const { average, count } = summarizeRatings(visible);
  const mine = all.find((row) => row.reviewer_user_id === user.id) ?? null;

  return NextResponse.json({
    average,
    count,
    reviews: visible.map((row) => ({ id: row.id, rating: row.rating, body: row.body, isAnonymous: row.is_anonymous, createdAt: row.created_at, mine: row.reviewer_user_id === user.id })),
    myReview: mine ? { id: mine.id, rating: mine.rating, body: mine.body, isAnonymous: mine.is_anonymous, status: mine.status } : null,
    eligibleApplicationId: acceptedApplication?.id ?? null,
  });
}

/** Write or edit your own review — RLS is the real gate (must have an accepted application here). */
export async function POST(req: Request, { params }: Params) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const { businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = companyReviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid review.", issues: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("liguey_company_reviews")
    .upsert({
      business_id: businessId,
      reviewer_user_id: user.id,
      application_id: parsed.data.applicationId,
      rating: parsed.data.rating,
      body: parsed.data.body,
      is_anonymous: parsed.data.isAnonymous,
      status: "visible",
    }, { onConflict: "business_id,reviewer_user_id" })
    .select(REVIEW_COLUMNS)
    .single();

  if (error) {
    const forbidden = error.code === "42501";
    return NextResponse.json(
      { error: forbidden ? "You can only review a business that actually hired you." : "Could not save your review." },
      { status: forbidden ? 403 : 500 },
    );
  }
  return NextResponse.json({ review: { id: data.id, rating: data.rating, body: data.body, isAnonymous: data.is_anonymous, status: data.status } });
}

/** Withdraw your own review (soft delete — status is set to 'removed', never actually deleted). */
export async function DELETE(req: Request, { params }: Params) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const { businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("liguey_company_reviews")
    .update({ status: "removed" })
    .eq("business_id", businessId)
    .eq("reviewer_user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not remove your review." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "You have no review here to remove." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
