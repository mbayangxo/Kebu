import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
import {starterFiles} from "@/lib/kebu-code/workspace";

const mocks=vi.hoisted(()=>({client:vi.fn(),ai:vi.fn(),store:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.client}));
vi.mock("@/lib/yande/gateway",()=>({yandeConfigured:()=>true,yandeStructured:mocks.ai}));
vi.mock("@/lib/create/public-site-loader",()=>({loadPublicDeployment:mocks.store}));
vi.mock("@/lib/api-guard",()=>({aiRateLimit:()=>null}));
import {POST} from "@/app/api/code/route";

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
   const res=await action({action:"propose",id,base:2,prompt:"Add a shop link",store:"creamery"});
   expect(res.status).toBe(200);
   expect(await res.json()).toEqual({base:2,summary:"Updated the layout.",files:updated});
   expect(mocks.ai).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({publishedStore:expect.objectContaining({subdomain:"creamery",url:"https://kebu.test/sites/creamery"})})}));
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
