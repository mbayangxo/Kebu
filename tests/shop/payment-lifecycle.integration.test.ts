import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

type Order = {
  id: string; project_id: string; payment_status: string; provider_payment_id: string | null;
  amount_xof: number; payment_provider: string; payment_preference: string; status: string;
};
const order: Order = {
  id: "order-1", project_id: "project-1", payment_status: "awaiting_payment",
  provider_payment_id: null, amount_xof: 12500, payment_provider: "paystack",
  payment_preference: "card", status: "pending",
};
const ledger: Record<string, unknown>[] = [];
const rpc = vi.fn();
const fulfillPaidDigitalOrder = vi.fn();

function query(table: string) {
  const state: { patch?: Record<string, unknown> } = {};
  type QueryChain = {
    select: () => QueryChain;
    eq: () => QueryChain;
    maybeSingle: () => Promise<{ data: Order | null; error: null }>;
    update: (patch: Record<string, unknown>) => QueryChain;
    insert: (row: Record<string, unknown>) => Promise<{ error: null }>;
    then: (resolve: (v: unknown) => void) => Promise<void>;
  };
  const chain = {} as QueryChain;
  Object.assign(chain, {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: table === "shop_orders" ? { ...order } : null, error: null }),
    update: (patch: Record<string, unknown>) => { state.patch = patch; return chain; },
    insert: async (row: Record<string, unknown>) => { if (table === "shop_payment_ledger_events") ledger.push(row); return { error: null }; },
    then: (resolve: (v: unknown) => void) => {
      if (table === "shop_orders" && state.patch) Object.assign(order, state.patch);
      return Promise.resolve({ data: null, error: null }).then(resolve);
    },
  });
  return chain;
}
type AdminMock = {
  from: (table: string) => ReturnType<typeof query>;
  rpc: (...args: unknown[]) => ReturnType<typeof rpc>;
};
const admin: AdminMock = { from: (table: string) => query(table), rpc: (...args: unknown[]) => rpc(...args) };

vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: () => admin }));
vi.mock("@/lib/shop/digital-downloads", () => ({
  fulfillPaidDigitalOrder: (...args: unknown[]) => fulfillPaidDigitalOrder(...args),
}));

function request(raw: string, signature: string): NextRequest {
  return new Request("http://localhost/api/webhooks/paystack", {
    method: "POST", body: raw, headers: { "x-paystack-signature": signature },
  }) as unknown as NextRequest;
}

describe("payment lifecycle: verified webhook → paid order → ledger → fulfillment", () => {
  beforeEach(() => {
    order.payment_status = "awaiting_payment";
    order.provider_payment_id = null;
    order.status = "pending";
    ledger.length = 0;
    rpc.mockReset().mockImplementation(async (name: string) =>
      name === "commit_shop_checkout" ? { data: true, error: null } : { data: null, error: null },
    );
    fulfillPaidDigitalOrder.mockReset().mockResolvedValue(undefined);
    process.env.PAYSTACK_SECRET_KEY = "sk_test_lifecycle";
  });

  it("commits the reservation before marking paid and fulfills after verified payment", async () => {
    const { POST } = await import("@/app/api/webhooks/paystack/route");
    const raw = JSON.stringify({
      event: "charge.success",
      data: { status: "success", reference: "shop_card_order1", id: 987, metadata: { kebu_reference: "shop_card_order1" } },
    });
    const signature = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(raw).digest("hex");
    const res = await POST(request(raw, signature));

    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("commit_shop_checkout", { p_order_id: "order-1" });
    expect(order.payment_status).toBe("paid");
    expect(order.status).toBe("contacted");
    expect(order.provider_payment_id).toBe("987");
    expect(ledger).toEqual(expect.arrayContaining([
      expect.objectContaining({ order_id: "order-1", event_type: "paid", rail: "paystack", amount_xof: 12500 }),
    ]));
    expect(fulfillPaidDigitalOrder).toHaveBeenCalledWith(admin, "order-1");
  });

  it("is idempotent for duplicate provider webhooks", async () => {
    const { POST } = await import("@/app/api/webhooks/paystack/route");
    const raw = JSON.stringify({
      event: "charge.success",
      data: { status: "success", reference: "shop_card_order1", id: 987, metadata: { kebu_reference: "shop_card_order1" } },
    });
    const signature = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(raw).digest("hex");
    expect((await POST(request(raw, signature))).status).toBe(200);
    expect((await POST(request(raw, signature))).status).toBe(200);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(ledger.filter((row) => row.event_type === "paid")).toHaveLength(1);
    expect(order.payment_status).toBe("paid");
  });

  it("does not mutate payment state when reservation commit fails", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const { POST } = await import("@/app/api/webhooks/paystack/route");
    const raw = JSON.stringify({
      event: "charge.success",
      data: { status: "success", reference: "shop_card_order1", id: 987, metadata: { kebu_reference: "shop_card_order1" } },
    });
    const signature = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(raw).digest("hex");
    const res = await POST(request(raw, signature));

    expect(res.status).toBe(404);
    expect(order.payment_status).toBe("awaiting_payment");
    expect(ledger).toHaveLength(0);
    expect(fulfillPaidDigitalOrder).not.toHaveBeenCalled();
  });
});
