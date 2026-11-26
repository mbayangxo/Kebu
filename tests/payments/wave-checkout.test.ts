import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {waveAdapter} from "@/lib/payments/wave-adapter";
import {startKebuCheckout} from "@/lib/payments/kebu-checkout";
import {saveWaveCheckoutQuote} from "@/lib/payments/wave-checkout-quote";
const input={reference:"wave-fixture-reference",amountMinor:2000,currency:"XOF",description:"Fixture",returnUrl:"https://kebu.example/return",cancelUrl:"https://kebu.example/cancel",webhookUrl:"https://kebu.example/api/webhooks/wave"};
const fetchFixture=vi.fn();
beforeEach(()=>{vi.stubEnv("WAVE_API_KEY","fixture-only-key");vi.stubEnv("WAVE_API_BASE_URL","https://wave.provider.test");vi.stubEnv("WAVE_XOF_PER_USD","");vi.stubGlobal("fetch",fetchFixture);fetchFixture.mockReset();fetchFixture.mockImplementation(async(_url:string,init:RequestInit)=>{const body=JSON.parse(String(init.body));return Response.json({id:"cos-fixture",wave_launch_url:"https://pay.wave.com/c/cos-fixture",amount:body.amount,currency:body.currency,client_reference:body.client_reference});});});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe("Wave amount and durable checkout quote",()=>{
 it("preserves exact XOF units and reports the provider charge",async()=>{const r=await waveAdapter.createCheckout(input);expect(r).toMatchObject({ok:true,providerPaymentId:"cos-fixture",settlement:{amountMinor:2000,currency:"XOF"}});expect(JSON.parse(fetchFixture.mock.calls[0]![1].body)).toMatchObject({amount:"2000",currency:"XOF",client_reference:input.reference});});
 it("converts USD only through explicit Wave FX and propagates that exact quote",async()=>{vi.stubEnv("WAVE_XOF_PER_USD","600");const r=await startKebuCheckout({...input,method:"wave",amountMinor:500,currency:"USD",webhookBaseUrl:"https://kebu.example",metadata:{kind:"aesthetic_purchase"}});expect(r).toMatchObject({ok:true,settlement:{amountMinor:3000,currency:"XOF"}});expect(JSON.parse(fetchFixture.mock.calls[0]![1].body).amount).toBe("3000");});
 it("never invents missing Wave FX or borrows another provider's rate",async()=>{vi.stubEnv("JOKO_XOF_PER_USD","600");expect(await waveAdapter.createCheckout({...input,currency:"USD",amountMinor:500})).toMatchObject({ok:false});expect(fetchFixture).not.toHaveBeenCalled();});
 it.each(["0","-1","NaN","Infinity"])("refuses invalid FX %s before creating a provider session",async rate=>{vi.stubEnv("WAVE_XOF_PER_USD",rate);expect(await waveAdapter.createCheckout({...input,currency:"USD",amountMinor:500})).toMatchObject({ok:false});expect(fetchFixture).not.toHaveBeenCalled();});
 it.each([0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])("rejects invalid amount %s without clamps or provider calls",async amountMinor=>{expect(await waveAdapter.createCheckout({...input,amountMinor})).toMatchObject({ok:false});expect(fetchFixture).not.toHaveBeenCalled();});
 it.each(["XAF","EUR","JPY"])("refuses unsupported source currency %s",async currency=>{expect(await waveAdapter.createCheckout({...input,currency})).toMatchObject({ok:false});expect(fetchFixture).not.toHaveBeenCalled();});
 it("rejects a zero rounded conversion",async()=>{vi.stubEnv("WAVE_XOF_PER_USD","0.1");expect(await waveAdapter.createCheckout({...input,currency:"USD",amountMinor:1})).toMatchObject({ok:false});expect(fetchFixture).not.toHaveBeenCalled();});
 it("rejects conversion overflow",async()=>{vi.stubEnv("WAVE_XOF_PER_USD","600");expect(await waveAdapter.createCheckout({...input,currency:"USD",amountMinor:Number.MAX_SAFE_INTEGER})).toMatchObject({ok:false});expect(fetchFixture).not.toHaveBeenCalled();});
 it.each([""," padded","padded ","x".repeat(256)])("never truncates an invalid reference %s",async reference=>{expect(await waveAdapter.createCheckout({...input,reference})).toMatchObject({ok:false});expect(fetchFixture).not.toHaveBeenCalled();});
 it("requires an actual provider session ID",async()=>{fetchFixture.mockResolvedValue(Response.json({wave_launch_url:"https://pay.wave.com/c/fixture",amount:"2000",currency:"XOF",client_reference:input.reference}));expect(await waveAdapter.createCheckout(input)).toMatchObject({ok:false});});
 it("rejects insecure checkout links",async()=>{fetchFixture.mockResolvedValue(Response.json({id:"cos-fixture",wave_launch_url:"http://pay.wave.com/c/fixture",amount:"2000",currency:"XOF",client_reference:input.reference}));expect(await waveAdapter.createCheckout(input)).toMatchObject({ok:false});});
 it("returns a recoverable transport error without retrying a charge",async()=>{fetchFixture.mockRejectedValue(new Error("fixture disconnect"));expect(await waveAdapter.createCheckout(input)).toMatchObject({ok:false,error:expect.stringContaining("try again")});expect(fetchFixture).toHaveBeenCalledTimes(1);});
 it("requires a persisted quote receipt rather than exposing an unbound URL",async()=>{
  const rpc=vi.fn().mockResolvedValue({data:null,error:{message:"fixture write failed"}});
  expect(await saveWaveCheckoutQuote({rpc} as never,{kind:"creative_asset_purchase",purchaseId:"fixture-id",reference:input.reference,checkoutId:"cos-fixture",sourceAmountMinor:2000,sourceCurrency:"XOF",settlement:{amountMinor:2000,currency:"XOF"}})).toMatchObject({ok:false});
  expect(rpc).toHaveBeenCalledExactlyOnceWith("record_wave_checkout_quote",expect.objectContaining({p_source_amount_minor:2000,p_charge_amount_minor:2000,p_charge_currency:"XOF"}));
 });
 it("does not return a checkout binding after a lost quote-write response",async()=>{
  const rpc=vi.fn().mockRejectedValue(new Error("fixture disconnect"));
  expect(await saveWaveCheckoutQuote({rpc} as never,{kind:"creative_asset_purchase",purchaseId:"fixture-id",reference:input.reference,checkoutId:"cos-fixture",sourceAmountMinor:2000,sourceCurrency:"XOF",settlement:{amountMinor:2000,currency:"XOF"}})).toMatchObject({ok:false});
  expect(rpc).toHaveBeenCalledTimes(1);
 });

 it.each([{amount:"1"},{currency:"USD"},{client_reference:"different-reference"}])("rejects provider session quote mismatch %j before exposing its link",async patch=>{
  fetchFixture.mockResolvedValue(Response.json({id:"cos-fixture",wave_launch_url:"https://pay.wave.com/c/fixture",amount:"2000",currency:"XOF",client_reference:input.reference,...patch}));
  expect(await waveAdapter.createCheckout(input)).toMatchObject({ok:false});
 });
 it("requires the returned provider quote fields",async()=>{
  fetchFixture.mockResolvedValue(Response.json({id:"cos-fixture",wave_launch_url:"https://pay.wave.com/c/fixture"}));expect(await waveAdapter.createCheckout(input)).toMatchObject({ok:false});
 });
 it("does not normalize an invalid provider session identity",async()=>{
  fetchFixture.mockResolvedValue(Response.json({id:" cos-fixture ",wave_launch_url:"https://pay.wave.com/c/fixture",amount:"2000",currency:"XOF",client_reference:input.reference}));expect(await waveAdapter.createCheckout(input)).toMatchObject({ok:false});
 });
 it("does not round an exact sub-half XOF decimal rate up before charge rounding",async()=>{
  vi.stubEnv("WAVE_XOF_PER_USD","49.999999999999999999");expect(await waveAdapter.createCheckout({...input,currency:"USD",amountMinor:1})).toMatchObject({ok:false});expect(fetchFixture).not.toHaveBeenCalled();
 });

});
