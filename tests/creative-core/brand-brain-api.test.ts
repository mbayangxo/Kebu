import {beforeEach,describe,expect,it,vi} from "vitest";
import {newBrandBrain,brandBrainStoredFields} from "@/lib/create/brand-brain";
const state=vi.hoisted(()=>({auth:vi.fn(),rpc:vi.fn(),list:{data:[] as Record<string,unknown>[],error:null as unknown},eq:vi.fn()}));
vi.mock("@/lib/create/auth",()=>({requireUser:state.auth}));
vi.mock("@/lib/api-guard",()=>({builderRateLimit:()=>null}));
import {GET,PUT} from "@/app/api/studio/brand-brain/route";
const id="11111111-1111-4111-8111-111111111111";
const request=(patch:Record<string,unknown>={})=>new Request("https://test/api/studio/brand-brain",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,expectedRevision:0,profile:newBrandBrain(),...patch})});
describe("Brand Brain API authority",()=>{
 beforeEach(()=>{
  vi.resetAllMocks();state.list={data:[],error:null};
  const query={select:()=>query,eq:state.eq,order:()=>query,limit:()=>query,then:(resolve:(value:typeof state.list)=>unknown)=>Promise.resolve(state.list).then(resolve)};state.eq.mockReturnValue(query);
  state.auth.mockResolvedValue({user:{id},supabase:{rpc:state.rpc,from:()=>query}});
 });
 it("rejects signed-out requests",async()=>{state.auth.mockResolvedValue({error:new Response("Sign in",{status:401})});expect((await PUT(request())).status).toBe(401);expect(state.rpc).not.toHaveBeenCalled();});
 it("rejects foreign fields and unsafe direction before RPC",async()=>{expect((await PUT(request({ownerId:id}))).status).toBe(400);const p=newBrandBrain();p.brand.logoUrl="javascript:bad";expect((await PUT(request({profile:p}))).status).toBe(400);expect(state.rpc).not.toHaveBeenCalled();});
 it("uses the authenticated RPC and returns its canonical revision",async()=>{state.rpc.mockResolvedValue({data:{...brandBrainStoredFields(newBrandBrain()),id,brain_revision:1},error:null});const response=await PUT(request());expect(response.status).toBe(200);expect((await response.json()).record.revision).toBe(1);expect(state.rpc).toHaveBeenCalledWith("save_brand_brain",expect.objectContaining({p_id:id,p_expected:0}));});
 it("maps stale and denied writes without leaking database detail",async()=>{state.rpc.mockResolvedValue({error:{code:"40001",message:"private DB detail"}});const response=await PUT(request());expect(response.status).toBe(409);expect(JSON.stringify(await response.json())).not.toContain("private DB detail");state.rpc.mockResolvedValue({error:{code:"42501"}});expect((await PUT(request())).status).toBe(404);});
 it("never confirms an invalid acknowledgement",async()=>{state.rpc.mockResolvedValue({data:{id},error:null});expect((await PUT(request())).status).toBe(503);});
 it("owner-scopes reads and keeps one incompatible legacy profile from blocking the others",async()=>{
  const row={...brandBrainStoredFields(newBrandBrain()),id,brain_revision:1};state.list.data=[row,{...row,id:"22222222-2222-4222-8222-222222222222",font_display:"Unsupported legacy font"}];
  const response=await GET(new Request("https://test/api/studio/brand-brain"));expect(response.status).toBe(200);const body=await response.json();expect(body.profiles).toHaveLength(1);expect(body.unavailable).toHaveLength(1);expect(state.eq).toHaveBeenCalledWith("owner_id",id);
 });
 it("does not present database read failure as an empty account",async()=>{state.list.error={message:"private detail"};const response=await GET(new Request("https://test/api/studio/brand-brain"));expect(response.status).toBe(503);expect(await response.json()).not.toHaveProperty("profiles");});
});
