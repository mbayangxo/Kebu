import { describe, expect, it } from "vitest";
import {
  SELLER_TRUST_PRODUCTS_WITHOUT_KEBU_ID,
  sellerTrustDenyJokoMessage,
  sellerTrustDenyProductMessage,
  type SellerTrustSnapshot,
} from "@/lib/shop/seller-trust";
import { senegalLegalStructures } from "@/lib/kebu-id/countries/sn-legal-structures";

function baseTrust(partial: Partial<SellerTrustSnapshot>): SellerTrustSnapshot {
  return {
    projectId: "p1",
    businessId: null,
    hasKebuId: false,
    kebuPublicId: null,
    afriqueIdPresent: false,
    afriquePublicId: null,
    eligibilityStatus: "missing",
    label: "test",
    nextAction: null,
    nextActionHref: null,
    canEnableJoko: false,
    canAddProduct: false,
    productCount: 3,
    productSoftLimitWithoutKebuId: SELLER_TRUST_PRODUCTS_WITHOUT_KEBU_ID,
    reasonsBlocked: [],
    ...partial,
  };
}

describe("commerce rails #3 seller trust", () => {
  it("includes informal_unregistered for Senegal", () => {
    expect(senegalLegalStructures.some((s) => s.code === "informal_unregistered")).toBe(true);
  });

  it("soft-limits products without Kebu ID", () => {
    expect(SELLER_TRUST_PRODUCTS_WITHOUT_KEBU_ID).toBe(3);
    const msg = sellerTrustDenyProductMessage(baseTrust({ productCount: 3 }));
    expect(msg).toMatch(/Kebu ID/);
    expect(msg).toMatch(/3/);
  });

  it("denies Joko without Kebu ID or AfriID honestly", () => {
    expect(sellerTrustDenyJokoMessage(baseTrust({ hasKebuId: false }))).toMatch(/Kebu ID/);
    expect(
      sellerTrustDenyJokoMessage(
        baseTrust({ hasKebuId: true, businessId: "b1", afriqueIdPresent: false }),
      ),
    ).toMatch(/AfriID/);
  });
});
