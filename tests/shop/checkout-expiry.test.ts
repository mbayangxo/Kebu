import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
const mocks=vi.hoisted(()=>({retrieve:vi.fn(),rpc:vi.fn()}));
vi.mock("@/lib/payments/wave-verification",async(importOriginal)=>({...await importOriginal<typeof import("@/lib/payments/wave-verification")>(),retrieveWaveSession:mocks.retrieve}));
import { reconcileExpiringWaveOrder } from "@/lib/shop/checkout-expiry";
import { verifyWaveSignature,waveSessionMatches } from "@/lib/payments/wave-verification";
const order={id:"order",project_id:"project",provider_reference:"ref",provider_payment_id:"cos-owned",amount_xof:2000,checkout_expires_at:"2020-01-01T00:00:00Z"};
const session={id:"cos-owned",client_reference:"ref",amount:"2000",currency:"XOF",checkout_status:"expired",payment_status:"cancelled",when_expires:order.checkout_expires_at};
const admin={rpc:mocks.rpc} as unknown as SupabaseClient;
describe("verified checkout expiry",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.retrieve.mockResolvedValue(session);mocks.rpc.mockResolvedValue({data:true,error:null});});
  afterEach(()=>vi.unstubAllGlobals());
  it("releases only the exact expired/cancelled provider checkout",async()=>{
    expect(await reconcileExpiringWaveOrder(admin,order)).toBe("expired");
    expect(mocks.rpc).toHaveBeenCalledWith("expire_verified_wave_checkout",{p_order_id:"order",p_project_id:"project",p_reference:"ref",p_payment_id:"cos-owned"});
  });
  it.each([{checkout_status:"open"},{payment_status:"processing"},{amount:"1"},{currency:"EUR"},{client_reference:"other"},{id:"cos-other"},{when_expires:"invalid"}])("keeps stock held for ambiguous/mismatched evidence %j",async(change)=>{
    mocks.retrieve.mockResolvedValue({...session,...change});expect(await reconcileExpiringWaveOrder(admin,order)).toBe("held");expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("keeps stock held if the provider cannot be reached",async()=>{
    mocks.retrieve.mockResolvedValue(null);expect(await reconcileExpiringWaveOrder(admin,order)).toBe("held");expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("records a completed payment rather than cancelling after the deadline",async()=>{
    mocks.retrieve.mockResolvedValue({...session,checkout_status:"complete",payment_status:"succeeded"});
    mocks.rpc.mockResolvedValue({data:{orderId:"order",projectId:"project"},error:null});
    expect(await reconcileExpiringWaveOrder(admin,order)).toBe("paid");expect(mocks.rpc).toHaveBeenCalledWith("mark_verified_shop_payment",expect.anything());
  });
  it("does not release if the order changes during the provider read",async()=>{
    mocks.rpc.mockResolvedValue({data:null,error:{message:"Payment won the lock"}});expect(await reconcileExpiringWaveOrder(admin,order)).toBe("held");
  });
});
describe("Wave documented signatures",()=>{
  const now=Date.now(),timestamp=String(Math.floor(now/1000)),body='{"type":"checkout.session.completed"}',secret="fixture-secret";
  const sign=(t:string)=>`t=${t},v1=${createHmac("sha256",secret).update(t+body).digest("hex")}`;
  it("accepts the timestamp/body HMAC and rejects tampering",()=>{
    expect(verifyWaveSignature(body,sign(timestamp),secret,now)).toBe(true);
    expect(verifyWaveSignature(body+" ",sign(timestamp),secret,now)).toBe(false);
  });
  it("rejects replayed, future, missing and legacy unsigned-timestamp headers",()=>{
    expect(verifyWaveSignature(body,sign(String(Number(timestamp)-301)),secret,now)).toBe(false);
    expect(verifyWaveSignature(body,sign(String(Number(timestamp)+60)),secret,now)).toBe(false);
    expect(verifyWaveSignature(body,null,secret,now)).toBe(false);
    expect(verifyWaveSignature(body,createHmac("sha256",secret).update(body).digest("hex"),secret,now)).toBe(false);
  });
  it("requires exact integer XOF amount and provider identity",()=>{
    expect(waveSessionMatches(session,{id:"cos-owned",reference:"ref",amountXof:2000})).toBe(true);
    expect(waveSessionMatches({...session,amount:"2000.00"},{id:"cos-owned",reference:"ref",amountXof:2000})).toBe(false);
  });
});
