import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("@/lib/shop/codes", () => ({ allocateShopOrderNumber: async () => "ORD-TEST" }));
vi.mock("@/lib/shop/discounts", () => ({ resolveActiveDiscount: async () => ({ ok: true, discount: null }) }));
vi.mock("@/lib/shop/affiliates", () => ({ resolveAffiliateCodeForAttribution: async () => null }));
vi.mock("@/lib/shop/gift-cards", () => ({ resolveActiveGiftCard: async () => ({ ok: true, card: null }) }));
vi.mock("@/lib/shop/shipping-options", () => ({ resolveShippingOptionForOrder: async () => ({ id: "option", label: "Pickup", amountXof: 1000, fulfillmentType: "joko_fulfillment", commissionBps: 1500 }) }));
vi.mock("@/lib/shop/customer-profiles", () => ({ upsertShopCustomerAfterOrder: async () => {} }));
import { createCartOrder } from "@/lib/shop/cart-order";
import { listOpenFulfillmentOrders, listFulfillmentOrdersForProject } from "@/lib/shop/joko-fulfillment";

const rpc = vi.fn();
const from = vi.fn<(table: string) => { insert: ReturnType<typeof vi.fn> }>(() => ({ insert: vi.fn(async () => ({ error: null })) }));
const admin = { rpc, from } as unknown as SupabaseClient;
const opts = { admin, projectId: "project", customerName: "Awa", customerPhone: "221770000000", customerNote: "", customerEmail: null, paymentPreference: "paystack", shippingOptionId: "option", lines: [{ productId: "product", variantId: null, variantName: null, productName: "Book", upc: null, sku: null, priceLabel: "10000 XOF", priceXof: 10000, quantity: 1, lineAmountXof: 10000 }] };
beforeEach(() => { vi.clearAllMocks(); });
describe("real cart checkout's fulfillment dependency", () => {
  it("stops checkout on a missing RPC, without a fallback order or item write", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "function missing" } });
    const result = await createCartOrder(opts);
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("unavailable") });
    expect(from).not.toHaveBeenCalled();
  });
  it("also stops on network failure and malformed success", async () => {
    rpc.mockRejectedValueOnce(new Error("network"));
    expect((await createCartOrder(opts)).ok).toBe(false);
    rpc.mockResolvedValueOnce({ data: {}, error: null });
    expect((await createCartOrder(opts)).ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });
  it("uses the atomic result and excludes the shipping fee from commission", async () => {
    rpc.mockResolvedValue({ data: { id: "saved", order_number: "ORD-TEST", gift_public_id: null }, error: null });
    expect(await createCartOrder(opts)).toMatchObject({ ok: true, orderId: "saved", amountXof: 11000 });
    expect(rpc).toHaveBeenCalledWith("create_shop_order_with_fulfillment", { p_order: expect.objectContaining({ id: expect.any(String), amount_xof: 11000, shipping_amount_xof: 1000 }), p_commission_xof: 1500 });
    expect(from.mock.calls.map(([table]) => table)).not.toContain("shop_orders");
    expect(from.mock.calls.map(([table]) => table)).not.toContain("shop_fulfillment_orders");
  });
});
function unavailableDb() {
  const query: Record<string, unknown> = {};
  for (const name of ["select", "eq", "in", "order"]) query[name] = () => query;
  query.limit = async () => ({ data: null, error: { message: 'relation "shop_fulfillment_orders" does not exist' } });
  return { from: () => query } as unknown as SupabaseClient;
}
describe("fulfillment read failure states", () => {
  it("reports missing schema to ops instead of claiming an empty healthy queue", async () => {
    expect(await listOpenFulfillmentOrders(unavailableDb())).toMatchObject({ ok: false });
  });
  it("does not tell a seller missing schema means no fulfillment orders", async () => {
    await expect(listFulfillmentOrdersForProject(unavailableDb(), "project")).rejects.toThrow(/does not exist/);
  });
});

describe("fulfillment outcome queue", () => {
  it("makes terminal orders retrievable for the existing refund action without crowding the active queue", async () => {
    const inStatus = vi.fn();
    const sort = vi.fn();
    const query = {
      select: () => query,
      in: (key: string, values: string[]) => { inStatus(key, values); return query; },
      order: (key: string, direction: unknown) => { sort(key, direction); return query; },
      limit: async () => ({ data: [], error: null }),
    };
    const client = { from: () => query } as unknown as SupabaseClient;
    await listOpenFulfillmentOrders(client, "outcomes");
    expect(inStatus).toHaveBeenLastCalledWith("status", ["failed_delivery", "returned", "cancelled"]);
    expect(sort).toHaveBeenLastCalledWith("created_at", { ascending: false });
    await listOpenFulfillmentOrders(client);
    expect(inStatus).toHaveBeenLastCalledWith("status", ["awaiting_pickup", "picked_up", "in_transit", "delivered"]);
    expect(sort).toHaveBeenLastCalledWith("created_at", { ascending: true });
  });
});
