import type { SupabaseClient } from "@supabase/supabase-js";

export const BUSINESS_CLAIM_DOCUMENTS_BUCKET = "business-claim-documents";
export const MAX_CLAIM_PROOF_BYTES = 10 * 1024 * 1024;

export const ALLOWED_CLAIM_PROOF_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function sanitizeClaimFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "proof";
}

/** True if this user already has an active (non-removed, non-pending-invite) seat on the business. */
export async function isActiveMember(
  supabase: SupabaseClient,
  businessId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data);
}

/**
 * The security-critical check this whole feature turns on: a business is
 * only "claimable into real founder membership" when it genuinely has zero
 * active members. Every business created through the normal founder-signup
 * path (lib/kebu-id/create-registration.ts) gets exactly one 'active'
 * 'founder' business_members row at creation time, and nothing in this
 * codebase today ever sets a member's status to 'removed' -- so in
 * practice this will almost always return false. That's intentional, not a
 * bug: approving a claim on a business that already has an owner must
 * never auto-transfer anything. This function exists so that if a future
 * slice ever does add a real removal path (an admin offboarding a founder,
 * for example), claims on a now-genuinely-orphaned business start working
 * correctly without this feature needing to change at all.
 */
export async function hasZeroActiveMembers(
  supabase: SupabaseClient,
  businessId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "active")
    .limit(1);
  return (data ?? []).length === 0;
}
