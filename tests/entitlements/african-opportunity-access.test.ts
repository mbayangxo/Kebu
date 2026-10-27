import { describe, expect, it, vi } from "vitest";
import {
  deriveAfricanOpportunityStatus,
  hasVerifiedAfricanOpportunityAccess,
  loadAfricanOpportunityEntitlement,
  optInAfricanOpportunityAccess,
  revokeAfricanOpportunityAccess,
} from "@/lib/entitlements/african-opportunity-access";

/**
 * Fake supabase client scoped to exactly the two tables this module touches.
 * `aid` is the afrique_ids row (or null). `entitlementRow` is a small
 * mutable single-row store standing in for account_entitlements, so a
 * delete-then-resync round trip (optInAfricanOpportunityAccess) actually
 * proves something, not just that the calls happened in some order. Every
 * write call is also recorded on `calls` for assertion.
 */
function fakeSupabase(opts: {
  aid: { eligibility_status: string; identity_type: string; verified_at: string | null } | null;
  existingEntitlement: { status: string } | null;
}) {
  const calls: Array<{ table: string; op: string; payload?: unknown }> = [];
  let entitlementRow: { status: string } | null = opts.existingEntitlement;

  const from = vi.fn((table: string) => {
    if (table === "afrique_ids") {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.aid }) }) }) };
    }
    if (table === "account_entitlements") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: entitlementRow }) }),
          }),
        }),
        upsert: (payload: { status: string }) => {
          calls.push({ table, op: "upsert", payload });
          entitlementRow = { status: payload.status };
          return Promise.resolve({ data: null, error: null });
        },
        delete: () => ({
          eq: () => ({
            eq: () => {
              calls.push({ table, op: "delete" });
              entitlementRow = null;
              return Promise.resolve({ data: null, error: null });
            },
          }),
        }),
      };
    }
    throw new Error(`fakeSupabase: unexpected table ${table}`);
  });

  return { supabase: { from } as never, calls };
}

describe("African opportunity entitlement", () => {
  it("grants verified indigenous Africans access", () => {
    const status = deriveAfricanOpportunityStatus({
      eligibilityStatus: "verified",
      identityType: "indigenous",
    });
    expect(status).toBe("verified");
    expect(hasVerifiedAfricanOpportunityAccess({ key: "african_opportunity_access", status, grantedAt: null, source: null })).toBe(true);
  });

  it("does not grant verified visitors protected access", () => {
    const status = deriveAfricanOpportunityStatus({
      eligibilityStatus: "verified",
      identityType: "visitor",
    });
    expect(status).toBe("none");
  });

  it("maps pending verification to pending entitlement", () => {
    expect(
      deriveAfricanOpportunityStatus({ eligibilityStatus: "pending", identityType: "indigenous" }),
    ).toBe("pending");
  });

  it("maps rejected to revoked", () => {
    expect(
      deriveAfricanOpportunityStatus({ eligibilityStatus: "rejected", identityType: "indigenous" }),
    ).toBe("revoked");
  });

  it("sync:false derives access from Afrique ID without writing an entitlement (read-only gate checks)", async () => {
    const { supabase, calls } = fakeSupabase({
      aid: { eligibility_status: "verified", identity_type: "indigenous", verified_at: "2026-09-19T10:00:00Z" },
      existingEntitlement: null,
    });

    const result = await loadAfricanOpportunityEntitlement({ supabase, userId: "user-1", sync: false });

    expect(result).toEqual({
      key: "african_opportunity_access",
      status: "verified",
      grantedAt: "2026-09-19T10:00:00Z",
      source: "afrique_id",
    });
    expect(calls).toHaveLength(0);
  });

  it("sync:true (default) persists the derived status into account_entitlements", async () => {
    const { supabase, calls } = fakeSupabase({
      aid: { eligibility_status: "verified", identity_type: "indigenous", verified_at: "2026-09-19T10:00:00Z" },
      existingEntitlement: null,
    });

    const result = await loadAfricanOpportunityEntitlement({ supabase, userId: "user-1" });

    expect(result.status).toBe("verified");
    expect(calls).toEqual([
      {
        table: "account_entitlements",
        op: "upsert",
        payload: {
          user_id: "user-1",
          entitlement_key: "african_opportunity_access",
          status: "verified",
          source: "afrique_id",
          granted_at: "2026-09-19T10:00:00Z",
        },
      },
    ]);
  });

  it("an explicit revoke sticks even though the real afrique_ids status still derives to verified", async () => {
    const { supabase, calls } = fakeSupabase({
      aid: { eligibility_status: "verified", identity_type: "indigenous", verified_at: "2026-09-19T10:00:00Z" },
      existingEntitlement: { status: "revoked" },
    });

    const result = await loadAfricanOpportunityEntitlement({ supabase, userId: "user-1" });

    expect(result.status).toBe("revoked");
    // No re-upsert of "verified" over the sticky revoke.
    expect(calls).toHaveLength(0);
  });

  it("revokeAfricanOpportunityAccess writes a revoked row with a timestamp", async () => {
    const { supabase, calls } = fakeSupabase({ aid: null, existingEntitlement: null });
    await revokeAfricanOpportunityAccess({ supabase, userId: "user-1" });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.table).toBe("account_entitlements");
    expect(calls[0]!.op).toBe("upsert");
    const payload = calls[0]!.payload as { status: string; revoked_at: string };
    expect(payload.status).toBe("revoked");
    expect(typeof payload.revoked_at).toBe("string");
  });

  it("optInAfricanOpportunityAccess clears the revoke then re-derives fresh eligibility", async () => {
    const { supabase, calls } = fakeSupabase({
      aid: { eligibility_status: "verified", identity_type: "indigenous", verified_at: "2026-09-19T10:00:00Z" },
      existingEntitlement: { status: "revoked" },
    });

    const result = await optInAfricanOpportunityAccess({ supabase, userId: "user-1" });

    // Real round trip: delete clears the sticky revoke, then the re-sync
    // reads a clean slate and derives+persists "verified" from the still-real
    // afrique_ids row — this is the actual restore behavior, not just a call count.
    expect(calls[0]).toEqual({ table: "account_entitlements", op: "delete" });
    expect(calls[1]).toMatchObject({ table: "account_entitlements", op: "upsert", payload: { status: "verified" } });
    expect(result.status).toBe("verified");
  });
});
