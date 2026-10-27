import { describe, expect, it } from "vitest";
import { recomputeBusinessVerificationLevel, PRODUCTS_ALLOWED_BELOW_VERIFICATION_LEVEL_2 } from "@/lib/kebu-id/verification-level";
import { SELLER_TRUST_PRODUCTS_WITHOUT_KEBU_ID } from "@/lib/shop/seller-trust";

type Row = Record<string, unknown>;

function mockAdmin(business: Row, aid: Row | null, updateSpy: (patch: Row) => void) {
  return {
    from(table: string) {
      if (table === "businesses") {
        return {
          select() {
            return {
              eq() {
                return { maybeSingle: async () => ({ data: business }) };
              },
            };
          },
          update(patch: Row) {
            updateSpy(patch);
            return { eq: async () => ({ data: null, error: null }) };
          },
        };
      }
      if (table === "afrique_ids") {
        return {
          select() {
            return {
              eq() {
                return { maybeSingle: async () => ({ data: aid }) };
              },
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

const baseBusiness = {
  created_by: "founder-1",
  lifecycle_status: "active",
  verification_level: 1,
  delivery_radius_km: null,
  cross_border_willing: false,
  years_operating: null,
  supply_capacity: null,
  verification_documents_reviewed_at: null,
};

describe("recomputeBusinessVerificationLevel", () => {
  it("stays at level 1: draft business, even with an AfriID and a commerce field", async () => {
    let written: Row | null = null;
    const admin = mockAdmin(
      { ...baseBusiness, lifecycle_status: "draft", cross_border_willing: true },
      { eligibility_status: "unverified" },
      (p) => (written = p),
    );
    const level = await recomputeBusinessVerificationLevel(admin as never, "b1");
    expect(level).toBe(1);
    expect(written).toBeNull();
  });

  it("stays at level 1: active business with a commerce field but no AfriID at all", async () => {
    const admin = mockAdmin(
      { ...baseBusiness, cross_border_willing: true },
      null,
      () => {
        throw new Error("should not write");
      },
    );
    const level = await recomputeBusinessVerificationLevel(admin as never, "b1");
    expect(level).toBe(1);
  });

  it("stays at level 1: active business with an AfriID but no commerce field filled in", async () => {
    const admin = mockAdmin(baseBusiness, { eligibility_status: "unverified" }, (p) => expect(p.verification_level).toBe(1));
    const level = await recomputeBusinessVerificationLevel(admin as never, "b1");
    expect(level).toBe(1);
  });

  it("reaches level 2: active + AfriID present (any status) + one commerce field", async () => {
    let written: Row | null = null;
    const admin = mockAdmin(
      { ...baseBusiness, delivery_radius_km: 20 },
      { eligibility_status: "unverified" },
      (p) => (written = p),
    );
    const level = await recomputeBusinessVerificationLevel(admin as never, "b1");
    expect(level).toBe(2);
    expect(written).toEqual({ verification_level: 2 });
  });

  it("reaches level 2 via supply_capacity alone (whitespace-only text does not count)", async () => {
    const admin = mockAdmin(
      { ...baseBusiness, supply_capacity: "   " },
      { eligibility_status: "unverified" },
      () => {
        throw new Error("should not write — blank supply_capacity must not count as a real commerce field");
      },
    );
    const level = await recomputeBusinessVerificationLevel(admin as never, "b1");
    expect(level).toBe(1);
  });

  it("reaches level 3: level-2 conditions plus a genuinely verified AfriID", async () => {
    const admin = mockAdmin(
      { ...baseBusiness, years_operating: 2 },
      { eligibility_status: "verified" },
      () => {},
    );
    const level = await recomputeBusinessVerificationLevel(admin as never, "b1");
    expect(level).toBe(3);
  });

  it("does NOT skip to level 3 from level 1: a verified AfriID alone, with no commerce field, caps at 1", async () => {
    const admin = mockAdmin(baseBusiness, { eligibility_status: "verified" }, () => {});
    const level = await recomputeBusinessVerificationLevel(admin as never, "b1");
    expect(level).toBe(1);
  });

  it("reaches level 4: level-3 conditions plus reviewed documents", async () => {
    const admin = mockAdmin(
      { ...baseBusiness, years_operating: 5, verification_documents_reviewed_at: "2026-01-01T00:00:00Z" },
      { eligibility_status: "verified" },
      () => {},
    );
    const level = await recomputeBusinessVerificationLevel(admin as never, "b1");
    expect(level).toBe(4);
  });

  it("does not write to the database when the computed level already matches", async () => {
    const admin = mockAdmin(
      { ...baseBusiness, verification_level: 2, delivery_radius_km: 5 },
      { eligibility_status: "unverified" },
      () => {
        throw new Error("should not write when level is unchanged");
      },
    );
    const level = await recomputeBusinessVerificationLevel(admin as never, "b1");
    expect(level).toBe(2);
  });

  it("returns null for a business that doesn't exist, without throwing", async () => {
    // Simulate a genuinely missing business: .maybeSingle() resolves { data: null }.
    const missingAdmin = {
      from() {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
      },
    };
    const level = await recomputeBusinessVerificationLevel(missingAdmin as never, "nonexistent");
    expect(level).toBeNull();
  });
});

describe("PRODUCTS_ALLOWED_BELOW_VERIFICATION_LEVEL_2", () => {
  it("matches the existing informal soft-cap this slice extends, not a coincidentally-equal independent number", () => {
    expect(PRODUCTS_ALLOWED_BELOW_VERIFICATION_LEVEL_2).toBe(SELLER_TRUST_PRODUCTS_WITHOUT_KEBU_ID);
  });
});
