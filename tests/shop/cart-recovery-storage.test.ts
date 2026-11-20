import { expect, it } from "vitest";
import { readPendingCheckout, rememberCheckout, forgetCheckout, checkoutRecoveryKey } from "@/lib/create/shop-checkout-recovery";

const id = "00000000-0000-4000-8000-000000000004";
const other = "00000000-0000-4000-8000-000000000005";
it("persists only the receipt capability and refuses to replace an uncertain checkout", () => {
  const data = new Map<string, string>();
  const storage = { get length() { return data.size; }, clear: () => data.clear(), key: (index: number) => [...data.keys()][index] ?? null, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) } as Storage;
  rememberCheckout(storage, "shop", id);
  expect([...data.values()]).toEqual([id]);
  expect(readPendingCheckout(storage, "shop")).toBe(id);
  expect(readPendingCheckout(storage, "other-shop")).toBe(null);
  expect(() => rememberCheckout(storage, "shop", other)).toThrow(/previous checkout/);
  forgetCheckout(storage, "shop", other);
  expect(readPendingCheckout(storage, "shop")).toBe(id);
  forgetCheckout(storage, "shop", id);
  expect(readPendingCheckout(storage, "shop")).toBe(null);
  data.set(checkoutRecoveryKey("shop"), "corrupt");
  expect(() => readPendingCheckout(storage, "shop")).toThrow(/Contact the store/);
});

it("never sends an order on behalf of storage that silently drops writes", () => {
  const storage = { getItem: () => null, setItem: () => undefined } as unknown as Storage;
  expect(() => rememberCheckout(storage, "shop", id)).toThrow(/No order was sent/);
});
