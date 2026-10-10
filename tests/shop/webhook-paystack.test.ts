import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

function mkReq(url: string, init?: RequestInit): NextRequest {
  return new Request(url, init) as unknown as NextRequest;
}

const markShopOrderPaidByProviderRef = vi.fn();
const createServiceClient = vi.fn();
const lookup = vi.fn();
const admin={from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:lookup})})})})};

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
    createServiceClient.mockReturnValue(admin);
    lookup.mockResolvedValue({data:{provider_reference:"KEBU-REF-001",provider_amount_value:"2000",provider_amount_currency:"XOF"},error:null});
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
        amount:2000,currency:"XOF",
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
    expect(markShopOrderPaidByProviderRef).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ reference: "KEBU-REF-001", provider: "paystack" }),
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
    expect(markShopOrderPaidByProviderRef).not.toHaveBeenCalled();
  });
  it.each([{amount:1,currency:"XOF"},{amount:2000,currency:"USD"},{amount:2000,currency:"XOF",reference:"other"}])("refuses signed wrong tender %j",async(change)=>{
    const raw=JSON.stringify({event:"charge.success",data:{status:"success",reference:"KEBU-REF-001",metadata:{kebu_reference:"KEBU-REF-001"},...change}});
    const signature=createHmac("sha512",process.env.PAYSTACK_SECRET_KEY!).update(raw).digest("hex");
    const response=await paystackWebhook(mkReq("http://localhost/api/webhooks/paystack",{method:"POST",headers:{"x-paystack-signature":signature},body:raw}));
    expect(response.status).toBe(409);expect(markShopOrderPaidByProviderRef).not.toHaveBeenCalled();
  });
});
