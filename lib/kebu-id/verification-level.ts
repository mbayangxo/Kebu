import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Real, server-derived advancement for businesses.verification_level
 * (schema has always allowed 1-4; nothing in the live app ever moved it past
 * 1 until this). Never callable from the browser and never accepts a
 * caller-supplied level -- only ever derives one from real signals already
 * enforced elsewhere (migration 006's RLS pins a founder's own update to
 * verification_level = 1; this uses the service-role admin client, which
 * bypasses that RLS specifically to write a server-derived value, same
 * pattern as every other admin-client write in this codebase).
 *
 * Level 2: active (not draft) business + founder has an AfriID on file at
 *   all (any eligibility status -- "informal OK") + at least one real
 *   commerce field from the Kebu ID depth slice is filled in. Matches the
 *   bar lib/shop/seller-trust.ts already uses for the same real signal.
 * Level 3: level 2, and the founder's AfriID is genuinely 'verified'.
 * Level 4: level 3, and Kebu staff have reviewed the uploaded registration
 *   documents (verification_documents_reviewed_at set by the admin-only
 *   review route -- never by the founder).
 */
export async function recomputeBusinessVerificationLevel(
  admin: SupabaseClient,
  businessId: string,
): Promise<number | null> {
  const { data: business } = await admin
    .from("businesses")
    .select(
      "created_by, lifecycle_status, verification_level, delivery_radius_km, cross_border_willing, years_operating, supply_capacity, verification_documents_reviewed_at",
    )
    .eq("id", businessId)
    .maybeSingle();

  if (!business) return null;

  const hasCommerceField = Boolean(
    business.delivery_radius_km !== null ||
      business.cross_border_willing ||
      business.years_operating !== null ||
      (business.supply_capacity && business.supply_capacity.trim().length > 0),
  );
  const documentsReviewed = Boolean(business.verification_documents_reviewed_at);

  const { data: aid } = await admin
    .from("afrique_ids")
    .select("eligibility_status")
    .eq("user_id", business.created_by)
    .maybeSingle();

  let level = 1;
  if (business.lifecycle_status !== "draft" && aid && hasCommerceField) {
    level = 2;
  }
  if (level === 2 && aid?.eligibility_status === "verified") {
    level = 3;
  }
  if (level === 3 && documentsReviewed) {
    level = 4;
  }

  if (level !== business.verification_level) {
    await admin.from("businesses").update({ verification_level: level }).eq("id", businessId);
  }

  return level;
}

/** Products a business may list while still at verification level 1 — same
 * real cap lib/shop/seller-trust.ts already enforces without a linked Kebu
 * ID, now extended to apply until the level genuinely advances past 1, not
 * just until a Kebu ID exists. Reaching level 2 unlocks the plan's full
 * tier-based maxProducts limit instead. */
export const PRODUCTS_ALLOWED_BELOW_VERIFICATION_LEVEL_2 = 3;
