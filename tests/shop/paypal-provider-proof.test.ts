import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { paypalCaptureOrder,paypalVerifyCapturedOrder } from "@/lib/payments/paypal-adapter";
const expected={reference:"shop_paypal_order",value:"3.33",currency:"USD"};
function order(status="COMPLETED",captureStatus="COMPLETED",value="3.33",currency="USD") {
  return {id:"owned-order",intent:"CAPTURE",status,purchase_units:[{custom_id:expected.reference,reference_id:expected.reference,
    amount:{value:"3.33",currency_code:"USD"},payments:{captures:[{id:"capture",status:captureStatus,final_capture:true,amount:{value,currency_code:currency}}]}}]};
}
describe("PayPal payment proof from authenticated server responses",()=>{
  const fetcher=vi.fn();
  beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("PAYPAL_CLIENT_ID","fixture");vi.stubEnv("PAYPAL_CLIENT_SECRET","fixture");vi.stubGlobal("fetch",fetcher);
    fetcher.mockResolvedValueOnce(Response.json({access_token:"fixture-token"}));});
  afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
  it("accepts an exact completed capture without recapturing it",async()=>{
    fetcher.mockResolvedValueOnce(Response.json(order()));expect(await paypalCaptureOrder("owned-order",expected)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each(["PENDING","DECLINED","REFUNDED","PARTIALLY_REFUNDED"])("refuses %s capture even on a successful HTTP response",async(status)=>{
    fetcher.mockResolvedValueOnce(Response.json(order("COMPLETED",status)));expect(await paypalVerifyCapturedOrder("owned-order",expected)).toBe(false);
  });
  it.each([["0.01","USD"],["3.33","EUR"]])("refuses a capture for %s %s",async(value,currency)=>{
    fetcher.mockResolvedValueOnce(Response.json(order("COMPLETED","COMPLETED",value,currency)));expect(await paypalCaptureOrder("owned-order",expected)).toBe(false);
  });
  it("refuses an unrelated reference before capture",async()=>{
    const other=order("APPROVED");other.purchase_units[0].custom_id="other-shop";
    fetcher.mockResolvedValueOnce(Response.json(other));expect(await paypalCaptureOrder("owned-order",expected)).toBe(false);expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("never treats an already-captured error message as proof",async()=>{
    fetcher.mockResolvedValueOnce(Response.json(order("APPROVED")))
      .mockResolvedValueOnce(Response.json({details:[{issue:"ORDER_ALREADY_CAPTURED"}]},{status:422}))
      .mockResolvedValueOnce(Response.json(order("COMPLETED","PENDING")));
    expect(await paypalCaptureOrder("owned-order",expected)).toBe(false);
  });
  it("recovers a lost capture response only from exact completed payment evidence",async()=>{
    fetcher.mockResolvedValueOnce(Response.json(order("APPROVED")))
      .mockResolvedValueOnce(Response.json({},{status:500})).mockResolvedValueOnce(Response.json(order()));
    expect(await paypalCaptureOrder("owned-order",expected)).toBe(true);
  });
  it("fails closed without the checkout's stored FX amount",async()=>{
    expect(await paypalCaptureOrder("owned-order",{...expected,value:""})).toBe(false);expect(fetcher).not.toHaveBeenCalled();
  });
});
