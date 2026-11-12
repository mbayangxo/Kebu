import { describe, expect, it, vi } from "vitest";
import {
  deriveAfricanOpportunityStatus,
  hasVerifiedAfricanOpportunityAccess,
  loadAfricanOpportunityEntitlement,
} from "@/lib/entitlements/african-opportunity-access";

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

  it("derives access from Afrique ID without writing an entitlement", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        eligibility_status: "verified",
        identity_type: "indigenous",
        verified_at: "2026-09-19T10:00:00Z",
      },
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from };

    const result = await loadAfricanOpportunityEntitlement({
      supabase: supabase as never,
      userId: "user-1",
      sync: false,
    });

    expect(result).toEqual({
      key: "african_opportunity_access",
      status: "verified",
      grantedAt: "2026-09-19T10:00:00Z",
      source: "afrique_id",
    });
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("afrique_ids");
  });
});
