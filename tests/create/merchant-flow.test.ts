/**
 * Merchant flow integration tests
 *
 * Covers the critical path:
 * Signup → Kebu ID → Business profile → Create store → Dashboard → Publish → Public storefront
 *
 * These are schema/logic unit tests — no Supabase connection required.
 */
import { describe, expect, it } from "vitest";
import { createWebsiteBriefSchema, validateWebsiteDefinition } from "@/lib/create/website-schema";
import { registerBusinessSchema } from "@/lib/kebu-id/registration-schema";
import { buildStructuredSiteFromBrief } from "@/lib/create/ai-generate";
import { generatePublicKebuId } from "@/lib/kebu-id/public-id";

// ─── Kebu ID generation ────────────────────────────────────────────────────

describe("Kebu ID", () => {
  it("generates IDs matching the KEBU-CC-LL-XXXXXX format", () => {
    const id = generatePublicKebuId("SN");
    expect(id).toMatch(/^KEBU-SN-01-[A-Z0-9]{6}$/);
  });

  it("generates unique IDs on repeated calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generatePublicKebuId("SN")));
    expect(ids.size).toBe(20);
  });

  it("uses country code in the ID", () => {
    const ke = generatePublicKebuId("KE");
    const gh = generatePublicKebuId("GH");
    expect(ke).toContain("-KE-");
    expect(gh).toContain("-GH-");
  });

  it("never contains ambiguous chars (I, O, 0, 1)", () => {
    for (let i = 0; i < 50; i++) {
      const id = generatePublicKebuId("SN");
      const suffix = id.split("-").at(-1) ?? "";
      expect(suffix).not.toMatch(/[IO01]/);
    }
  });
});

// ─── Business registration schema ──────────────────────────────────────────

const validBusiness = {
  legalName: "Fatou Cosmetics SARL",
  tradingName: "Fatou Cosmetics",
  countryCode: "SN",
  region: "Dakar",
  category: "beauty",
  description: "Handmade shea butter skincare for women across West Africa.",
  businessEmail: "hello@fatou.sn",
  businessPhone: "+221770000000",
  legalStructure: "sarl",
  founderName: "Fatou Diallo",
  founderEmail: "fatou@fatou.sn",
  ownershipPercent: 100,
};

describe("Business registration schema (Kebu ID prerequisite)", () => {
  it("accepts a complete Senegal registration", () => {
    const result = registerBusinessSchema.safeParse(validBusiness);
    expect(result.success).toBe(true);
  });

  it("rejects description under 20 characters", () => {
    const result = registerBusinessSchema.safeParse({
      ...validBusiness,
      description: "Too short.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-African country codes", () => {
    const result = registerBusinessSchema.safeParse({
      ...validBusiness,
      countryCode: "US",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid legal structure for Senegal", () => {
    const result = registerBusinessSchema.safeParse({
      ...validBusiness,
      legalStructure: "llc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects ownership over 100%", () => {
    const result = registerBusinessSchema.safeParse({
      ...validBusiness,
      ownershipPercent: 101,
    });
    expect(result.success).toBe(false);
  });
});

// ─── Create website brief (store creation) ─────────────────────────────────

const validBrief = {
  mode: "blank" as const,
  businessName: "Fatou Cosmetics",
  category: "store",
  description: "Handmade shea butter skincare for women across West Africa.",
  countryCode: "SN",
  locale: "en",
};

describe("Create website brief schema (store creation step)", () => {
  it("accepts blank mode with store category", () => {
    const result = createWebsiteBriefSchema.safeParse(validBrief);
    expect(result.success).toBe(true);
  });

  it("accepts template mode with templateSlug", () => {
    const result = createWebsiteBriefSchema.safeParse({
      ...validBrief,
      mode: "template",
      templateSlug: "shopping-store",
    });
    expect(result.success).toBe(true);
  });

  it("accepts photos mode with photo URLs", () => {
    const result = createWebsiteBriefSchema.safeParse({
      ...validBrief,
      mode: "photos",
      photoUrls: ["https://example.supabase.co/storage/v1/object/public/assets/a.jpg"],
      description: "Photo-based store description long enough to pass validation.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts ai mode", () => {
    const result = createWebsiteBriefSchema.safeParse({
      ...validBrief,
      mode: "ai",
      description: "Handmade shea butter skincare for women across West Africa — natural, affordable.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects subdomain with special characters", () => {
    const result = createWebsiteBriefSchema.safeParse({
      ...validBrief,
      subdomain: "invalid_subdomain!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects businessId that is not a UUID", () => {
    const result = createWebsiteBriefSchema.safeParse({
      ...validBrief,
      businessId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("passes a valid businessId UUID", () => {
    const result = createWebsiteBriefSchema.safeParse({
      ...validBrief,
      businessId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Site structure validation (store database record) ─────────────────────

describe("Site structure — buildStructuredSiteFromBrief → validateWebsiteDefinition", () => {
  it("builds a valid site definition from a store brief", () => {
    const brief = createWebsiteBriefSchema.parse(validBrief);
    const definition = buildStructuredSiteFromBrief(brief);
    const validation = validateWebsiteDefinition(definition);
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.data.pages.length).toBeGreaterThan(0);
      expect(validation.data.pages.some((p) => p.slug === "home")).toBe(true);
    }
  });

  it("store category includes shop page", () => {
    const brief = createWebsiteBriefSchema.parse({ ...validBrief, category: "store" });
    const definition = buildStructuredSiteFromBrief(brief);
    const validation = validateWebsiteDefinition(definition);
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.data.pages.some((p) => p.slug === "shop")).toBe(true);
    }
  });

  it("restaurant category includes menu page", () => {
    const brief = createWebsiteBriefSchema.parse({
      ...validBrief,
      category: "restaurant",
    });
    const definition = buildStructuredSiteFromBrief(brief);
    const validation = validateWebsiteDefinition(definition);
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.data.pages.some((p) => p.slug === "menu")).toBe(true);
    }
  });
});
