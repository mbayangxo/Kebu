import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
import {starterFiles} from "@/lib/kebu-code/workspace";

const mocks=vi.hoisted(()=>({client:vi.fn(),ai:vi.fn(),store:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.client}));
vi.mock("@/lib/yande/gateway",()=>({yandeConfigured:()=>true,yandeStructured:mocks.ai}));
vi.mock("@/lib/create/public-site-loader",()=>({loadPublicDeployment:mocks.store}));
vi.mock("@/lib/api-guard",()=>({aiRateLimit:()=>null}));
import {GET,POST} from "@/app/api/code/route";

const owner="11111111-1111-4111-8111-111111111111",id="22222222-2222-4222-8222-222222222222";
const current={id,title:"Shop app",revision:2,files:starterFiles,history:[{revision:1,files:starterFiles}],updated_at:"2026-11-20"};
const updated={...starterFiles,"index.html":"<main>Changed</main>"};
function action(payload:unknown,origin="https://kebu.test"){
 return POST(new NextRequest("https://kebu.test/api/code",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(payload)}));
}
function db({signedIn=true,found=true,raced=false}={}){
 const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),update:vi.fn().mockReturnThis(),maybeSingle:vi.fn()
  .mockResolvedValueOnce({data:found?current:null,error:null})
  .mockResolvedValueOnce({data:raced?null:{...current,revision:3,files:updated},error:null})};
 mocks.client.mockResolvedValue({auth:{getUser:async()=>({data:{user:signedIn?{id:owner}:null}})},from:vi.fn().mockReturnValue(q)});
 return q;
}
beforeEach(()=>vi.resetAllMocks());
describe("Kebu Code signed-in workflow",()=>{
 it("rejects unsigned, cross-origin, and foreign workspace writes",async()=>{
   db({signedIn:false});
   expect((await action({action:"save",id,base:2,files:updated})).status).toBe(401);
   expect((await action({action:"save",id,base:2,files:updated},"https://elsewhere.test")).status).toBe(403);
   const q=db({found:false});
   expect((await action({action:"save",id,base:2,files:updated})).status).toBe(404);
   expect(q.eq).toHaveBeenCalledWith("owner_id",owner);
   expect(q.update).not.toHaveBeenCalled();
 });
 it("validates store context, then returns a proposal without modifying source",async()=>{
   const q=db();
   mocks.store.mockResolvedValue({subdomain:"creamery",publicPath:"/sites/creamery"});
   mocks.ai.mockResolvedValue({output:{summary:"Updated the layout.",files:updated}});
   const res=await action({action:"propose",id,base:2,prompt:"Add a shop link",design:"Cream background, keep navigation.",store:"creamery"});
   expect(res.status).toBe(200);
   expect(await res.json()).toEqual({base:2,summary:"Updated the layout.",files:updated});
   expect(mocks.ai).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({designDirection:"Cream background, keep navigation.",publishedStore:expect.objectContaining({subdomain:"creamery",url:"https://kebu.test/sites/creamery"})})}));
   expect(q.update).not.toHaveBeenCalled();
 });
 it("saves a revision and snapshots prior source; a racing write cannot overwrite",async()=>{
   let q=db();
   expect((await action({action:"save",id,base:2,files:updated})).status).toBe(200);
   expect(q.update).toHaveBeenCalledWith(expect.objectContaining({revision:3,files:updated,history:[{revision:2,files:starterFiles},{revision:1,files:starterFiles}]}));
   expect(q.eq).toHaveBeenCalledWith("revision",2);
   q=db({raced:true});
   expect((await action({action:"save",id,base:2,files:updated})).status).toBe(409);
   expect(q.eq).toHaveBeenCalledWith("revision",2);
 });
 it("restores only retained revisions and rejects non-workspace files",async()=>{
   const q=db();
   expect((await action({action:"save",id,base:2,files:{...updated,"package.json":"{}"}})).status).toBe(400);
   expect((await action({action:"restore",id,base:2,target:1})).status).toBe(200);
   expect(q.update).toHaveBeenCalledWith(expect.objectContaining({revision:3,files:starterFiles}));
 });
});


it("requires owner approval when binding a store and refuses a stale write",async()=>{
  const storeId="33333333-3333-4333-8333-333333333333";
  for(const [authorized,raced,expected] of [[false,false,403],[true,true,409],[true,false,200]] as const){
    const code=db({raced});
    const store={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:authorized?{id:storeId}:null,error:null})};
    mocks.client.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:owner}}})},from:(table:string)=>table==="projects"?store:code});
    const result=await action({action:"connectStore",id,base:2,storeId});
    expect(result.status).toBe(expected);
    expect(store.eq).toHaveBeenCalledWith("owner_id",owner);
    if(authorized)expect(code.update).toHaveBeenCalledWith(expect.objectContaining({store_project_id:storeId,revision:3}));
    else expect(code.update).not.toHaveBeenCalled();
  }
});

it("reads catalog through the saved binding and fails closed after ownership changes",async()=>{
  const storeId="33333333-3333-4333-8333-333333333333";
  const product={id:"p",name:"Coffee",price_label:"$4",track_stock:true,stock_qty:7,has_variants:false};
  const code={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{...current,store_project_id:storeId},error:null})};
  const store={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{id:storeId},error:null})};
  const products={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),limit:vi.fn().mockResolvedValue({data:[product],error:null})};
  const reads=vi.fn((table:string)=>table==="projects"?store:table==="project_products"?products:code);
  mocks.client.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:owner}}})},from:reads});
  const request=()=>GET(new NextRequest("https://kebu.test/api/code?id="+id+"&catalog=1"));
  const loaded=await request();
  expect(await loaded.json()).toEqual({products:[product],hasMore:false});
  expect(products.eq).toHaveBeenCalledWith("project_id",storeId);
  expect(products.eq).toHaveBeenCalledWith("is_active",true);
  expect(products.eq).toHaveBeenCalledWith("projects.owner_id",owner);
  store.maybeSingle.mockResolvedValueOnce({data:null,error:null});
  reads.mockClear();
  expect((await request()).status).toBe(403);
  expect(reads).not.toHaveBeenCalledWith("project_products");
});
