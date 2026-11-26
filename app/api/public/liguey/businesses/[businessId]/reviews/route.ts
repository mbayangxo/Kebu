import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { summarizeRatings } from "@/lib/liguey/company-review";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ businessId: string }> };

/**
 * Public, anonymous-caller-safe view of a business's real Liguey reviews
 * — same "no anon RLS, service-role API filters status in app code"
 * pattern as app/api/public/liguey/listings. A reviewer's identity is
 * only ever shown when they chose not to be anonymous, and even then
 * only their worker-profile headline (never an email or raw user id).
 */
export async function GET(req: Request, { params }: Params) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { businessId } = await params;
  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: rows, error } = await admin
    .from("liguey_company_reviews")
    .select("reviewer_user_id, rating, body, is_anonymous, created_at")
    .eq("business_id", businessId)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "Could not load reviews." }, { status: 503 });

  const named = (rows ?? []).filter((row) => !row.is_anonymous);
  const headlineByUser = new Map<string, string>();
  if (named.length) {
    const { data: profiles } = await admin.from("worker_profiles").select("user_id, headline").in("user_id", named.map((row) => row.reviewer_user_id));
    for (const profile of profiles ?? []) {
      if (profile.headline) headlineByUser.set(profile.user_id, profile.headline);
    }
  }

  const { average, count } = summarizeRatings(rows ?? []);
  return NextResponse.json({
    average,
    count,
    reviews: (rows ?? []).map((row) => ({
      rating: row.rating,
      body: row.body,
      createdAt: row.created_at,
      reviewerLabel: row.is_anonymous ? "Anonymous" : headlineByUser.get(row.reviewer_user_id) ?? "Verified Liguey worker",
    })),
  });
}
