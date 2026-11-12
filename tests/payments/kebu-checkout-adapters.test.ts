import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startKebuCheckout, type KebuCheckoutMethod } from "@/lib/payments/kebu-checkout";
const request = (method: KebuCheckoutMethod, currency: "XOF" | "USD" = "XOF") => ({ method, currency, reference: "isolated-fixture-reference", amountMinor: 500, description: "Isolated adapter test", customerEmail: "buyer@example.test", returnUrl: "https://kebu.test/return", cancelUrl: "https://kebu.test/cancel", webhookBaseUrl: "https://kebu.test", metadata: { kind: "creative_asset_purchase" } });
const fetchFixture = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
  const path = String(url);
  if (path.startsWith("https://wave.provider.test/")) return Response.json({ id: "wave-session-fixture", wave_launch_url: "https://wave.provider.test/pay", ...JSON.parse(String(init?.body ?? "{}")) });
  if (path.startsWith("https://orange.provider.test/")) return Response.json({ payment_id: "orange-session-fixture", checkout_url: "https://orange.provider.test/pay" });
  if (path === "https://api.paystack.co/transaction/initialize") return Response.json({ status: true, data: { reference: "isolated-fixture-reference", authorization_url: "https://card.provider.test/pay" } });
  throw Error("Unexpected provider URL — no real provider requests are permitted in this test");
});
beforeEach(() => {
  fetchFixture.mockClear(); vi.stubGlobal("fetch", fetchFixture);
  vi.stubEnv("WAVE_API_KEY", "fixture-wave-key");
  vi.stubEnv("WAVE_XOF_PER_USD", ""); vi.stubEnv("WAVE_API_BASE_URL", "https://wave.provider.test");
  vi.stubEnv("ORANGE_MONEY_API_KEY", "fixture-orange-key"); vi.stubEnv("ORANGE_MONEY_MERCHANT_ID", "fixture-merchant"); vi.stubEnv("ORANGE_MONEY_API_BASE_URL", "https://orange.provider.test");
  vi.stubEnv("PAYSTACK_SECRET_KEY", "fixture-card-key"); vi.stubEnv("PAYSTACK_CURRENCY", "USD"); vi.stubEnv("PAYSTACK_XOF_PER_USD", "600");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Kebu selected payment adapter and currency contract", () => {
  it("starts the exact Wave rail rather than failing to resolve the generic Shop preference", async () => {
    expect(await startKebuCheckout(request("wave"))).toMatchObject({ ok: true, provider: "wave" });
    expect(String(fetchFixture.mock.calls[0]?.[0])).toBe("https://wave.provider.test/v1/checkout/sessions");
  });
  it("does not silently switch Orange Money to Wave when both are configured", async () => {
    expect(await startKebuCheckout(request("orange_money"))).toMatchObject({ ok: true, provider: "orange_money" });
    expect(String(fetchFixture.mock.calls[0]?.[0])).toBe("https://orange.provider.test/checkout");
  });
  it("charges USD cents as USD cents rather than converting them as an XOF price", async () => {
    expect(await startKebuCheckout(request("card", "USD"))).toMatchObject({ ok: true });
    const body = JSON.parse(String((fetchFixture.mock.calls[0] as unknown as [unknown, RequestInit])[1].body));
    expect(body.currency).toBe("USD"); expect(body.amount).toBe(500);
  });
  it("keeps explicit XOF conversion without silently rounding up to an arbitrary minimum charge", async () => {
    expect(await startKebuCheckout(request("card", "XOF"))).toMatchObject({ ok: true });
    const body = JSON.parse(String((fetchFixture.mock.calls[0] as unknown as [unknown, RequestInit])[1].body));
    expect(body.currency).toBe("USD"); expect(body.amount).toBe(83);
  });
  it("refuses a different source currency without a supported conversion instead of charging a different value", async () => {
    vi.stubEnv("PAYSTACK_CURRENCY", "NGN"); vi.stubEnv("PAYSTACK_XOF_PER_UNIT", "4");
    expect(await startKebuCheckout(request("card", "USD"))).toMatchObject({ ok: false });
    expect(fetchFixture).not.toHaveBeenCalled();
  });
  it("requires an explicit valid FX configuration before converting XOF to USD", async () => {
    vi.stubEnv("PAYSTACK_XOF_PER_USD", ""); vi.stubEnv("JOKO_XOF_PER_USD", "");
    expect(await startKebuCheckout(request("card", "XOF"))).toMatchObject({ ok: false });
    expect(fetchFixture).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects unsafe minor-unit amount %s without a provider call", async amountMinor => {
    expect(await startKebuCheckout({ ...request("wave"), amountMinor })).toMatchObject({ ok: false });
    expect(fetchFixture).not.toHaveBeenCalled();
  });
  it.each(["wave", "orange_money"] as const)("does not convert USD to XOF silently for %s", async method => {
    expect(await startKebuCheckout(request(method, "USD"))).toMatchObject({ ok: false });
    expect(fetchFixture).not.toHaveBeenCalled();
  });

  it("returns a recoverable failure for a network error instead of leaving the acquisition request unhandled", async () => {
    fetchFixture.mockRejectedValueOnce(new TypeError("fixture network failure"));
    expect(await startKebuCheckout(request("wave"))).toMatchObject({ ok: false, error: expect.stringContaining("try again") });
  });
  it("rejects conversion overflow before contacting the provider", async () => {
    vi.stubEnv("PAYSTACK_XOF_PER_USD", "0.000000001");
    expect(await startKebuCheckout({ ...request("card", "XOF"), amountMinor: Number.MAX_SAFE_INTEGER })).toMatchObject({ ok: false });
    expect(fetchFixture).not.toHaveBeenCalled();
  });

});
