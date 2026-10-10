import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkoutRequestBinding, lookupCheckoutRetry } from "@/lib/shop/checkout-retry";
import { checkoutRequestId, completeCheckoutRequest } from "@/lib/create/checkout-request";

afterEach(() => vi.unstubAllGlobals());
describe("lost checkout confirmations", () => {
  it("binds changed buyer input while allowing refreshed verification proof", () => {
    const input = {requestId:"ab000000-0000-4000-8000-000000000001",quantity:2,emailVerificationToken:"old"};
    expect(checkoutRequestBinding({...input,emailVerificationToken:"new"})).toEqual(checkoutRequestBinding(input));
    expect(checkoutRequestBinding({...input,quantity:3})).not.toEqual(checkoutRequestBinding(input));
  });
  it("recovers the recipient gift link and keeps schema errors private", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({data:{orderId:"saved",giftPublicId:"gift-id"},error:null})
      .mockResolvedValueOnce({data:null,error:{message:"private database details"}});
    const admin={rpc} as unknown as SupabaseClient;
    const binding=checkoutRequestBinding({requestId:"ab000000-0000-4000-8000-000000000001"});
    expect((await lookupCheckoutRetry(admin,"project",binding)).data.giftPath).toBe("/g/gift-id");
    expect((await lookupCheckoutRetry(admin,"project",binding)).error).not.toContain("private database");
  });
  it("reuses attempts on failures, changes them for changed input and after confirmation", async () => {
    const entries=new Map<string,string>();
    vi.stubGlobal("sessionStorage",{getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>entries.set(k,v),removeItem:(k:string)=>entries.delete(k)});
    const scope="retry-regression";
    completeCheckoutRequest(scope);
    const first=await checkoutRequestId(scope,{quantity:1,name:"Sensitive buyer"});
    expect(await checkoutRequestId(scope,{quantity:1,name:"Sensitive buyer"})).toBe(first);
    expect([...entries.values()].join()).not.toContain("Sensitive buyer");
    const changed=await checkoutRequestId(scope,{quantity:2,name:"Sensitive buyer"});
    expect(changed).not.toBe(first);
    completeCheckoutRequest(scope);
    expect(await checkoutRequestId(scope,{quantity:2,name:"Sensitive buyer"})).not.toBe(changed);
    completeCheckoutRequest(scope);
  });
});
