import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paypalAdapter } from "@/lib/payments/paypal-adapter";
import { startKebuCheckout } from "@/lib/payments/kebu-checkout";

const input = (currency = "USD", amountMinor = 500) => ({
  reference: "isolated-paypal-amount-fixture", currency, amountMinor,
  description: "Isolated amount verification", returnUrl: "https://kebu.test/return",
  cancelUrl: "https://kebu.test/cancel", webhookUrl: "https://kebu.test/webhook",
});
const requests: { url: string; body: unknown }[] = [];
const fetchFixture = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
  const path = String(url);
  requests.push({ url: path, body: options?.body });
  if (path === "https://api-m.sandbox.paypal.com/v1/oauth2/token") return Response.json({ access_token: "fixture-token" });
  if (path === "https://api-m.sandbox.paypal.com/v2/checkout/orders") return Response.json({ id: "fixture-order", links: [{ rel: "approve", href: "https://paypal.test/approve" }] });
  throw Error("Unexpected URL; real provider requests are forbidden in this fixture");
});
beforeEach(() => {
  requests.length = 0; fetchFixture.mockClear(); vi.stubGlobal("fetch", fetchFixture);
  vi.stubEnv("PAYPAL_CLIENT_ID", "fixture-id"); vi.stubEnv("PAYPAL_CLIENT_SECRET", "fixture-secret");
  vi.stubEnv("PAYPAL_MODE", "sandbox");
  for (const key of ["PAYPAL_XOF_PER_USD", "JOKO_XOF_PER_USD", "PAYPAL_XAF_PER_USD", "JOKO_XAF_PER_USD"]) vi.stubEnv(key, "");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function amount() {
  const body = JSON.parse(String(requests.find(request => request.url.endsWith("/v2/checkout/orders"))?.body));
  return body.purchase_units[0].amount;
}
describe("PayPal checkout amount contract through the actual adapter", () => {
  it("keeps USD cents exactly", async () => {
    expect(await paypalAdapter.createCheckout(input())).toMatchObject({ ok: true });
    expect(amount()).toEqual({ currency_code: "USD", value: "5.00" });
  });
  it("preserves every cent at the safe-integer boundary", async () => {
    expect(await paypalAdapter.createCheckout(input("USD", Number.MAX_SAFE_INTEGER))).toMatchObject({ ok: true });
    expect(amount()).toEqual({ currency_code: "USD", value: "90071992547409.91" });
  });
  it("keeps the declared currency through the ordinary Kebu checkout entry point", async () => {
    expect(await startKebuCheckout({ ...input(), currency: "USD", method: "paypal", webhookBaseUrl: "https://kebu.test", metadata: {} })).toMatchObject({ ok: true, provider: "paypal" });
    expect(amount()).toEqual({ currency_code: "USD", value: "5.00" });
  });
  it("requires an explicit XOF quote before any OAuth or checkout request", async () => {
    expect(await paypalAdapter.createCheckout(input("XOF"))).toMatchObject({ ok: false });
    expect(fetchFixture).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid minor units %s before provider requests", async value => {
    expect(await paypalAdapter.createCheckout(input("USD", value))).toMatchObject({ ok: false });
    expect(fetchFixture).not.toHaveBeenCalled();
  });
  it("preserves zero-decimal JPY units", async () => {
    expect(await paypalAdapter.createCheckout(input("JPY"))).toMatchObject({ ok: true });
    expect(amount()).toEqual({ currency_code: "JPY", value: "500" });
  });
  it.each(["HUF", "TWD"])("formats integral %s without unsupported provider decimals", async currency => {
    expect(await paypalAdapter.createCheckout(input(currency, 500))).toMatchObject({ ok: true });
    expect(amount()).toEqual({ currency_code: currency, value: "5" });
  });
  it.each(["HUF", "TWD"])("refuses fractional %s rather than changing the requested amount", async currency => {
    expect(await paypalAdapter.createCheckout(input(currency, 501))).toMatchObject({ ok: false });
    expect(fetchFixture).not.toHaveBeenCalled();
  });
  it("does not pretend an unsupported currency can be charged", async () => {
    expect(await paypalAdapter.createCheckout(input("NGN"))).toMatchObject({ ok: false });
    expect(fetchFixture).not.toHaveBeenCalled();
  });
  it("uses configured XOF conversion and rounds once to USD cents", async () => {
    vi.stubEnv("PAYPAL_XOF_PER_USD", "600");
    expect(await paypalAdapter.createCheckout(input("XOF"))).toMatchObject({ ok: true });
    expect(amount()).toEqual({ currency_code: "USD", value: "0.83" });
  });
  it("accepts an explicitly configured shared XOF quote when the PayPal-specific value is absent", async () => {
    vi.stubEnv("PAYPAL_XOF_PER_USD", undefined); vi.stubEnv("JOKO_XOF_PER_USD", "600");
    expect(await paypalAdapter.createCheckout(input("XOF"))).toMatchObject({ ok: true });
    expect(amount()).toEqual({ currency_code: "USD", value: "0.83" });
  });
  it("uses the explicit XAF quote independently", async () => {
    vi.stubEnv("PAYPAL_XOF_PER_USD", "600"); vi.stubEnv("PAYPAL_XAF_PER_USD", "500");
    expect(await paypalAdapter.createCheckout(input("XAF"))).toMatchObject({ ok: true });
    expect(amount()).toEqual({ currency_code: "USD", value: "1.00" });
  });
  it.each(["0", "-1", "Infinity", "not-a-rate"])("rejects invalid configured FX %s without inventing a fallback", async rate => {
    vi.stubEnv("PAYPAL_XOF_PER_USD", rate); vi.stubEnv("JOKO_XOF_PER_USD", "600");
    expect(await paypalAdapter.createCheckout(input("XOF"))).toMatchObject({ ok: false });
    expect(fetchFixture).not.toHaveBeenCalled();
  });
  it("does not round a zero-cent conversion up into an unintended minimum charge", async () => {
    vi.stubEnv("PAYPAL_XOF_PER_USD", "600");
    expect(await paypalAdapter.createCheckout(input("XOF", 1))).toMatchObject({ ok: false });
    expect(fetchFixture).not.toHaveBeenCalled();
  });
  it("refuses conversion overflow", async () => {
    vi.stubEnv("PAYPAL_XOF_PER_USD", "0.000000001");
    expect(await paypalAdapter.createCheckout(input("XOF", Number.MAX_SAFE_INTEGER))).toMatchObject({ ok: false });
    expect(fetchFixture).not.toHaveBeenCalled();
  });
  it("does not apply an XOF quote to XAF implicitly", async () => {
    vi.stubEnv("PAYPAL_XOF_PER_USD", "600");
    expect(await paypalAdapter.createCheckout(input("XAF"))).toMatchObject({ ok: false });
    expect(fetchFixture).not.toHaveBeenCalled();
  });
});
