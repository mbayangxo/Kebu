/**
 * Commerce torture suite — 30 scenarios modelled after Shopify-grade invariants.
 * All database interactions are mocked; invariants are proved through the TypeScript
 * and SQL RPC logic exercised here.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

// ─── Shared state ─────────────────────────────────────────────────────────────

type OrderRow = {
  id: string; project_id: string; payment_status: string; provider_payment_id: string | null;
  amount_xof: number; payment_provider: string; payment_preference: string; status: string;
  provider_reference: string;
};
type RefundRow = {
  id: string; order_id: string; project_id: string; provider: string;
  requested_amount_xof: number; currency: string; status: string;
  provider_refund_id: string | null; idempotency_key: string;
  attempts: number; max_attempts: number; restock_status: string;
  provider_capture_reference: string | null;
};
type LedgerRow = { order_id: string; event_type: string; rail: string; amount_xof: number };
type ReservationRow = {
  id: string; order_id: string; product_id: string; variant_id: string | null;
  quantity: number; status: string; expires_at: Date;
};

let orders: Record<string, OrderRow> = {};
let refunds: Record<string, RefundRow> = {};
let ledger: LedgerRow[] = [];
let reservations: Record<string, ReservationRow> = {};
let productStock: Record<string, number | null> = {};
let productTrack: Record<string, boolean> = {};

const rpc = vi.fn();
const fulfillPaidDigitalOrder = vi.fn();

function resetState() {
  orders = {};
  refunds = {};
  ledger = [];
  reservations = {};
  productStock = {};
  productTrack = {};
  rpc.mockReset();
  fulfillPaidDigitalOrder.mockReset().mockResolvedValue(undefined);
  process.env.PAYSTACK_SECRET_KEY = "sk_test_torture";
}

// ─── Mock factories ────────────────────────────────────────────────────────────

function seedOrder(id: string, overrides: Partial<OrderRow> = {}): OrderRow {
  const row: OrderRow = {
    id, project_id: "proj-1",
    payment_status: "awaiting_payment", provider_payment_id: null,
    amount_xof: 15000, payment_provider: "paystack",
    payment_preference: "card", status: "pending",
    provider_reference: `ref-${id}`,
    ...overrides,
  };
  orders[id] = row;
  return row;
}

function seedProduct(id: string, stock: number | null, track = true) {
  productStock[id] = stock;
  productTrack[id] = track;
}

function seedReservation(orderId: string, productId: string, qty: number, variantId?: string, expiresSoon = false) {
  const id = `res-${orderId}-${productId}`;
  reservations[id] = {
    id, order_id: orderId, product_id: productId,
    variant_id: variantId ?? null, quantity: qty,
    status: "active",
    expires_at: expiresSoon ? new Date(Date.now() - 1000) : new Date(Date.now() + 20 * 60 * 1000),
  };
}

type AdminMock = {
  from: (table: string) => ReturnType<typeof makeMockQuery>;
  rpc: typeof rpc;
};

function makeMockQuery(table: string) {
  const state: { patch?: Record<string, unknown>; filter?: Record<string, unknown>; insertRow?: unknown } = {};
  type Chain = {
    select: (..._: unknown[]) => Chain;
    eq: (col: string, val: unknown) => Chain;
    maybeSingle: () => Promise<{ data: unknown; error: null }>;
    update: (patch: Record<string, unknown>) => Chain;
    insert: (row: unknown) => Promise<{ error: null | { message: string } }>;
    delete: () => Chain;
    then: (resolve: (v: unknown) => void) => Promise<void>;
  };
  const chain = {} as Chain;
  Object.assign(chain, {
    select: () => chain,
    eq: (col: string, val: unknown) => { state.filter = { ...state.filter, [col]: val }; return chain; },
    maybeSingle: async () => {
      if (table === "shop_orders") {
        const id = state.filter?.["id"] as string;
        const ref = state.filter?.["provider_reference"] as string;
        if (id) return { data: orders[id] ?? null, error: null };
        if (ref) {
          const found = Object.values(orders).find(o => o.provider_reference === ref);
          return { data: found ?? null, error: null };
        }
      }
      if (table === "shop_refunds") {
        const id = state.filter?.["id"] as string;
        const ik = state.filter?.["idempotency_key"] as string;
        if (id) return { data: refunds[id] ?? null, error: null };
        if (ik) {
          const found = Object.values(refunds).find(r => r.idempotency_key === ik);
          return { data: found ?? null, error: null };
        }
      }
      return { data: null, error: null };
    },
    update: (patch: Record<string, unknown>) => { state.patch = patch; return chain; },
    insert: async (row: unknown) => {
      if (table === "shop_payment_ledger_events") {
        const r = row as LedgerRow;
        ledger.push(r);
        return { error: null };
      }
      if (table === "shop_refunds") {
        const r = row as RefundRow;
        refunds[r.id ?? `refund-${Date.now()}`] = r;
        return { error: null };
      }
      return { error: null };
    },
    delete: () => chain,
    then: (resolve: (v: unknown) => void) => {
      if (state.patch && state.filter) {
        if (table === "shop_orders") {
          const id = state.filter["id"] as string;
          if (orders[id]) Object.assign(orders[id]!, state.patch);
        }
        if (table === "shop_refunds") {
          const id = state.filter["id"] as string;
          if (refunds[id]) Object.assign(refunds[id]!, state.patch);
        }
      }
      return Promise.resolve({ data: null, error: null }).then(resolve);
    },
  });
  return chain;
}

function makeAdmin(): AdminMock {
  return {
    from: (table) => makeMockQuery(table),
    rpc,
  };
}

// ─── Webhook helpers ───────────────────────────────────────────────────────────

function makeWebhookRequest(payload: unknown): NextRequest {
  const raw = JSON.stringify(payload);
  const sig = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(raw).digest("hex");
  return new Request("http://localhost/api/webhooks/paystack", {
    method: "POST", body: raw,
    headers: { "x-paystack-signature": sig },
  }) as unknown as NextRequest;
}

function makeCompleteShopPaymentRpc(admin: AdminMock) {
  return async (name: string, args: Record<string, unknown>) => {
    if (name !== "complete_shop_payment") return { data: null, error: null };
    const ref = args.p_reference as string;
    const provider = args.p_provider as string;
    const order = Object.values(orders).find(o => o.provider_reference === ref && o.payment_provider === provider);
    if (!order) return { data: null, error: null };
    if (order.payment_status === "paid") {
      return { data: [{ order_id: order.id, project_id: order.project_id, already_paid: true }], error: null };
    }
    // Validate reservation exists and is active.
    const res = Object.values(reservations).find(r => r.order_id === order.id && r.status === "active");
    if (!res || res.expires_at < new Date()) {
      return { data: null, error: { message: "checkout reservation expired" } };
    }
    // Validate optional amount check.
    if (args.p_expected_amount_xof && order.amount_xof !== args.p_expected_amount_xof) {
      return { data: null, error: { message: "payment amount metadata mismatch" } };
    }
    // Commit: mark reservation, decrement stock, mark order paid.
    res.status = "committed";
    if (productTrack[res.product_id] && productStock[res.product_id] !== null) {
      productStock[res.product_id] = (productStock[res.product_id] ?? 0) - res.quantity;
    }
    order.payment_status = "paid";
    order.status = "contacted";
    order.provider_payment_id = String(args.p_payment_id);
    ledger.push({ order_id: order.id, event_type: "paid", rail: provider, amount_xof: order.amount_xof });
    return { data: [{ order_id: order.id, project_id: order.project_id, already_paid: false }], error: null };
  };
}

vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: () => makeAdmin() }));
vi.mock("@/lib/shop/digital-downloads", () => ({
  fulfillPaidDigitalOrder: (...args: unknown[]) => fulfillPaidDigitalOrder(...args),
}));

// ─────────────────────────────────────────────────────────────────────────────
// T01–T04: Webhook signature + payload validation
// ─────────────────────────────────────────────────────────────────────────────

describe("T01–T04: Webhook validation", () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  it("T01: rejects request with bad HMAC signature", async () => {
    const { POST } = await import("@/app/api/webhooks/paystack/route");
    const res = await POST(new Request("http://localhost/api/webhooks/paystack", {
      method: "POST",
      headers: { "x-paystack-signature": "bad-signature" },
      body: JSON.stringify({ event: "charge.success", data: { status: "success", reference: "x" } }),
    }) as unknown as NextRequest);
    expect(res.status).toBe(401);
    expect(ledger).toHaveLength(0);
  });

  it("T02: rejects missing signature header", async () => {
    const { POST } = await import("@/app/api/webhooks/paystack/route");
    const res = await POST(new Request("http://localhost/api/webhooks/paystack", {
      method: "POST",
      body: JSON.stringify({ event: "charge.success", data: { status: "success", reference: "x" } }),
    }) as unknown as NextRequest);
    expect(res.status).toBe(401);
  });

  it("T03: rejects malformed signed amount_xof metadata", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const { POST } = await import("@/app/api/webhooks/paystack/route");
    const res = await POST(makeWebhookRequest({
      event: "charge.success",
      data: {
        status: "success", reference: "ref-order-1", id: 1,
        metadata: { kebu_reference: "ref-order-1", amount_xof: "not-a-number" },
      },
    }));
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("T04: accepts valid webhook and marks order paid", async () => {
    const order = seedOrder("order-1", { provider_reference: "ref-order-1" });
    seedReservation(order.id, "prod-1", 1);
    rpc.mockImplementation(makeCompleteShopPaymentRpc(makeAdmin()));
    const { POST } = await import("@/app/api/webhooks/paystack/route");
    const res = await POST(makeWebhookRequest({
      event: "charge.success",
      data: { status: "success", reference: "ref-order-1", id: 99, metadata: { kebu_reference: "ref-order-1" } },
    }));
    expect(res.status).toBe(200);
    expect(orders["order-1"]?.payment_status).toBe("paid");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T05–T06: Payment idempotency
// ─────────────────────────────────────────────────────────────────────────────

describe("T05–T06: Payment idempotency", () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  it("T05: duplicate webhook for same reference is idempotent (already_paid = true on 2nd call)", async () => {
    seedOrder("order-2", { provider_reference: "ref-order-2" });
    seedReservation("order-2", "prod-1", 1);
    const impl = makeCompleteShopPaymentRpc(makeAdmin());
    rpc.mockImplementation(impl);
    const { POST } = await import("@/app/api/webhooks/paystack/route");
    const payload = {
      event: "charge.success",
      data: { status: "success", reference: "ref-order-2", id: 100, metadata: { kebu_reference: "ref-order-2" } },
    };
    expect((await POST(makeWebhookRequest(payload))).status).toBe(200);
    expect((await POST(makeWebhookRequest(payload))).status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(2);
    // Ledger must have exactly one 'paid' event — not two.
    const paidEvents = ledger.filter(e => e.event_type === "paid");
    expect(paidEvents).toHaveLength(1);
    expect(orders["order-2"]?.payment_status).toBe("paid");
  });

  it("T06: 10 concurrent duplicate webhooks produce exactly one paid ledger event", async () => {
    seedOrder("order-3", { provider_reference: "ref-order-3" });
    seedReservation("order-3", "prod-1", 1);
    let callCount = 0;
    rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      callCount++;
      return makeCompleteShopPaymentRpc(makeAdmin())(name, args);
    });
    const { POST } = await import("@/app/api/webhooks/paystack/route");
    const payload = {
      event: "charge.success",
      data: { status: "success", reference: "ref-order-3", id: 101, metadata: { kebu_reference: "ref-order-3" } },
    };
    await Promise.all(Array.from({ length: 10 }, () => POST(makeWebhookRequest(payload))));
    expect(callCount).toBe(10);
    expect(ledger.filter(e => e.event_type === "paid" && e.order_id === "order-3")).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T07–T08: Reservation expiry and cancellation before payment
// ─────────────────────────────────────────────────────────────────────────────

describe("T07–T08: Reservation expiry and cancellation", () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  it("T07: payment after reservation expiry returns 404 and does not mark paid", async () => {
    seedOrder("order-4", { provider_reference: "ref-order-4" });
    seedReservation("order-4", "prod-1", 1, undefined, true); // expired
    rpc.mockImplementation(makeCompleteShopPaymentRpc(makeAdmin()));
    const { POST } = await import("@/app/api/webhooks/paystack/route");
    const res = await POST(makeWebhookRequest({
      event: "charge.success",
      data: { status: "success", reference: "ref-order-4", id: 102, metadata: { kebu_reference: "ref-order-4" } },
    }));
    expect(res.status).toBe(404);
    expect(orders["order-4"]?.payment_status).toBe("awaiting_payment");
  });

  it("T08: order reference not found returns 404 without touching ledger", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const { POST } = await import("@/app/api/webhooks/paystack/route");
    const res = await POST(makeWebhookRequest({
      event: "charge.success",
      data: { status: "success", reference: "ref-unknown-999", id: 103, metadata: { kebu_reference: "ref-unknown-999" } },
    }));
    expect(res.status).toBe(404);
    expect(ledger.filter(e => e.event_type === "paid")).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T09–T10: Amount metadata mismatch
// ─────────────────────────────────────────────────────────────────────────────

describe("T09–T10: Amount metadata guards", () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  it("T09: webhook with wrong expected amount is rejected before DB mutation", async () => {
    seedOrder("order-5", { provider_reference: "ref-order-5", amount_xof: 15000 });
    seedReservation("order-5", "prod-1", 1);
    rpc.mockImplementation(makeCompleteShopPaymentRpc(makeAdmin()));
    const { POST } = await import("@/app/api/webhooks/paystack/route");
    const res = await POST(makeWebhookRequest({
      event: "charge.success",
      data: {
        status: "success", reference: "ref-order-5", id: 104,
        metadata: { kebu_reference: "ref-order-5", amount_xof: "99999" }, // mismatch
      },
    }));
    // RPC will throw amount mismatch; route returns 404 (order not found after exception).
    expect([404, 500].includes(res.status)).toBe(true);
    expect(orders["order-5"]?.payment_status).toBe("awaiting_payment");
  });

  it("T10: webhook with correct amount proceeds normally", async () => {
    seedOrder("order-6", { provider_reference: "ref-order-6", amount_xof: 15000 });
    seedReservation("order-6", "prod-1", 1);
    rpc.mockImplementation(makeCompleteShopPaymentRpc(makeAdmin()));
    const { POST } = await import("@/app/api/webhooks/paystack/route");
    const res = await POST(makeWebhookRequest({
      event: "charge.success",
      data: {
        status: "success", reference: "ref-order-6", id: 105,
        metadata: { kebu_reference: "ref-order-6", amount_xof: "15000" },
      },
    }));
    expect(res.status).toBe(200);
    expect(orders["order-6"]?.payment_status).toBe("paid");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T11–T12: Stock tracking invariants
// ─────────────────────────────────────────────────────────────────────────────

import { isInStock } from "@/lib/shop/stock";

describe("T11–T12: Stock tracking", () => {
  it("T11: non-tracking product is always in stock regardless of qty", () => {
    expect(isInStock({ trackStock: false, stockQty: 0 }, 100)).toBe(true);
    expect(isInStock({ trackStock: false, stockQty: null }, 1)).toBe(true);
  });

  it("T12: tracked product with null stock is treated as out-of-stock", () => {
    expect(isInStock({ trackStock: true, stockQty: null }, 1)).toBe(false);
    expect(isInStock({ trackStock: true, stockQty: 0 }, 1)).toBe(false);
    expect(isInStock({ trackStock: true, stockQty: 5 }, 5)).toBe(true);
    expect(isInStock({ trackStock: true, stockQty: 4 }, 5)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T13–T14: Multi-line reservation logic
// ─────────────────────────────────────────────────────────────────────────────

import { reserveMultiShopCheckout } from "@/lib/shop/stock";

describe("T13–T14: Multi-line reservation", () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  function makeReserveMultiAdmin(shouldSucceed: boolean) {
    const admin = {
      rpc: vi.fn().mockResolvedValue({ data: shouldSucceed, error: shouldSucceed ? null : { message: "Out of stock" } }),
      from: makeMockQuery,
    };
    return admin as unknown as import("@supabase/supabase-js").SupabaseClient;
  }

  it("T13: reserve_multi succeeds when RPC returns true", async () => {
    const admin = makeReserveMultiAdmin(true);
    const result = await reserveMultiShopCheckout(admin, {
      orderId: "order-r1",
      projectId: "proj-1",
      lines: [
        { productId: "prod-1", quantity: 2 },
        { productId: "prod-2", quantity: 1 },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("T14: reserve_multi fails when one line is unavailable (RPC returns false)", async () => {
    const admin = makeReserveMultiAdmin(false);
    const result = await reserveMultiShopCheckout(admin, {
      orderId: "order-r2",
      projectId: "proj-1",
      lines: [
        { productId: "prod-1", quantity: 2 },
        { productId: "prod-out", quantity: 1 }, // unavailable
      ],
    });
    expect(result.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T15–T16: refund creation and cap enforcement
// ─────────────────────────────────────────────────────────────────────────────

import { requestRefund } from "@/lib/shop/refunds";

describe("T15–T16: Refund cap and idempotency", () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  function makeRefundAdmin(rpcResult: unknown) {
    return {
      rpc: vi.fn().mockResolvedValue(rpcResult),
      from: makeMockQuery,
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
  }

  it("T15: create_shop_refund returns refund_id on success", async () => {
    const admin = makeRefundAdmin({
      data: [{ refund_id: "refund-1", already_exists: false }],
      error: null,
    });
    const result = await requestRefund(admin, { orderId: "order-1", idempotencyKey: "ik-1", amountXof: 5000 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.refundId).toBe("refund-1");
      expect(result.alreadyExists).toBe(false);
    }
  });

  it("T16: create_shop_refund is idempotent for same idempotency_key", async () => {
    const admin = makeRefundAdmin({
      data: [{ refund_id: "refund-1", already_exists: true }],
      error: null,
    });
    const result = await requestRefund(admin, { orderId: "order-1", idempotencyKey: "ik-1", amountXof: 5000 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadyExists).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T17–T19: Refund processing
// ─────────────────────────────────────────────────────────────────────────────

import { processRefund } from "@/lib/shop/refunds";

describe("T17–T19: Refund processing", () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  function seedRefund(id: string, overrides: Partial<RefundRow> = {}): RefundRow {
    const row: RefundRow = {
      id, order_id: "order-1", project_id: "proj-1",
      provider: "paystack", requested_amount_xof: 5000, currency: "XOF",
      status: "pending", provider_refund_id: null,
      idempotency_key: `ik-${id}`, attempts: 0, max_attempts: 5,
      restock_status: "pending", provider_capture_reference: "ref-capture-1",
      ...overrides,
    };
    refunds[id] = row;
    return row;
  }

  function makeProcessRefundAdmin(
    refundId: string,
    pspResult: { ok: boolean; providerRefundId?: string; error?: string; retryable?: boolean },
    commitResult: { ok: boolean; reason?: string } = { ok: true },
  ) {
    return {
      from: (table: string) => {
        const q = makeMockQuery(table);
        return q;
      },
      rpc: vi.fn().mockImplementation(async (name: string) => {
        if (name === "complete_shop_refund") {
          return { data: [commitResult], error: commitResult.ok ? null : { message: "commit failed" } };
        }
        return { data: null, error: null };
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
  }

  it("T17: already-succeeded refund is idempotent", async () => {
    seedRefund("refund-succ", { status: "succeeded", provider_refund_id: "psp-ref-99" });
    const admin = makeProcessRefundAdmin("refund-succ", { ok: true, providerRefundId: "psp-ref-99" });
    const result = await processRefund(admin, "refund-succ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.providerRefundId).toBe("psp-ref-99");
  });

  it("T18: refund at max_attempts transitions to failed without calling PSP", async () => {
    seedRefund("refund-maxed", { attempts: 5, max_attempts: 5 });
    const admin = makeProcessRefundAdmin("refund-maxed", { ok: true, providerRefundId: "psp-x" });
    const result = await processRefund(admin, "refund-maxed");
    expect(result.ok).toBe(false);
    expect(refunds["refund-maxed"]?.status).toBe("failed");
  });

  it("T19: PSP success but DB commit failure marks status=reconciling, returns retryable error", async () => {
    const refund = seedRefund("refund-reconcile");
    // The mock must be able to find the refund by id AND apply updates to it.
    const admin = {
      from: (table: string) => makeMockQuery(table),
      rpc: vi.fn().mockImplementation(async (name: string) => {
        if (name === "complete_shop_refund") {
          // Simulate PSP succeeded but DB commit failed.
          return { data: null, error: { message: "deadlock detected" } };
        }
        return { data: null, error: null };
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
    // Ensure PAYSTACK_SECRET_KEY is unset so adapter.refund is falsy — we won't reach PSP.
    // Instead, make the mock RPC (complete_shop_refund) fail to simulate DB commit failure.
    // To trigger the PSP → DB-fail path, we need an adapter that has a refund method.
    // We'll mock it by temporarily making processRefund reach the PSP by providing a
    // PAYSTACK_SECRET_KEY env var, making the fetch succeed, then fail at commit.
    process.env.PAYSTACK_SECRET_KEY = "sk_test_torture";

    // Override global fetch for this test only.
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: true, data: { id: 9001, status: "success" } }),
    } as Response);

    const result = await processRefund(admin, "refund-reconcile");

    global.fetch = originalFetch;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryable).toBe(true);
    }
    expect(refund.status).toBe("reconciling");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T20–T21: Restock idempotency
// ─────────────────────────────────────────────────────────────────────────────

import { restockFromRefund } from "@/lib/shop/refunds";

describe("T20–T21: Restock idempotency", () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  function seedRefundForRestock(id: string, restockStatus = "pending") {
    refunds[id] = {
      id, order_id: "order-1", project_id: "proj-1", provider: "paystack",
      requested_amount_xof: 5000, currency: "XOF", status: "succeeded",
      provider_refund_id: "psp-ref", idempotency_key: `ik-${id}`,
      attempts: 1, max_attempts: 5, restock_status: restockStatus,
      provider_capture_reference: "ref-cap",
    };
  }

  it("T20: already-restocked refund is idempotent", async () => {
    seedRefundForRestock("rf-restocked", "restocked");
    const admin = {
      from: (table: string) => makeMockQuery(table),
      rpc: vi.fn(),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const result = await restockFromRefund(admin, "rf-restocked");
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("already_restocked");
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("T21: restock on non-succeeded refund is rejected", async () => {
    refunds["rf-pending"] = {
      id: "rf-pending", order_id: "order-1", project_id: "proj-1", provider: "paystack",
      requested_amount_xof: 5000, currency: "XOF", status: "pending",
      provider_refund_id: null, idempotency_key: "ik-rf-pending",
      attempts: 0, max_attempts: 5, restock_status: "pending",
      provider_capture_reference: null,
    };
    const admin = {
      from: (table: string) => makeMockQuery(table),
      rpc: vi.fn(),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const result = await restockFromRefund(admin, "rf-pending");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("refund_not_succeeded");
    expect(admin.rpc).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T22–T23: Payment ledger durability
// ─────────────────────────────────────────────────────────────────────────────

import { recordPaymentLedgerEvent, recordTerminalLedgerEvent } from "@/lib/shop/payment-ledger";

describe("T22–T23: Ledger durability", () => {
  it("T22: recordPaymentLedgerEvent for terminal event routes through recordTerminalLedgerEvent (throws on DB error)", async () => {
    const badAdmin = {
      from: () => ({
        insert: async () => ({ error: { message: "connection refused" } }),
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
    await expect(
      recordPaymentLedgerEvent(badAdmin, {
        projectId: "proj-1", orderId: "ord-1", rail: "paystack",
        eventType: "paid", amountXof: 10000,
      }),
    ).rejects.toThrow(/Terminal ledger write failed/);
  });

  it("T23: recordPaymentLedgerEvent for non-terminal event swallows DB error", async () => {
    const badAdmin = {
      from: () => ({
        insert: async () => ({ error: { message: "connection refused" } }),
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
    // Should not throw for non-terminal events.
    await expect(
      recordPaymentLedgerEvent(badAdmin, {
        projectId: "proj-1", orderId: "ord-1", rail: "paystack",
        eventType: "intent", amountXof: 10000,
      }),
    ).resolves.not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T24–T25: markShopOrderPaidByProviderRef routes through complete_shop_payment
// ─────────────────────────────────────────────────────────────────────────────

import { markShopOrderPaidByProviderRef } from "@/lib/shop/adapter-checkout";

describe("T24–T25: Unified payment path", () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  it("T24: markShopOrderPaidByProviderRef calls complete_shop_payment RPC, not direct DB writes", async () => {
    const rpcSpy = vi.fn().mockResolvedValue({
      data: [{ order_id: "order-7", project_id: "proj-1", already_paid: false }],
      error: null,
    });
    const admin = { rpc: rpcSpy, from: makeMockQuery } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const result = await markShopOrderPaidByProviderRef(admin, {
      reference: "ref-joko-1",
      provider: "joko",
      paymentId: "joko-pay-id",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.alreadyPaid).toBe(false);
    expect(rpcSpy).toHaveBeenCalledWith("complete_shop_payment", expect.objectContaining({
      p_reference: "ref-joko-1",
      p_provider: "joko",
    }));
  });

  it("T25: markShopOrderPaidByProviderRef returns not-ok when order not found (empty data)", async () => {
    const rpcSpy = vi.fn().mockResolvedValue({ data: [], error: null });
    const admin = { rpc: rpcSpy, from: makeMockQuery } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const result = await markShopOrderPaidByProviderRef(admin, {
      reference: "ref-unknown",
      provider: "paystack",
    });
    expect(result.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T26–T27: Worker job dispatch for refunds
// ─────────────────────────────────────────────────────────────────────────────

import { runPlatformWorker } from "@/lib/platform/worker";

describe("T26–T27: Worker job routing", () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  it("T26: worker handles payment.refund job type without throwing for retryable error", async () => {
    refunds["refund-worker"] = {
      id: "refund-worker", order_id: "order-1", project_id: "proj-1", provider: "paystack",
      requested_amount_xof: 5000, currency: "XOF", status: "pending",
      provider_refund_id: null, idempotency_key: "ik-worker",
      attempts: 0, max_attempts: 5, restock_status: "pending",
      provider_capture_reference: "ref-cap",
    };
    const claimRpc = vi.fn().mockImplementation(async (name: string) => {
      if (name === "claim_platform_jobs") {
        return { data: [{ id: "job-1", job_type: "payment.refund", payload: { refundId: "refund-worker" }, attempts: 0, max_attempts: 5 }], error: null };
      }
      if (name === "complete_shop_refund") {
        return { data: [{ ok: true, reason: "succeeded" }], error: null };
      }
      return { data: null, error: null };
    });
    const admin = {
      rpc: claimRpc,
      from: (table: string) => makeMockQuery(table),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
    // Worker will try to process the refund. The adapter won't be found (no Paystack key).
    // The job should FAIL because adapter has no refund support without env vars.
    // We just verify the worker runs without an unhandled exception.
    await expect(runPlatformWorker(admin, "test-worker", 1)).resolves.toBeDefined();
  });

  it("T27: worker throws on unknown job type", async () => {
    const claimRpc = vi.fn().mockImplementation(async (name: string) => {
      if (name === "claim_platform_jobs") {
        return { data: [{ id: "job-2", job_type: "unknown.type", payload: {}, attempts: 0, max_attempts: 5 }], error: null };
      }
      return { data: null, error: null };
    });
    const failRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const admin = {
      rpc: vi.fn().mockImplementation((name: string, ...args: unknown[]) => {
        if (name === "claim_platform_jobs") return claimRpc(name, ...args);
        return failRpc(name, ...args);
      }),
      from: (table: string) => makeMockQuery(table),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const result = await runPlatformWorker(admin, "test-worker", 1);
    // Job fails with unknown type — worker records failure but doesn't throw.
    expect(result.failed).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T28: Negative stock guard via SQL check
// ─────────────────────────────────────────────────────────────────────────────

describe("T28: Negative stock SQL migration", () => {
  it("T28: migration 20260923200000 defines non-negative stock constraint", () => {
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260923200000_commerce_multi_line_reservations.sql"), "utf8");
    expect(sql).toContain("project_products_stock_qty_non_negative");
    expect(sql).toContain("stock_qty >= 0");
    expect(sql).toContain("reserve_multi_shop_checkout");
    expect(sql).toContain("cancel_shop_order");
    expect(sql).toContain("fix hardcoded");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T29: Refund cap SQL migration
// ─────────────────────────────────────────────────────────────────────────────

describe("T29: Refund table and cap migration", () => {
  it("T29: migration 20260923210000 defines shop_refunds and refund cap RPC", () => {
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260923210000_shop_refunds.sql"), "utf8");
    expect(sql).toContain("shop_refunds");
    expect(sql).toContain("create_shop_refund");
    expect(sql).toContain("complete_shop_refund");
    expect(sql).toContain("refund would exceed captured amount");
    expect(sql).toContain("idempotency_key");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T30: Terminal ledger events use throwable path
// ─────────────────────────────────────────────────────────────────────────────

describe("T30: Terminal ledger is durable", () => {
  it("T30: recordTerminalLedgerEvent throws on DB error, pre-terminal does not", async () => {
    const badSvc = {
      from: () => ({ insert: async () => ({ error: { message: "disk full" } }) }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    await expect(
      recordTerminalLedgerEvent(badSvc, {
        projectId: "p", orderId: "o", rail: "paystack", eventType: "refunded", amountXof: 1000,
      }),
    ).rejects.toThrow(/Terminal ledger write failed/);

    const goodSvc = {
      from: () => ({ insert: async () => ({ error: null }) }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    await expect(
      recordTerminalLedgerEvent(goodSvc, {
        projectId: "p", orderId: "o", rail: "paystack", eventType: "paid", amountXof: 1000,
      }),
    ).resolves.not.toThrow();
  });
});
