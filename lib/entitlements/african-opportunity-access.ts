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
 * Derive Opportunity access from the server-controlled Afrique ID record,
 * and (when `sync` is not explicitly false) persist that derived status into
 * `account_entitlements` -- the real, auditable "connected services" record
 * the account control center reads and writes. This still performs no
 * client-grantable write: the persisted status is always re-derived from the
 * server-controlled `afrique_ids` row, never from caller input, so a client
 * can only ever end up with what their real African ID status already
 * earns. The one exception is an explicit revoke (see
 * `revokeAfricanOpportunityAccess` below): once a user's row is `revoked`,
 * a fresh "verified" derivation is intentionally NOT re-applied over it --
 * an explicit opt-out must stick until the user explicitly opts back in via
 * `optInAfricanOpportunityAccess`, matching the control center's own
 * revoke/restore contract.
 */
export async function syncAfricanOpportunityEntitlement(opts: {
  supabase: SupabaseClient;
  userId: string;
  sync?: boolean;
}): Promise<AfricanOpportunityEntitlement> {
  const { supabase, userId, sync = true } = opts;

  const [{ data: aid }, { data: existing }] = await Promise.all([
    supabase
      .from("afrique_ids")
      .select("eligibility_status, identity_type, verified_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("account_entitlements")
      .select("status")
      .eq("user_id", userId)
      .eq("entitlement_key", AFRICAN_OPPORTUNITY_ACCESS_KEY)
      .maybeSingle(),
  ]);

  if (existing?.status === "revoked") {
    return { key: AFRICAN_OPPORTUNITY_ACCESS_KEY, status: "revoked", grantedAt: null, source: aid ? "afrique_id" : null };
  }

  const status = aid
    ? deriveAfricanOpportunityStatus({
        eligibilityStatus: aid.eligibility_status as AfriqueEligibilityStatus,
        identityType: (aid.identity_type === "indigenous" ? "indigenous" : "visitor") as AfricanIdType,
      })
    : "none";
  const grantedAt = status === "verified" ? (aid?.verified_at ?? null) : null;

  if (sync) {
    await supabase.from("account_entitlements").upsert(
      {
        user_id: userId,
        entitlement_key: AFRICAN_OPPORTUNITY_ACCESS_KEY,
        status,
        source: aid ? "afrique_id" : null,
        granted_at: grantedAt,
      },
      { onConflict: "user_id,entitlement_key" },
    );
  }

  return {
    key: AFRICAN_OPPORTUNITY_ACCESS_KEY,
    status,
    grantedAt,
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

/** Explicit user action from the account control center: revoke sticks until opt-in. */
export async function revokeAfricanOpportunityAccess(opts: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<void> {
  const { supabase, userId } = opts;
  await supabase.from("account_entitlements").upsert(
    {
      user_id: userId,
      entitlement_key: AFRICAN_OPPORTUNITY_ACCESS_KEY,
      status: "revoked",
      revoked_at: new Date().toISOString(),
    },
    { onConflict: "user_id,entitlement_key" },
  );
}

/** Explicit user action: clear a sticky revoke, then re-derive and persist fresh eligibility. */
export async function optInAfricanOpportunityAccess(opts: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<AfricanOpportunityEntitlement> {
  const { supabase, userId } = opts;
  await supabase
    .from("account_entitlements")
    .delete()
    .eq("user_id", userId)
    .eq("entitlement_key", AFRICAN_OPPORTUNITY_ACCESS_KEY);
  return syncAfricanOpportunityEntitlement({ supabase, userId });
}
