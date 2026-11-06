/**
 * app/api/projects/[id]/orders/route.ts PATCH: the stock-restore guard on
 * cancellation checks `action === "status" && status === "cancelled"` with
 * no check that the order wasn't *already* cancelled — unlike its sibling
 * disjunct, which does check `existing.status !== "cancelled"`. A replayed
 * or double-submitted cancel request (same order, same action) re-enters
 * that first branch every time and restores stock again, inflating
 * stock_qty beyond what was ever actually decremented. This reproduces it
 * by calling PATCH twice with an identical cancel payload and proves
 * restoreProductStock fires exactly once.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

type Order = { id: string; project_id: string; status: string; product_id: string | null; quantity: number };
const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
const order: Order = { id: ORDER_ID, project_id: "project-1", status: "contacted", product_id: PRODUCT_ID, quantity: 2 };

const restoreProductStock = vi.fn().mockResolvedValue(undefined);
const fulfillShopOrder = vi.fn();

function query(table: string) {
  type Chain = {
    select: () => Chain;
    eq: () => Chain;
    order: () => Chain;
    limit: () => Chain;
    maybeSingle: () => Promise<{ data: unknown; error: null }>;
  };
  const chain = {} as Chain;
  Object.assign(chain, {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => {
      if (table === "shop_orders") return { data: { ...order }, error: null };
      if (table === "shop_order_items") return { data: [], error: null };
      return { data: null, error: null };
    },
  });
  return chain;
}
const db = { from: (table: string) => query(table) };
const admin = { from: (table: string) => query(table) };

vi.mock("@/lib/create/auth", () => ({
  requireUser: async () => ({ supabase: db, user: { id: "merchant-1", email: "m@example.com" } }),
  logCreate: () => {},
}));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: () => null }));
vi.mock("@/lib/shop/shop-project-access", () => ({
  assertShopProjectAccess: async () => ({ project: { id: "project-1", owner_id: "merchant-1" }, via: "owner", db }),
}));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: () => admin }));
vi.mock("@/lib/shop/stock", () => ({ restoreProductStock: (...args: unknown[]) => restoreProductStock(...args) }));
vi.mock("@/lib/shop/fulfillment", () => ({
  fulfillShopOrder: (...args: unknown[]) => fulfillShopOrder(...args),
  SHOP_ORDER_FULFILL_STATUSES: ["new", "contacted", "fulfilled", "cancelled", "archived"],
}));
vi.mock("@/lib/shop/carriers", () => ({ SHOP_CARRIERS: [] }));

function request(body: unknown): NextRequest {
  return new Request("http://localhost/api/projects/project-1/orders", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

describe("shop order cancellation — stock-restore replay safety", () => {
  beforeEach(() => {
    order.status = "contacted";
    restoreProductStock.mockClear();
    fulfillShopOrder.mockReset().mockImplementation(async () => {
      order.status = "cancelled"; // the real fulfillShopOrder would persist this
      return {
        ok: true,
        order: { ...order },
        whatsappHref: null,
        emailed: false,
        smsSent: false,
      };
    });
  });

  it("restores stock exactly once across a replayed/duplicate cancel request for the same order", async () => {
    const { PATCH } = await import("@/app/api/projects/[id]/orders/route");
    const params = Promise.resolve({ id: "project-1" });
    const body = { orderId: ORDER_ID, action: "status", status: "cancelled" };

    await PATCH(request(body), { params });
    await PATCH(request(body), { params }); // duplicate submission / webhook-style retry

    expect(restoreProductStock).toHaveBeenCalledTimes(1);
    expect(restoreProductStock).toHaveBeenCalledWith(admin, PRODUCT_ID, 2);
  });

  it("still restores stock on the first genuine cancellation", async () => {
    const { PATCH } = await import("@/app/api/projects/[id]/orders/route");
    const params = Promise.resolve({ id: "project-1" });
    const res = await PATCH(request({ orderId: ORDER_ID, action: "status", status: "cancelled" }), { params });

    expect(res.status).toBe(200);
    expect(restoreProductStock).toHaveBeenCalledTimes(1);
  });
});
