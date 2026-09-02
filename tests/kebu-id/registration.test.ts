import { describe, expect, it } from "vitest";
import { calculateBusinessReadiness, infoCompleteFromProfile } from "@/lib/kebu-id/readiness";
import { registerBusinessSchema } from "@/lib/kebu-id/registration-schema";
import { getCountryModule, isValidLegalStructure } from "@/lib/kebu-id/countries";
import { getGovernmentConnector } from "@/lib/kebu-id/government/mock-connector";
import { buildKebuRecordHtml } from "@/lib/kebu-id/kebu-business-record";

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
    const gie = mod?.legalStructures.find((s) => s.code === "gie");
    expect(gie?.summary).toBeTruthy();
    expect(gie?.pros?.length).toBeGreaterThan(0);
    expect(gie?.simpleAnalogy).toBeTruthy();
    expect(gie?.examples?.length).toBeGreaterThan(0);
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

describe("Business Readiness score v3", () => {
  it("does not give 100 for profile-only completion", () => {
    const result = calculateBusinessReadiness({
      ...completeProfile,
      registrationDocumentsComplete: false,
      hasPublishedWebsite: false,
      kebuOfficialRecordGenerated: false,
    });
    expect(result.scoreValue).toBeLessThan(85);
    expect(result.modelVersion).toBe("business-readiness-v3");
    expect(result.missingItems.some((m) => /documents/i.test(m))).toBe(true);
    expect(infoCompleteFromProfile(completeProfile)).toBe(true);
  });

  it("rises with logo, products, and Create assets", () => {
    const base = calculateBusinessReadiness({
      ...completeProfile,
      registrationDocumentsComplete: true,
      hasPublishedWebsite: true,
      kebuOfficialRecordGenerated: true,
    });
    const boosted = calculateBusinessReadiness({
      ...completeProfile,
      registrationDocumentsComplete: true,
      hasPublishedWebsite: true,
      kebuOfficialRecordGenerated: true,
      hasSiteLogo: true,
      siteProductCount: 5,
      createAssetCount: 3,
    });
    expect(boosted.scoreValue).toBeGreaterThanOrEqual(base.scoreValue);
    expect(boosted.helpingFactors.some((f) => /logo|product|Create/i.test(f))).toBe(true);
  });

  it("reaches strong readiness with docs, site, and Kebu record", () => {
    const result = calculateBusinessReadiness({
      ...completeProfile,
      registrationDocumentsComplete: true,
      hasPublishedWebsite: true,
      kebuOfficialRecordGenerated: true,
    });
    expect(result.scoreValue).toBeGreaterThanOrEqual(85);
    expect(result.explanation.note).toMatch(/not financing/i);
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
    expect(result.explanation.summary).toMatch(/early stage|not enough/i);
  });

  it("tracks registration document completion in missing items", () => {
    const withoutDocs = calculateBusinessReadiness({ ...completeProfile, registrationDocumentsComplete: false });
    expect(withoutDocs.missingItems.some((m) => /founder ID/i.test(m))).toBe(true);

    const withDocs = calculateBusinessReadiness({ ...completeProfile, registrationDocumentsComplete: true });
    expect(withDocs.helpingFactors.some((f) => /documents/i.test(f))).toBe(true);
  });
});

describe("Kebu business record", () => {
  it("renders HTML with public Kebu ID and trust label", () => {
    const html = buildKebuRecordHtml({
      recordVersion: "test",
      generatedAt: "2026-01-01T00:00:00.000Z",
      publicKebuId: "KEBU-SN-01-TEST01",
      business: {
        legalName: "Test Co",
        tradingName: null,
        countryCode: "SN",
        region: "Dakar",
        category: "retail",
        legalStructure: "gie",
        registrationStatus: "draft",
        verificationLevel: 1,
      },
      contact: { businessEmail: null, businessPhone: null, website: null },
      founder: { name: "Awa", email: "a@t.sn", ownershipPercent: 100 },
      trust: {
        label: "Kebu-generated",
        note: "This record is issued by Kebu for your business identity. It is not a government registration certificate.",
      },
    });
    expect(html).toContain("KEBU-SN-01-TEST01");
    expect(html).toContain("Kebu-generated");
    expect(html).toContain("EIN");
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
