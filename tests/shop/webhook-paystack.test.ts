import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

function mkReq(url: string, init?: RequestInit): NextRequest {
  return new Request(url, init) as unknown as NextRequest;
}

const createServiceClient = vi.fn();
const fulfillPaidDigitalOrder = vi.fn();
const completeShopPayment = vi.fn();

vi.mock("@/lib/opportunity/admin", () => ({
  createServiceClient: () => createServiceClient(),
}));

vi.mock("@/lib/shop/digital-downloads", () => ({
  fulfillPaidDigitalOrder: (...args: unknown[]) => fulfillPaidDigitalOrder(...args),
}));

import { POST as paystackWebhook } from "@/app/api/webhooks/paystack/route";

describe("shop webhooks (C1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYSTACK_SECRET_KEY = "sk_test_kebu";
    createServiceClient.mockReturnValue({ rpc: completeShopPayment });
    fulfillPaidDigitalOrder.mockResolvedValue(undefined);
    completeShopPayment.mockResolvedValue({
      data: [{ order_id: "order-1", project_id: "proj-1", already_paid: false }],
      error: null,
    });
  });

  it("marks order paid on valid Paystack charge.success", async () => {
    const payload = {
      event: "charge.success",
      data: {
        status: "success",
        reference: "KEBU-REF-001",
        id: 12345,
        metadata: { kebu_reference: "KEBU-REF-001" },
      },
    };
    const raw = JSON.stringify(payload);
    const signature = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(raw).digest("hex");

    const res = await paystackWebhook(
      mkReq("http://localhost/api/webhooks/paystack", {
        method: "POST",
        headers: { "x-paystack-signature": signature },
        body: raw,
      }),
    );

    expect(res.status).toBe(200);
    expect(completeShopPayment).toHaveBeenCalledWith(
      "complete_shop_payment",
      expect.objectContaining({ p_reference: "KEBU-REF-001", p_provider: "paystack" }),
    );
    expect(fulfillPaidDigitalOrder).toHaveBeenCalledWith(
      expect.objectContaining({ rpc: completeShopPayment }),
      "order-1",
    );
  });

  it("rejects invalid Paystack signature", async () => {
    const res = await paystackWebhook(
      mkReq("http://localhost/api/webhooks/paystack", {
        method: "POST",
        headers: { "x-paystack-signature": "bad" },
        body: JSON.stringify({ event: "charge.success", data: { status: "success", reference: "x" } }),
      }),
    );
    expect(res.status).toBe(401);
    expect(completeShopPayment).not.toHaveBeenCalled();
  });
});
