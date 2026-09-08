import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

const markShopOrderPaidByProviderRef = vi.fn();
const createServiceClient = vi.fn();

vi.mock("@/lib/shop/adapter-checkout", () => ({
  markShopOrderPaidByProviderRef: (...args: unknown[]) => markShopOrderPaidByProviderRef(...args),
}));

vi.mock("@/lib/opportunity/admin", () => ({
  createServiceClient: () => createServiceClient(),
}));

import { POST as paystackWebhook } from "@/app/api/webhooks/paystack/route";

describe("shop webhooks (C1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYSTACK_SECRET_KEY = "sk_test_kebu";
    createServiceClient.mockReturnValue({});
    markShopOrderPaidByProviderRef.mockResolvedValue({
      ok: true,
      orderId: "order-1",
      projectId: "proj-1",
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
      new Request("http://localhost/api/webhooks/paystack", {
        method: "POST",
        headers: { "x-paystack-signature": signature },
        body: raw,
      }),
    );

    expect(res.status).toBe(200);
    expect(markShopOrderPaidByProviderRef).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ reference: "KEBU-REF-001", provider: "paystack" }),
    );
  });

  it("rejects invalid Paystack signature", async () => {
    const res = await paystackWebhook(
      new Request("http://localhost/api/webhooks/paystack", {
        method: "POST",
        headers: { "x-paystack-signature": "bad" },
        body: JSON.stringify({ event: "charge.success", data: { status: "success", reference: "x" } }),
      }),
    );
    expect(res.status).toBe(401);
    expect(markShopOrderPaidByProviderRef).not.toHaveBeenCalled();
  });
});
