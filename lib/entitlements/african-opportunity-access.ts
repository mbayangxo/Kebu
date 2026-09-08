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

/** Sync entitlement row from afrique_ids — idempotent. */
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

  const now = new Date().toISOString();
  const row = {
    user_id: userId,
    entitlement_key: AFRICAN_OPPORTUNITY_ACCESS_KEY,
    status,
    source: aid ? "afrique_id_sync" : "none",
    granted_at: status === "verified" ? (aid?.verified_at ?? now) : null,
    revoked_at: status === "revoked" ? now : null,
    metadata: {},
    updated_at: now,
  };

  const { error } = await supabase.from("account_entitlements").upsert(row, {
    onConflict: "user_id,entitlement_key",
  });

  if (error?.message?.includes("does not exist")) {
    return { key: AFRICAN_OPPORTUNITY_ACCESS_KEY, status: "none", grantedAt: null, source: null };
  }

  return {
    key: AFRICAN_OPPORTUNITY_ACCESS_KEY,
    status,
    grantedAt: row.granted_at,
    source: row.source,
  };
}

export async function loadAfricanOpportunityEntitlement(opts: {
  supabase: SupabaseClient;
  userId: string;
  sync?: boolean;
}): Promise<AfricanOpportunityEntitlement> {
  if (opts.sync !== false) {
    return syncAfricanOpportunityEntitlement(opts);
  }

  const { data } = await opts.supabase
    .from("account_entitlements")
    .select("status, granted_at, source")
    .eq("user_id", opts.userId)
    .eq("entitlement_key", AFRICAN_OPPORTUNITY_ACCESS_KEY)
    .maybeSingle();

  if (!data) {
    return { key: AFRICAN_OPPORTUNITY_ACCESS_KEY, status: "none", grantedAt: null, source: null };
  }

  return {
    key: AFRICAN_OPPORTUNITY_ACCESS_KEY,
    status: data.status as EntitlementStatus,
    grantedAt: data.granted_at,
    source: data.source,
  };
}

export function hasVerifiedAfricanOpportunityAccess(entitlement: AfricanOpportunityEntitlement): boolean {
  return entitlement.status === "verified";
}
