import type { SupabaseClient } from "@supabase/supabase-js";
export function currentEmployerReview(
  review: {
    status: string;
    registry_checked: boolean;
    recruiter_checked: boolean;
    expires_at: string | null;
  } | null,
  now = Date.now(),
) {
  return Boolean(
    review &&
    review.status === "approved" &&
    review.registry_checked &&
    review.recruiter_checked &&
    review.expires_at &&
    Date.parse(review.expires_at) > now,
  );
}
/** Service-role public APIs must apply the same review check explicitly. */
export async function reviewedEmployerIds(
  db: SupabaseClient,
  businessIds: string[],
) {
  if (!businessIds.length) return { ids: new Set<string>(), error: null };
  const result = await db
    .from("business_employer_verifications")
    .select("business_id,status,registry_checked,recruiter_checked,expires_at")
    .in("business_id", businessIds);
  if (result.error) return { ids: new Set<string>(), error: result.error };
  const active = await db
    .from("businesses")
    .select("id")
    .in("id", businessIds)
    .eq("lifecycle_status", "active");
  if (active.error) return { ids: new Set<string>(), error: active.error };
  const activeIds = new Set((active.data ?? []).map((b) => b.id));
  return {
    ids: new Set<string>(
      (result.data ?? [])
        .filter((v) => activeIds.has(v.business_id) && currentEmployerReview(v))
        .map((v) => v.business_id),
    ),
    error: null,
  };
}
