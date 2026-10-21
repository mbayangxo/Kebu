/** Actual HTTP handler/crypto; RPC and delivery are explicit transport fixtures. */
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { createHmac } from "node:crypto";
import { POST } from "@/app/api/webhooks/wave/route";
const fixtures=vi.hoisted(()=>({rpc:vi.fn(),legacy:vi.fn(),fulfill:vi.fn()}));
vi.mock("@/lib/opportunity/admin",()=>({createServiceClient:()=>({rpc:fixtures.rpc})}));
vi.mock("@/lib/payments/mark-purchase-paid",()=>({markKebuPurchasePaid:(...args:unknown[])=>fixtures.legacy(...args)}));
vi.mock("@/lib/shop/digital-downloads",()=>({fulfillPaidDigitalOrderDurable:(...args:unknown[])=>fixtures.fulfill(...args)}));
const now=1792612800, secret="fixture-only-wave-signing-key";
const event=()=>({id:"EV_fixture",type:"checkout.session.completed",data:{id:"cos-fixture",client_reference:"kebu-ca-fixture",amount:"2000",currency:"XOF",checkout_status:"complete",payment_status:"succeeded",transaction_id:"TX_fixture"}});
const signature=(body:string,timestamp=now)=>"t="+timestamp+",v1="+createHmac("sha256",secret).update(String(timestamp)+body).digest("hex");
const send=(body:string,header=signature(body))=>POST(new Request("https://kebu.example/api/webhooks/wave",{method:"POST",headers:{"Wave-Signature":header},body}));
beforeEach(()=>{
  vi.clearAllMocks();vi.spyOn(Date,"now").mockReturnValue(now*1000);vi.stubEnv("WAVE_API_KEY","fixture-only-wave-api-key");vi.stubEnv("WAVE_WEBHOOK_SECRET",secret);
  fixtures.rpc.mockResolvedValue({data:{kind:"creative_asset_purchase",library_id:"library-fixture",asset_id:"asset-fixture",already_paid:false},error:null});
  fixtures.legacy.mockResolvedValue({ok:true,kind:"creative_asset_purchase",libraryId:"library-fixture",assetId:"asset-fixture"});fixtures.fulfill.mockResolvedValue(undefined);
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
describe("Wave callback authentication and settlement boundary",()=>{
  it("sends complete documented proof to one atomic RPC",async()=>{
    expect((await send(JSON.stringify(event()))).status).toBe(200);
    expect(fixtures.rpc).toHaveBeenCalledExactlyOnceWith("complete_verified_wave_payment",{p_reference:"kebu-ca-fixture",p_checkout_id:"cos-fixture",p_transaction_id:"TX_fixture",p_event_id:"EV_fixture",p_amount_xof:2000,p_currency:"XOF"});
    expect(fixtures.legacy).not.toHaveBeenCalled();expect(fixtures.fulfill).not.toHaveBeenCalled();
  });
  it("accepts a matching rotation signature",async()=>{
    const body=JSON.stringify(event());expect((await send(body,signature(body).replace(",v1=",",v1="+"0".repeat(64)+",v1="))).status).toBe(200);
  });
  it.each([-300,300])("accepts five-minute boundary %s",async offset=>{const body=JSON.stringify(event());expect((await send(body,signature(body,now+offset))).status).toBe(200);});
  it.each([-301,301])("rejects expired/future signature %s",async offset=>{const body=JSON.stringify(event());expect((await send(body,signature(body,now+offset))).status).toBe(401);expect(fixtures.rpc).not.toHaveBeenCalled();});
  it("rejects the former bare-body HMAC",async()=>{
    const body=JSON.stringify(event());expect((await send(body,createHmac("sha256",secret).update(body).digest("hex"))).status).toBe(401);expect(fixtures.legacy).not.toHaveBeenCalled();expect(fixtures.rpc).not.toHaveBeenCalled();
  });
  it("rejects changed raw Unicode bytes",async()=>{
    const body=JSON.stringify({...event(),note:"May Lècor"});expect((await send(body.replace("Lècor","Lecor"),signature(body))).status).toBe(401);expect(fixtures.rpc).not.toHaveBeenCalled();
  });
  it.each(["","t=bad,v1=abc","t=1792612800,v1=xyz","t=1792612800,t=1792612800,v1=abc"])("rejects malformed header %s",async header=>{expect((await send(JSON.stringify(event()),header)).status).toBe(401);expect(fixtures.rpc).not.toHaveBeenCalled();});
  it("does not treat an API key as webhook signing configuration",async()=>{vi.stubEnv("WAVE_WEBHOOK_SECRET","");expect((await send(JSON.stringify(event()))).status).toBe(503);expect(fixtures.rpc).not.toHaveBeenCalled();});
  it.each(["null","[]","{bad"])("rejects authenticated invalid JSON %s",async body=>{expect((await send(body)).status).toBe(400);expect(fixtures.rpc).not.toHaveBeenCalled();});
  it.each(["checkout.session.failed","payout.completed","custom.success"])("ignores unrelated success-like type %s",async type=>{expect((await send(JSON.stringify({...event(),type}))).status).toBe(200);expect(fixtures.rpc).not.toHaveBeenCalled();expect(fixtures.legacy).not.toHaveBeenCalled();});
  it.each([{payment_status:"failed"},{checkout_status:"open"}])("does not fulfill contradictory state %j",async patch=>{expect((await send(JSON.stringify({...event(),data:{...event().data,...patch}}))).status).toBe(200);expect(fixtures.rpc).not.toHaveBeenCalled();});
  it.each([{amount:"0"},{amount:"2000.5"},{amount:"9007199254740992"},{currency:"USD"},{transaction_id:""},{id:""},{client_reference:""}])("rejects invalid proof %j",async patch=>{expect((await send(JSON.stringify({...event(),data:{...event().data,...patch}}))).status).toBe(400);expect(fixtures.rpc).not.toHaveBeenCalled();expect(fixtures.legacy).not.toHaveBeenCalled();});
  it("never drops provider constraints after SQL failure",async()=>{fixtures.rpc.mockResolvedValue({data:null,error:{message:"proof mismatch"}});expect((await send(JSON.stringify(event()))).status).toBe(503);expect(fixtures.rpc).toHaveBeenCalledTimes(1);expect(fixtures.legacy).not.toHaveBeenCalled();expect(fixtures.fulfill).not.toHaveBeenCalled();});
  it("queues durable Shop delivery only after verified receipt",async()=>{fixtures.rpc.mockResolvedValue({data:{kind:"shop_order",order_id:"order-fixture",project_id:"project-fixture",already_paid:false},error:null});expect((await send(JSON.stringify(event()))).status).toBe(200);expect(fixtures.fulfill).toHaveBeenCalledExactlyOnceWith({rpc:fixtures.rpc},"order-fixture");expect(fixtures.legacy).not.toHaveBeenCalled();});
  it("returns retryable failure on lost SQL transport",async()=>{fixtures.rpc.mockRejectedValue(new Error("fixture lost connection"));expect((await send(JSON.stringify(event()))).status).toBe(503);expect(fixtures.legacy).not.toHaveBeenCalled();});
});
