import { expect, it } from "vitest";
import { planReplenishment } from "@/lib/inventory/replenishment";

const store = { storeId: "harlem", sku: "vanilla-pint", onHand: 10, reserved: 0, incoming: 0, minimum: 20, target: 50, priority: 1 };
const warehouse = { sku: "vanilla-pint", onHand: 35, reserved: 5, safetyStock: 5 };

it("uses warehouse stock first and sends only the shortfall to supplier review", () => {
  expect(planReplenishment([store], [warehouse])).toMatchObject([{ needed: 40, transferDraft: 25, supplierDraft: 15 }]);
});

it("does not allocate the same warehouse stock twice or duplicate orders in transit", () => {
  expect(planReplenishment([{ ...store, storeId: "bronx", priority: 2 }, store], [warehouse]))
    .toMatchObject([{ storeId: "harlem", transferDraft: 25 }, { storeId: "bronx", transferDraft: 0, supplierDraft: 40 }]);
  expect(planReplenishment([{ ...store, incoming: 40 }], [warehouse])).toEqual([]);
});

it("holds supplier drafts when the warehouse balance is unknown", () => {
  expect(planReplenishment([store], [])).toMatchObject([{ warehouseCheckRequired: true, supplierDraft: 0 }]);
});

it("rejects duplicate store inputs", () => {
  expect(() => planReplenishment([store, store], [warehouse])).toThrow(/duplicate/);
});
