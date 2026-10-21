/** Real PostgREST -> PostgreSQL, with explicit synthetic CI JWTs/provider replies.
 * This verifies Data API permissions and actual acquisition logic, not GoTrue/hosted login. */
import {createHmac,randomUUID} from "node:crypto";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
import {beforeAll,describe,expect,it,vi} from "vitest";
const provider=vi.hoisted(()=>({start:vi.fn()}));
vi.mock("@/lib/payments/kebu-checkout",async importOriginal=>({...await importOriginal<typeof import("@/lib/payments/kebu-checkout")>(),startKebuCheckout:provider.start}));
import {validateWebsiteDefinition} from "@/lib/create/website-schema";
import {acquireMarketplaceAesthetic,listPublishedMarketplaceAesthetics,listDeveloperMarketplaceAesthetics,uploadMarketplaceAesthetic,publishMarketplaceAesthetic,uploadOwnedAesthetic} from "@/lib/create/aesthetics-marketplace";
const restURL=process.env.KEBU_TEMPLATE_SOURCE_REST_URL;
const buyer="11111111-1111-4111-8111-111111111111",developer="22222222-2222-4222-8222-222222222222",other="33333333-3333-4333-8333-333333333333";
const secret="kebu_disposable_rest_jwt_fixture_only_2026";
const sourceInput={schemaVersion:"website-v1",title:"Private paid source",theme:{primary:"#0F0D33",accent:"#00C851",background:"#FAFAF8",text:"#0F0D33",fontDisplay:"Fraunces",fontBody:"system-ui",spacing:"comfortable"},pages:[{slug:"home",title:"Home",sections:[{id:"hero-private",type:"hero",props:{heading:"Paid source fixture",subheading:"Unchanged snapshot",buttonLabel:"Go",buttonHref:"#"}}]}]};
const parsedDefinition=validateWebsiteDefinition(sourceInput);if(!parsedDefinition.ok)throw Error("Invalid explicit source fixture");const definition=parsedDefinition.data;
function client(role:"anon"|"authenticated"|"service_role",sub?:string){
 const header=Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url");const payload=Buffer.from(JSON.stringify({role,sub,exp:Math.floor(Date.now()/1000)+3600})).toString("base64url");const unsigned=header+"."+payload;const token=unsigned+"."+createHmac("sha256",secret).update(unsigned).digest("base64url");
 return createClient(restURL!,token,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:"Bearer "+token},fetch:async(input,init)=>{const url=new URL(typeof input==="string"?input:input instanceof URL?input.toString():input.url);url.pathname=url.pathname.replace(/^\/rest\/v1(?=\/|$)/,"")||"/";return fetch(input instanceof Request?new Request(url,input):url,init);}}});
}
let service:SupabaseClient,visitor:SupabaseClient,owner:SupabaseClient,seller:SupabaseClient,stranger:SupabaseClient,templateId:string,draftId:string,pendingId:string;

