/** Actual migration/RLS/RPC verification. Fixture auth/transport is not hosted Supabase acceptance. */
import {afterEach,describe,expect,it,vi} from "vitest";
import {createHmac} from "node:crypto";
import {openWaveDatabase,seedWavePurchase,recordQuote,completeQuote,paymentState,counter,role,proofArgs,quoteArgs,buyer,type WaveDb,type WaveKind} from "./fixtures/wave-database";
import {startKebuCheckout} from "@/lib/payments/kebu-checkout";
import {saveWaveCheckoutQuote} from "@/lib/payments/wave-checkout-quote";
import {POST} from "@/app/api/webhooks/wave/route";
const wire=vi.hoisted(()=>({admin:null as null|{rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:unknown}>},fulfill:vi.fn()}));
vi.mock("@/lib/opportunity/admin",()=>({createServiceClient:()=>wire.admin}));
vi.mock("@/lib/shop/digital-downloads",()=>({fulfillPaidDigitalOrderDurable:(...args:unknown[])=>wire.fulfill(...args)}));
const root=process.env.KEBU_LOCAL_PGLITE_ROOT;
afterEach(()=>{wire.admin=null;vi.unstubAllGlobals();vi.unstubAllEnvs();vi.clearAllMocks();});
const settlements=async(db:WaveDb)=>{await role(db,"postgres");return (await db.query<{count:number}>("select count(*)::int as count from wave_payment_settlements")).rows[0]!.count;};
describe.skipIf(!root)("verified Wave settlement (actual SQL)",()=>{
 it.each(["creative_asset_purchase","aesthetic_purchase","shop_order"] as WaveKind[])("settles %s once and returns an idempotent receipt",async kind=>{
  const db=await openWaveDatabase();try{
   const p=await seedWavePurchase(db,kind);await recordQuote(db,p);
   const first=await completeQuote(db,p);expect(first).toMatchObject({kind,already_paid:false});
   expect(await paymentState(db,p)).toMatchObject({status:kind==="shop_order"?"paid":"owned",session:p.transactionId});
   expect(await counter(db,p)).toBe(kind==="shop_order"?2:1);
   expect(await completeQuote(db,p)).toMatchObject({kind,already_paid:true});
   expect(await counter(db,p)).toBe(kind==="shop_order"?2:1);expect(await settlements(db)).toBe(1);
   if(kind==="shop_order")expect((await db.query<{rail:string}>("select rail from shop_payment_ledger_events where order_id=$1",[p.id])).rows).toEqual([{rail:"wave"}]);
  }finally{await db.close();}
 },20000);
 it("settles an owned catalog snapshot without inventing a marketplace counter",async()=>{
  const db=await openWaveDatabase();try{const p=await seedWavePurchase(db,"aesthetic_purchase",{catalog:true});await recordQuote(db,p);expect(await completeQuote(db,p)).toMatchObject({kind:"aesthetic_purchase",marketplace_id:null});expect(await counter(db,p)).toBeNull();expect((await paymentState(db,p)).status).toBe("owned");}finally{await db.close();}
 },20000);
 it("denies anonymous/buyer quote access and execution even with broad fixture default grants",async()=>{
  const db=await openWaveDatabase();try{
   const p=await seedWavePurchase(db,"creative_asset_purchase");await recordQuote(db,p);
   for(const actor of ["anon","authenticated"] as const){
    await role(db,actor);
    for(const table of ["wave_checkout_quotes","wave_payment_settlements"])await expect(db.query("select * from "+table)).rejects.toThrow();
    await expect(db.query("select record_wave_checkout_quote($1,$2,$3,$4,$5,$6,$7,$8)",quoteArgs(p))).rejects.toThrow();
    await expect(db.query("select complete_verified_wave_payment($1,$2,$3,$4,$5,$6)",proofArgs(p))).rejects.toThrow();
   }
   await role(db,"authenticated",buyer);
   await expect(db.query("update creative_asset_library set status='owned' where id=$1",[p.id])).rejects.toThrow();
   expect((await paymentState(db,p)).status).toBe("pending");expect(await settlements(db)).toBe(0);
  }finally{await db.close();}
 },20000);
 it("rejects mismatched amount/currency/session/reference and incomplete payment identities atomically",async()=>{
  const db=await openWaveDatabase();try{
   const p=await seedWavePurchase(db,"creative_asset_purchase");await recordQuote(db,p);
   for(const [index,value] of [[0,"unknown-reference"],[1,"other-session"],[2,""],[3,""],[4,1999],[5,"USD"]] as const){
    const args=proofArgs(p);args[index]=value;await role(db,"service_role");await expect(db.query("select complete_verified_wave_payment($1,$2,$3,$4,$5,$6)",args)).rejects.toThrow();
    expect((await paymentState(db,p)).status).toBe("pending");expect(await counter(db,p)).toBe(0);expect(await settlements(db)).toBe(0);
   }
  }finally{await db.close();}
 },20000);
 it("makes quotes immutable and refuses a different checkout identity on a retried reference",async()=>{
  const db=await openWaveDatabase();try{
   const p=await seedWavePurchase(db,"creative_asset_purchase"),saved=await recordQuote(db,p);expect(await recordQuote(db,p)).toEqual(saved);
   await expect(recordQuote(db,{...p,checkoutId:"different-session"})).rejects.toThrow();
   await role(db,"service_role");await expect(db.query("update wave_checkout_quotes set charge_amount_minor=1 where id=$1",[saved.quote_id])).rejects.toThrow();
   await expect(db.query("delete from wave_checkout_quotes where id=$1",[saved.quote_id])).rejects.toThrow();
   expect((await paymentState(db,p)).session).toBe(p.checkoutId);expect(await settlements(db)).toBe(0);
  }finally{await db.close();}
 },20000);
 it("does not guess missing legacy quotes or silently drop provider/source constraints",async()=>{
  const db=await openWaveDatabase();try{
   const p=await seedWavePurchase(db,"creative_asset_purchase");await expect(completeQuote(db,p)).rejects.toThrow();await recordQuote(db,p);
   await role(db,"postgres");await db.query("update creative_asset_library set provider='paypal' where id=$1",[p.id]);await expect(completeQuote(db,p)).rejects.toThrow();
   await role(db,"postgres");await db.query("update creative_asset_library set provider='wave',amount_cents=1999 where id=$1",[p.id]);await expect(completeQuote(db,p)).rejects.toThrow();
   expect((await paymentState(db,p)).status).toBe("pending");expect(await settlements(db)).toBe(0);
  }finally{await db.close();}
 },20000);
 it("cannot use one transaction or event to grant two independent purchases",async()=>{
  const db=await openWaveDatabase();try{
   const a=await seedWavePurchase(db,"creative_asset_purchase"),b=await seedWavePurchase(db,"creative_asset_purchase");await recordQuote(db,a);await recordQuote(db,b);await completeQuote(db,a);
   await expect(completeQuote(db,{...b,transactionId:a.transactionId})).rejects.toThrow();
   await expect(completeQuote(db,{...b,eventId:a.eventId})).rejects.toThrow();
   await expect(completeQuote(db,{...a,transactionId:"conflicting-transaction"})).rejects.toThrow();
   expect((await paymentState(db,b)).status).toBe("pending");expect(await counter(db,b)).toBe(0);expect(await counter(db,a)).toBe(1);expect(await settlements(db)).toBe(1);
  }finally{await db.close();}
 },20000);
 it("rolls back ownership and settlement identity if a later counter write fails, then recovers on delivery retry",async()=>{
  const db=await openWaveDatabase();try{
   const p=await seedWavePurchase(db,"creative_asset_purchase");await recordQuote(db,p);await role(db,"postgres");await db.exec("alter table marketplace_creative_assets add constraint fixture_counter_failure check(acquire_count=0)");
   await expect(completeQuote(db,p)).rejects.toThrow();expect((await paymentState(db,p)).status).toBe("pending");expect(await settlements(db)).toBe(0);
   await role(db,"postgres");await db.exec("alter table marketplace_creative_assets drop constraint fixture_counter_failure");
   await completeQuote(db,p);expect((await paymentState(db,p)).status).toBe("owned");expect(await counter(db,p)).toBe(1);expect(await settlements(db)).toBe(1);
  }finally{await db.close();}
 },20000);
 it("preserves Shop stock/reservation failure instead of marking an expired checkout paid",async()=>{
  const db=await openWaveDatabase();try{
   const p=await seedWavePurchase(db,"shop_order");await recordQuote(db,p);await role(db,"postgres");await db.query("update shop_checkout_reservations set expires_at=now()-interval '1 minute' where order_id=$1",[p.id]);
   await expect(completeQuote(db,p)).rejects.toThrow();expect((await paymentState(db,p)).status).toBe("awaiting_payment");expect(await counter(db,p)).toBe(3);expect(await settlements(db)).toBe(0);
  }finally{await db.close();}
 },20000);
 it("honors the agreed receipt snapshot after the listing price changes",async()=>{
  const db=await openWaveDatabase();try{
   const p=await seedWavePurchase(db,"creative_asset_purchase");await recordQuote(db,p);await role(db,"postgres");await db.query("update marketplace_creative_assets set price_cents=4000 where id=$1",[p.assetId]);await completeQuote(db,p);expect((await paymentState(db,p)).status).toBe("owned");expect(await counter(db,p)).toBe(1);
  }finally{await db.close();}
 },20000);
 it("runs actual adapter → quote RPC → signed HTTP handler → SQL grant without recomputing later FX",async()=>{
  const db=await openWaveDatabase();try{
   const p=await seedWavePurchase(db,"aesthetic_purchase"),secret="fixture-only-wave-webhook-secret";
   vi.stubEnv("WAVE_API_KEY","fixture-only-wave-api-key");vi.stubEnv("WAVE_API_BASE_URL","https://wave.fixture");vi.stubEnv("WAVE_XOF_PER_USD","600");vi.stubEnv("WAVE_WEBHOOK_SECRET",secret);
   const fetchFixture=vi.fn().mockResolvedValue(Response.json({id:p.checkoutId,wave_launch_url:"https://pay.wave.com/c/fixture"}));vi.stubGlobal("fetch",fetchFixture);
   wire.admin={rpc:async(name,args)=>{
    try{
     await role(db,"service_role");
     const values=name==="record_wave_checkout_quote"?[args.p_kind,args.p_purchase_id,args.p_reference,args.p_checkout_id,args.p_source_amount_minor,args.p_source_currency,args.p_charge_amount_minor,args.p_charge_currency]:[args.p_reference,args.p_checkout_id,args.p_transaction_id,args.p_event_id,args.p_amount_xof,args.p_currency];
     if(!["record_wave_checkout_quote","complete_verified_wave_payment"].includes(name))throw Error("Unknown fixture RPC");
     const sql="select "+name+"("+values.map((_,i)=>"$"+(i+1)).join(",")+") as result";
     return {data:(await db.query<{result:unknown}>(sql,values)).rows[0]!.result,error:null};
    }catch(error){return {data:null,error:{message:error instanceof Error?error.message:"fixture SQL failure"}};}
   }};
   const checkout=await startKebuCheckout({method:"wave",reference:p.reference,amountMinor:500,currency:"USD",description:"Fixture template",returnUrl:"https://kebu.example/return",cancelUrl:"https://kebu.example/cancel",webhookBaseUrl:"https://kebu.example",metadata:{kind:"aesthetic_purchase"}});
   if(!checkout.ok)throw Error(checkout.error);
   expect(checkout.settlement).toEqual({amountMinor:3000,currency:"XOF"});
   expect(await saveWaveCheckoutQuote(wire.admin as never,{kind:p.kind,purchaseId:p.id,reference:p.reference,checkoutId:checkout.providerPaymentId??"",sourceAmountMinor:500,sourceCurrency:"USD",settlement:checkout.settlement})).toEqual({ok:true});
   vi.stubEnv("WAVE_XOF_PER_USD","900");
   const body=JSON.stringify({id:p.eventId,type:"checkout.session.completed",data:{id:p.checkoutId,client_reference:p.reference,transaction_id:p.transactionId,amount:"3000",currency:"XOF",checkout_status:"complete",payment_status:"succeeded"}});
   const time=String(Math.floor(Date.now()/1000)),signature="t="+time+",v1="+createHmac("sha256",secret).update(time+body).digest("hex");
   const request=()=>new Request("https://kebu.example/api/webhooks/wave",{method:"POST",headers:{"Wave-Signature":signature},body});
   expect((await POST(request())).status).toBe(200);expect((await POST(request())).status).toBe(200);
   expect((await paymentState(db,p)).status).toBe("owned");expect(await counter(db,p)).toBe(1);expect(fetchFixture).toHaveBeenCalledTimes(1);expect(wire.fulfill).not.toHaveBeenCalled();
   await role(db,"postgres");expect((await db.query("select source_amount_minor::text as source,source_currency,charge_amount_minor::text as charge,charge_currency from wave_checkout_quotes where reference=$1",[p.reference])).rows).toEqual([{source:"500",source_currency:"USD",charge:"3000",charge_currency:"XOF"}]);
  }finally{await db.close();}
 },20000);
});
