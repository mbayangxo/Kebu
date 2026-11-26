import { describe, expect, it } from "vitest";
import {
  computeJokoFulfillmentCommissionXof,
  DEFAULT_JOKO_FULFILLMENT_COMMISSION_BPS,
} from "@/lib/shop/joko-fulfillment";

describe("computeJokoFulfillmentCommissionXof", () => {
  it("uses the platform default rate when a seller hasn't set their own", () => {
    const commission = computeJokoFulfillmentCommissionXof(10_000, null);
    expect(commission).toBe(Math.round((10_000 * DEFAULT_JOKO_FULFILLMENT_COMMISSION_BPS) / 10_000));
  });

  it("uses the seller's own commission rate when set", () => {
    expect(computeJokoFulfillmentCommissionXof(10_000, 1000)).toBe(1000); // 10%
  });

  it("is a share of the order subtotal, not of the shipping fee — callers must pass subtotal only", () => {
    // 20% of a 5,000 XOF subtotal, independent of whatever the shipping fee was.
    expect(computeJokoFulfillmentCommissionXof(5_000, 2000)).toBe(1000);
  });

  it("returns 0 for a non-positive or missing subtotal — never a negative or NaN commission", () => {
    expect(computeJokoFulfillmentCommissionXof(0, 1000)).toBe(0);
    expect(computeJokoFulfillmentCommissionXof(-500, 1000)).toBe(0);
    expect(computeJokoFulfillmentCommissionXof(Number.NaN, 1000)).toBe(0);
  });

  it("rounds to the nearest whole XOF", () => {
    expect(computeJokoFulfillmentCommissionXof(333, 1000)).toBe(33); // 33.3 → 33
  });
});