describe.skipIf(!restURL).sequential("Template source boundary through real PostgREST",()=>{
 beforeAll(async()=>{
  if(process.env.KEBU_TEMPLATE_SOURCE_REST_ISOLATED!=="1"||new URL(restURL!).hostname!=="127.0.0.1")throw Error("Refuse non-isolated source fixture");
  service=client("service_role");visitor=client("anon");owner=client("authenticated",buyer);seller=client("authenticated",developer);stranger=client("authenticated",other);
  const dev=await service.from("developer_profiles").select("id").eq("user_id",developer).single();expect(dev.error).toBeNull();
  const paid=await service.from("marketplace_templates").insert({developer_id:dev.data!.id,slug:"rest-paid-source",name:"Private template",definition,price_cents:500,status:"published"}).select("id").single();expect(paid.error).toBeNull();templateId=paid.data!.id;
  const draft=await service.from("marketplace_templates").insert({developer_id:dev.data!.id,slug:"rest-hidden-draft",name:"Private draft",definition,status:"draft"}).select("id").single();expect(draft.error).toBeNull();draftId=draft.data!.id;
  const pending=await service.from("aesthetic_library").insert({owner_id:other,kind:"marketplace",marketplace_id:templateId,name:"Unpaid",definition,status:"pending",amount_usd_cents:500,provider:"wave",provider_reference:"rest-unpaid-fixture"}).select("id").single();expect(pending.error).toBeNull();pendingId=pending.data!.id;
 },30000);
 it("serves public metadata while preserving draft privacy",async()=>{
  const listed=await visitor.from("marketplace_templates").select("id,name,price_cents").order("created_at");expect(listed.error).toBeNull();expect(listed.data).toContainEqual({id:templateId,name:"Private template",price_cents:500});expect(listed.data!.some(x=>x.id===draftId)).toBe(false);
 });
 it.each(["anon","authenticated"] as const)("%s Data API cannot retrieve paid source or SELECT star",async role=>{
  const api=role==="anon"?visitor:owner;
  for(const columns of ["definition","*"]){const read=await api.from("marketplace_templates").select(columns).eq("id",templateId);expect(read.data).toBeNull();expect(read.error?.code).toBe("42501");}
 });
 it("rejects source inference through Data API filters",async()=>{
  const read=await owner.from("marketplace_templates").select("id").eq("definition->>title","Private paid source");expect(read.data).toBeNull();expect(read.error?.code).toBe("42501");
 });
 it("actual store/developer queries use metadata-only projections",async()=>{
  const publicRows=await listPublishedMarketplaceAesthetics(owner);expect(publicRows.ok).toBe(true);if(!publicRows.ok)throw Error(publicRows.error);expect(publicRows.items.some(x=>x.id===templateId)).toBe(true);expect(publicRows.items.every(x=>!("definition" in x))).toBe(true);
  const mine=await listDeveloperMarketplaceAesthetics(seller,developer);expect(mine.ok).toBe(true);if(!mine.ok)throw Error(mine.error);expect(mine.items.some(x=>x.id===draftId)).toBe(true);expect(mine.items.every(x=>!("definition" in x))).toBe(true);
 });
 it("preserves actual developer upload and publication",async()=>{
  const created=await uploadMarketplaceAesthetic(seller,developer,{name:"REST creator upload",priceCents:500,fileJson:{kebuTemplate:"kebu-template-website-v1",name:"Upload",definition},publish:false});
  expect(created.ok).toBe(true);if(!created.ok)throw Error(created.error);expect("definition" in created.item).toBe(false);
  expect(await publishMarketplaceAesthetic(seller,developer,created.item.id)).toEqual({ok:true});
 });
 it("hides unpaid snapshots from their own buyer and other buyers, retaining the server snapshot",async()=>{
  for(const api of [owner,stranger]){const read=await api.from("aesthetic_library").select("definition").eq("id",pendingId);expect(read.error).toBeNull();expect(read.data).toEqual([]);}
  const saved=await service.from("aesthetic_library").select("definition").eq("id",pendingId).single();expect(saved.error).toBeNull();expect(saved.data!.definition).toEqual(definition);
 });
 it("actual acquisition snapshots trusted source, persists the Wave quote, unlocks once and reuses owned source",async()=>{
  provider.start.mockResolvedValue({ok:true,paymentUrl:"https://pay.wave.com/fixture-checkout",providerPaymentId:"cos-source-fixture",settlement:{amountMinor:3000,currency:"XOF"}});
  const checkout=await acquireMarketplaceAesthetic(owner,{id:buyer,email:"buyer@example.invalid"},templateId,"https://kebu.example.invalid","wave",service);expect(checkout).toMatchObject({ok:true,paymentUrl:"https://pay.wave.com/fixture-checkout"});
  const charge=provider.start.mock.calls[0]![0];expect(charge.amountMinor).toBe(500);expect(charge.currency).toBe("USD");expect(charge.metadata.owner_id).toBe(buyer);
  const receipt=await service.from("aesthetic_library").select("id,definition,status,provider_reference").eq("owner_id",buyer).eq("marketplace_id",templateId).single();expect(receipt.error).toBeNull();expect(receipt.data!.status).toBe("pending");expect(receipt.data!.definition).toEqual(definition);
  const hidden=await owner.from("aesthetic_library").select("definition").eq("id",receipt.data!.id);expect(hidden.error).toBeNull();expect(hidden.data).toEqual([]);
  const proof={p_reference:charge.reference,p_checkout_id:"cos-source-fixture",p_transaction_id:"TX-source-fixture",p_event_id:"EV-source-fixture",p_amount_xof:3000,p_currency:"XOF"};
  const unlocked=await service.rpc("complete_verified_wave_payment",proof);expect(unlocked.error).toBeNull();expect(unlocked.data.already_paid).toBe(false);
  const replay=await service.rpc("complete_verified_wave_payment",proof);expect(replay.error).toBeNull();expect(replay.data.already_paid).toBe(true);
  const owned=await owner.from("aesthetic_library").select("definition,status").eq("id",receipt.data!.id).single();expect(owned.error).toBeNull();expect(owned.data).toEqual({definition,status:"owned"});
  const otherRead=await stranger.from("aesthetic_library").select("definition").eq("id",receipt.data!.id);expect(otherRead.error).toBeNull();expect(otherRead.data).toEqual([]);
  const again=await acquireMarketplaceAesthetic(owner,{id:buyer},templateId,"https://kebu.example.invalid","wave",service);expect(again).toMatchObject({ok:true,alreadyOwned:true,item:{definition}});expect(provider.start).toHaveBeenCalledTimes(1);
  const count=await service.from("marketplace_templates").select("sales_count").eq("id",templateId).single();expect(count.error).toBeNull();expect(count.data!.sales_count).toBe(1);
 });
 it("does not let trusted checkout read an unpublished template on the buyer's behalf",async()=>{
  expect(await acquireMarketplaceAesthetic(owner,{id:buyer},draftId,"https://kebu.example.invalid","wave",service)).toMatchObject({ok:false,status:404});
 });
 it("preserves actual personal source upload and readback",async()=>{
  const uploaded=await uploadOwnedAesthetic(owner,buyer,{name:"My source "+randomUUID(),fileJson:{kebuTemplate:"kebu-template-website-v1",name:"Upload",definition}});expect(uploaded.ok).toBe(true);if(!uploaded.ok)throw Error(uploaded.error);expect(uploaded.item.definition).toEqual(definition);
 });
});
