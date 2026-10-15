import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), db: vi.fn(), sync: vi.fn(), guard: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: mocks.auth, logCreate: vi.fn() }));
vi.mock("@/lib/create/project-access", () => ({ assertProjectEditorAccess: mocks.access, dbForProjectAccess: mocks.db }));
vi.mock("@/lib/create/site-chrome", () => ({ syncProjectChromeNavFromPages: mocks.sync }));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: () => null }));
vi.mock("@/lib/create/kcd-write-guard", () => ({ rejectLegacySectionWrite: mocks.guard }));
import { PATCH, DELETE } from "@/app/api/projects/[id]/pages/route";
const projectId="11111111-1111-4111-8111-111111111111", home="22222222-2222-4222-8222-222222222222", about="33333333-3333-4333-8333-333333333333";
const pages=[{id:home,project_id:projectId,title:"Home",slug:"home",sort_order:0,parent_id:null},{id:about,project_id:projectId,title:"About",slug:"about",sort_order:1,parent_id:null}];
const ctx={params:Promise.resolve({id:projectId})};
const req=(method:string,body:unknown)=>new Request(`https://kebu.test/api/projects/${projectId}/pages`,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
function setup(result:unknown){
 const write={eq:vi.fn(),select:vi.fn(),maybeSingle:vi.fn().mockResolvedValue({data:result,error:null}),then:(resolve:(x:unknown)=>unknown)=>Promise.resolve({data:result,error:null}).then(resolve)};
 write.eq.mockReturnValue(write);write.select.mockReturnValue(write);
 const read={eq:vi.fn(),maybeSingle:vi.fn().mockResolvedValue({data:pages[1],error:null}),then:(resolve:(x:unknown)=>unknown)=>Promise.resolve({data:pages,count:2,error:null}).then(resolve)};read.eq.mockReturnValue(read);
 const db={from:vi.fn(()=>({select:()=>read,upsert:vi.fn(()=>write),delete:()=>write}))};
 mocks.db.mockReturnValue(db);return{write,db};
}
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue({user:{id:home},supabase:{}});mocks.access.mockResolvedValue({project:{id:projectId},via:"owner"});});
describe("Builder legacy page mutation receipts",()=>{
 it("refuses a deletion that affected no visible row",async()=>{setup(null);const response=await DELETE(req("DELETE",{pageId:about}),ctx);expect(response.status).toBe(409);expect(mocks.sync).not.toHaveBeenCalled();});
 it("returns the deleted identity only after a tenant-scoped receipt",async()=>{const{write}=setup({id:about});const response=await DELETE(req("DELETE",{pageId:about}),ctx);expect(response.status).toBe(200);expect(await response.json()).toMatchObject({ok:true,deletedPageId:about});expect(write.eq).toHaveBeenCalledWith("project_id",projectId);});
 it.each([null,[],[pages[0]],[pages[0],pages[0]]].map(result=>[result]))("refuses an incomplete/duplicate order receipt: %j",async result=>{setup(result);expect((await PATCH(req("PATCH",{order:[home,about]}),ctx)).status).toBe(409);expect(mocks.sync).not.toHaveBeenCalled();});
 it("returns database rows rather than invented order success",async()=>{setup(pages);const response=await PATCH(req("PATCH",{order:[home,about]}),ctx);expect(response.status).toBe(200);expect(await response.json()).toEqual({pages});});
 it("reports navigation sync failure after confirmed reordering",async()=>{setup(pages);mocks.sync.mockRejectedValue(new Error("offline"));const response=await PATCH(req("PATCH",{order:[home,about]}),ctx);expect(await response.json()).toMatchObject({pages,navSyncStale:true});});
 it("preserves the native write guard before legacy writes",async()=>{const{db}=setup(pages);mocks.guard.mockReturnValue(new Response("Native operation required",{status:409}));expect((await PATCH(req("PATCH",{order:[home,about]}),ctx)).status).toBe(409);expect(db.from).not.toHaveBeenCalled();});
 it("rejects cross-origin mutation before authentication",async()=>{setup(null);expect((await DELETE(new Request(`https://kebu.test/api/projects/${projectId}/pages`,{method:"DELETE",headers:{Origin:"https://other.test"}}),ctx)).status).toBe(403);expect(mocks.auth).not.toHaveBeenCalled();});
});
