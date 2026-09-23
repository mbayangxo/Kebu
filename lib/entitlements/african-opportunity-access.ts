import type { SupabaseClient } from "@supabase/supabase-js";
import type { AfriqueEligibilityStatus, AfricanIdType } from "@/lib/afrique-id/types";

export const AFRICAN_OPPORTUNITY_ACCESS_KEY = "african_opportunity_access";

export type EntitlementStatus = "none" | "pending" | "verified" | "revoked";

export type AfricanOpportunityEntitlement = {
  key: typeof AFRICAN_OPPORTUNITY_ACCESS_KEY;
  status: EntitlementStatus;
  grantedAt: string | null;
  source: string | null;
};

/** Derive entitlement status from African ID verification — server-side only. */
export function deriveAfricanOpportunityStatus(opts: {
  eligibilityStatus: AfriqueEligibilityStatus;
  identityType: AfricanIdType;
}): EntitlementStatus {
  if (opts.eligibilityStatus === "verified" && opts.identityType === "indigenous") {
    return "verified";
  }
  if (opts.eligibilityStatus === "pending" || opts.eligibilityStatus === "manual_review") {
    return "pending";
  }
  if (opts.eligibilityStatus === "suspended" || opts.eligibilityStatus === "rejected") {
    return "revoked";
  }
  return "none";
}

/**
 * Derive Opportunity access from the server-controlled Afrique ID record.
 * This intentionally performs no user-scoped entitlement write: clients must
 * never be able to grant themselves a protected entitlement.
 */
export async function syncAfricanOpportunityEntitlement(opts: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<AfricanOpportunityEntitlement> {
  const { supabase, userId } = opts;

  const { data: aid } = await supabase
    .from("afrique_ids")
    .select("eligibility_status, identity_type, verified_at")
    .eq("user_id", userId)
    .maybeSingle();

  const status = aid
    ? deriveAfricanOpportunityStatus({
        eligibilityStatus: aid.eligibility_status as AfriqueEligibilityStatus,
        identityType: (aid.identity_type === "indigenous" ? "indigenous" : "visitor") as AfricanIdType,
      })
    : "none";

  return {
    key: AFRICAN_OPPORTUNITY_ACCESS_KEY,
    status,
    grantedAt: status === "verified" ? (aid?.verified_at ?? null) : null,
    source: aid ? "afrique_id" : null,
  };
}

export async function loadAfricanOpportunityEntitlement(opts: {
  supabase: SupabaseClient;
  userId: string;
  sync?: boolean;
}): Promise<AfricanOpportunityEntitlement> {
  return syncAfricanOpportunityEntitlement(opts);
}

export function hasVerifiedAfricanOpportunityAccess(entitlement: AfricanOpportunityEntitlement): boolean {
  return entitlement.status === "verified";
}
