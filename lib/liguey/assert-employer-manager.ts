import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Deliberately NOT lib/business/assert-manager.ts: that helper's role list
 * (['founder','administrator','store_manager','manager','creative']) is
 * confirmed inconsistent with both the business_members DB role check
 * constraint and the two other inline copies of this same check
 * (app/api/businesses/[id]/events/route.ts and its registrations route),
 * which both use only ['founder','administrator','store_manager']. This
 * mirrors those two, DB-constraint-consistent copies instead of inheriting
 * the ambiguity into a fourth variant.
 */
export async function assertEmployerManager(
  supabase: SupabaseClient,
  businessId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data && ["founder", "administrator", "store_manager"].includes(data.role));
}
