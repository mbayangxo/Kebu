import { describe, expect, it } from "vitest";
import {
  deriveAfricanOpportunityStatus,
  hasVerifiedAfricanOpportunityAccess,
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
});
