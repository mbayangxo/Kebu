import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
import { GET, POST, PATCH, DELETE } from "@/app/api/work/items/route";
const id="11111111-1111-4111-8111-111111111111", owner="22222222-2222-4222-8222-222222222222";
const revision="2026-10-14T12:00:00.000123+00:00";
const row={id,owner_id:owner,business_id:null,kind:"doc",title:"Document",body:"Text",status:"draft",due_at:null,start_at:null,end_at:null,updated_at:revision};
const request=(method:string,body?:unknown,query="")=>new Request("https://kebu.test/api/work/items"+query,{method,headers:{"Content-Type":"application/json"},...(body!==undefined?{body:JSON.stringify(body)}:{})});
function setup(result:{data:unknown;error:unknown}={data:row,error:null}){
  const read={select:vi.fn(),eq:vi.fn(),is:vi.fn(),order:vi.fn(),limit:vi.fn(),maybeSingle:vi.fn().mockResolvedValue({data:row,error:null})};
  for(const fn of [read.select,read.eq,read.is,read.order,read.limit])fn.mockReturnValue(read);
  const write={insert:vi.fn(),update:vi.fn(),delete:vi.fn(),eq:vi.fn(),select:vi.fn(),single:vi.fn().mockResolvedValue(result),maybeSingle:vi.fn().mockResolvedValue(result)};
  for(const fn of [write.insert,write.update,write.delete,write.eq,write.select])fn.mockReturnValue(write);
  auth.mockResolvedValue({user:{id:owner},supabase:{from:()=>({select:read.select,insert:write.insert,update:write.update,delete:write.delete})}});return{read,write};
}
beforeEach(()=>vi.clearAllMocks());
describe("Workspace work item persistence boundaries",()=>{
 it.each([POST,PATCH,DELETE])("rejects cross-origin mutation before auth",async handler=>{
  expect((await handler(new Request("https://kebu.test/api/work/items",{method:"POST",headers:{Origin:"https://other.test"}}))).status).toBe(403);expect(auth).not.toHaveBeenCalled();
 });
 it("uses timezone-offset microsecond revisions on the conditional update",async()=>{
  const{write}=setup();expect((await PATCH(request("PATCH",{id,body:"New",expectedUpdatedAt:revision}))).status).toBe(200);expect(write.eq).toHaveBeenCalledWith("updated_at",revision);
 });
 it("advances revision even when the wall clock did not advance",async()=>{
  const{write}=setup();vi.spyOn(Date,"now").mockReturnValue(Date.parse(revision));
  try{await PATCH(request("PATCH",{id,body:"New",expectedUpdatedAt:revision}));expect(Date.parse(write.update.mock.calls[0][0].updated_at)).toBeGreaterThan(Date.parse(revision));}finally{vi.restoreAllMocks();}
 });
 it("keeps legacy clients safe against a read/write race",async()=>{
  const{write}=setup({data:null,error:null});const response=await PATCH(request("PATCH",{id,body:"New"}));expect(response.status).toBe(409);expect(write.eq).toHaveBeenCalledWith("updated_at",revision);expect(await response.json()).toMatchObject({code:"work_item_conflict"});
 });
 it("refuses an invisible item before writing",async()=>{
  const{read,write}=setup();read.maybeSingle.mockResolvedValue({data:null,error:null});expect((await PATCH(request("PATCH",{id,body:"New"}))).status).toBe(404);expect(write.update).not.toHaveBeenCalled();
 });
 it("does not report a denied/missing deletion as successful",async()=>{
  setup({data:null,error:null});expect((await DELETE(request("DELETE",undefined,`?id=${id}&expectedUpdatedAt=${encodeURIComponent(revision)}`))).status).toBe(409);
 });
 it("confirms delete with an exact revision and returned row",async()=>{
  const{write}=setup();expect((await DELETE(request("DELETE",undefined,`?id=${id}&expectedUpdatedAt=${encodeURIComponent(revision)}`))).status).toBe(200);expect(write.eq).toHaveBeenCalledWith("updated_at",revision);
 });
 it("refuses an empty creation receipt",async()=>{
  setup({data:null,error:null});expect((await POST(request("POST",{kind:"doc",title:"Document"}))).status).toBe(500);
 });
 it("confirms retry for the same owner and identical create payload",async()=>{
  const{write}=setup({data:null,error:{code:"23505"}});expect((await POST(request("POST",{id,kind:"doc",title:"Document",body:"Text",status:"draft"}))).status).toBe(200);expect(write.insert).toHaveBeenCalledWith(expect.objectContaining({id,owner_id:owner}));
 });
 it("refuses reuse of a creation ID with different content",async()=>{
  setup({data:null,error:{code:"23505"}});expect((await POST(request("POST",{id,kind:"doc",title:"Other"}))).status).toBe(409);
 });
 it("rejects invalid list filters instead of broadening the query",async()=>{
  setup();expect((await GET(request("GET",undefined,"?kind=unknown"))).status).toBe(400);expect((await GET(request("GET",undefined,"?kind=doc&businessId=bad"))).status).toBe(400);
 });
});
