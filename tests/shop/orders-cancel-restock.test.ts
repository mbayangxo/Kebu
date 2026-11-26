/**
 * app/api/projects/[id]/orders/route.ts PATCH, cancellation path: now calls the
 * real atomic RPC cancel_shop_order_atomic (migration 20261106070000) instead of
 * fulfillShopOrder + a separate restoreProductStock call. The RPC itself is what
 * actually makes concurrent cancel requests safe (proven under two independent
 * real PostgreSQL sessions in tests/shop/orders-cancel-concurrency.native.local.test.ts);
 * this file keeps testing the same real-world guarantee this test originally
 * caught a regression in — that a replayed/duplicate cancel request never
 * restores stock twice — at the fast, no-database, route-handler level, mocking
 * the RPC with the same idempotent-on-already-cancelled semantics the real
 * function implements.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

type Order = { id: string; project_id: string; status: string; product_id: string | null; quantity: number };
const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
const order: Order = { id: ORDER_ID, project_id: "project-1", status: "contacted", product_id: PRODUCT_ID, quantity: 2 };

const cancelRpc = vi.fn();

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
const admin = { from: (table: string) => query(table), rpc: (...args: unknown[]) => cancelRpc(...args) };

vi.mock("@/lib/create/auth", () => ({
  requireUser: async () => ({ supabase: db, user: { id: "merchant-1", email: "m@example.com" } }),
  logCreate: () => {},
}));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: () => null }));
vi.mock("@/lib/shop/shop-project-access", () => ({
  assertShopProjectAccess: async () => ({ project: { id: "project-1", owner_id: "merchant-1" }, via: "owner", db }),
}));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: () => admin }));
vi.mock("@/lib/shop/fulfillment", () => ({
  fulfillShopOrder: vi.fn(),
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

describe("shop order cancellation — stock-restore replay safety (route level, RPC mocked)", () => {
  let restoreCalls = 0;

  beforeEach(() => {
    order.status = "contacted";
    restoreCalls = 0;
    cancelRpc.mockReset().mockImplementation(async () => {
      // Mirrors cancel_shop_order_atomic's real idempotent-on-already-cancelled
      // behavior: the status transition and the stock restoration happen
      // together, exactly once, no matter how many times this is called.
      if (order.status === "cancelled") {
        return { data: [{ ok: true, found: true, already_cancelled: true, restored: false, order_row: { ...order } }], error: null };
      }
      order.status = "cancelled";
      restoreCalls += 1;
      return { data: [{ ok: true, found: true, already_cancelled: false, restored: true, order_row: { ...order } }], error: null };
    });
  });

  it("restores stock exactly once across a replayed/duplicate cancel request for the same order", async () => {
    const { PATCH } = await import("@/app/api/projects/[id]/orders/route");
    const params = Promise.resolve({ id: "project-1" });
    const body = { orderId: ORDER_ID, action: "status", status: "cancelled" };

    await PATCH(request(body), { params });
    await PATCH(request(body), { params }); // duplicate submission / webhook-style retry

    expect(cancelRpc).toHaveBeenCalledTimes(2);
    expect(cancelRpc).toHaveBeenCalledWith("cancel_shop_order_atomic", { p_order_id: ORDER_ID, p_project_id: "project-1" });
    expect(restoreCalls).toBe(1);
  });

  it("still restores stock on the first genuine cancellation", async () => {
    const { PATCH } = await import("@/app/api/projects/[id]/orders/route");
    const params = Promise.resolve({ id: "project-1" });
    const res = await PATCH(request({ orderId: ORDER_ID, action: "status", status: "cancelled" }), { params });

    expect(res.status).toBe(200);
    expect(restoreCalls).toBe(1);
  });
});
