import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ capture: vi.fn(), paid: vi.fn(), order: null as Record<string, unknown> | null, update: vi.fn() }));
vi.mock("@/lib/payments/paypal-adapter", () => ({ paypalConfigured: () => true, paypalCaptureOrder: mocks.capture }));
vi.mock("@/lib/shop/adapter-checkout", () => ({ markShopOrderPaidByProviderRef: mocks.paid }));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: () => ({
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mocks.order }) }) }), update: mocks.update }),
}) }));
import { POST } from "@/app/api/public/shop/paypal/capture/route";
const request = (extra = {}) => new Request("http://localhost/api/public/shop/paypal/capture", { method: "POST", body: JSON.stringify({ orderId: "order", ...extra }), headers: { "Content-Type": "application/json" } }) as NextRequest;
describe("PayPal capture stays bound to its stored checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.order = { id: "order", payment_status: "awaiting_payment", payment_provider: "paypal", payment_preference: "paypal", provider_payment_id: "paypal-owned", provider_reference: "ref", provider_amount_value:"3.33", provider_amount_currency:"USD" };
    mocks.capture.mockResolvedValue(true);
    mocks.paid.mockResolvedValue({ ok: true, orderId: "order", projectId: "project" });
  });
  it("does not capture a browser-supplied order when the stored checkout is missing", async () => {
    mocks.order!.provider_payment_id = null;
    expect((await POST(request({ paypalOrderId: "unrelated-cheap-order" }))).status).toBe(400);
    expect(mocks.capture).not.toHaveBeenCalled();
    expect(mocks.paid).not.toHaveBeenCalled();
  });
  it("rejects a different browser token", async () => {
    expect((await POST(request({ paypalOrderId: "other" }))).status).toBe(403);
    expect(mocks.capture).not.toHaveBeenCalled();
  });
  it("uses the stored provider ID and preserves provider identity", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.capture).toHaveBeenCalledWith("paypal-owned", {reference:"ref",value:"3.33",currency:"USD"});
    expect(mocks.paid).toHaveBeenCalledWith(expect.anything(), { reference: "ref", paymentId: "paypal-owned", provider: "paypal" });
  });
  it("fails closed instead of a direct paid-status fallback", async () => {
    mocks.order!.provider_reference = null;
    mocks.paid.mockResolvedValue({ ok: false, error: "Payment needs reconciliation." });
    expect((await POST(request())).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
