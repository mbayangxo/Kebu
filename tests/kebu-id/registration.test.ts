import { describe, expect, it } from "vitest";
import { calculateBusinessReadiness, infoCompleteFromProfile } from "@/lib/kebu-id/readiness";
import { registerBusinessSchema } from "@/lib/kebu-id/registration-schema";
import { getCountryModule, isValidLegalStructure } from "@/lib/kebu-id/countries";
import { getGovernmentConnector } from "@/lib/kebu-id/government/mock-connector";

const completeProfile = {
  legalName: "Atelier Baobab SARL",
  tradingName: "Baobab",
  countryCode: "SN",
  region: "Dakar",
  category: "fashion",
  description: "Handmade clothing workshop in Dakar for local and export markets.",
  businessEmail: "hello@baobab.sn",
  businessPhone: "+221770000000",
  website: "https://baobab.sn",
  legalStructure: "sarl",
  founderName: "Awa Diop",
  founderEmail: "awa@baobab.sn",
  ownershipPercent: 100,
};

describe("Senegal country module", () => {
  it("exposes isolated legal structures", () => {
    const mod = getCountryModule("SN");
    expect(mod?.legalStructures.map((s) => s.code)).toContain("gie");
    expect(mod?.legalStructures.map((s) => s.code)).toContain("sarl");
    expect(isValidLegalStructure("SN", "llc")).toBe(false);
  });
});

describe("registerBusinessSchema", () => {
  it("accepts a complete Senegal registration", () => {
    const parsed = registerBusinessSchema.parse(completeProfile);
    expect(parsed.countryCode).toBe("SN");
    expect(parsed.legalStructure).toBe("sarl");
  });

  it("rejects invalid Senegal region", () => {
    const result = registerBusinessSchema.safeParse({ ...completeProfile, region: "Paris" });
    expect(result.success).toBe(false);
  });

  it("rejects countries without a registration module", () => {
    const result = registerBusinessSchema.safeParse({ ...completeProfile, countryCode: "NG", region: "Lagos" });
    expect(result.success).toBe(false);
  });
});

describe("Business Readiness score", () => {
  it("scores a complete profile as high readiness", () => {
    const result = calculateBusinessReadiness({
      ...completeProfile,
      registrationDocumentsComplete: true,
    });
    expect(result.scoreValue).toBeGreaterThanOrEqual(85);
    expect(result.modelVersion).toBe("business-readiness-v1");
    expect(result.explanation.note).toMatch(/not financing/i);
    expect(infoCompleteFromProfile(completeProfile)).toBe(true);
  });

  it("does not auto-fail new incomplete profiles as bad credit", () => {
    const result = calculateBusinessReadiness({
      legalName: "New Co",
      countryCode: "SN",
      category: "services",
      description: "short",
    });
    expect(result.confidenceLevel).toBe("low");
    expect(result.missingItems.length).toBeGreaterThan(0);
    expect(result.explanation.summary).toMatch(/not enough verified information/i);
    expect(result.missingItems.some((m) => /registration documents/i.test(m))).toBe(true);
  });

  it("tracks registration document completion in missing items", () => {
    const withoutDocs = calculateBusinessReadiness({ ...completeProfile, registrationDocumentsComplete: false });
    expect(withoutDocs.missingItems.some((m) => /registration documents/i.test(m))).toBe(true);

    const withDocs = calculateBusinessReadiness({ ...completeProfile, registrationDocumentsComplete: true });
    expect(withDocs.helpingFactors.some((f) => /registration documents/i.test(f))).toBe(true);
    expect(withDocs.missingItems.some((m) => /registration documents/i.test(m))).toBe(false);
  });
});

describe("Mock government connector", () => {
  it("is explicitly not live", async () => {
    const connector = getGovernmentConnector("SN");
    expect(connector.isLive).toBe(false);
    const submitted = await connector.submitRegistration({
      businessId: "11111111-1111-4111-8111-111111111111",
      payload: {},
    });
    expect(submitted.status).toBe("mock_not_submitted");
    expect(submitted.messages[0]).toMatch(/PLACEHOLDER/i);
  });
});
