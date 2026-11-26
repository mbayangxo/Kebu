vi.mock("@/lib/account/server-workspace",()=>({loadActiveWorkspaceScope:vi.fn(async()=>({activeBusinessId:null}))}));
import {beforeEach,describe,expect,it,vi} from "vitest";
const state=vi.hoisted(()=>({auth:vi.fn(),upload:vi.fn(),insert:vi.fn(),url:vi.fn()}));
vi.mock("@/lib/create/auth",()=>({requireUser:state.auth,logCreate:vi.fn()}));vi.mock("@/lib/api-guard",()=>({builderRateLimit:()=>null}));vi.mock("@/lib/opportunity/admin",()=>({createServiceClient:()=>null}));vi.mock("@/lib/studio/design-access",()=>({resolveStudioDesignAccess:vi.fn()}));
import {POST} from "@/app/api/studio/upload/route";
const owner="11111111-1111-4111-8111-111111111111";
const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=", "base64"));
const request=(type="image/png",size?:number)=>{const form=new FormData();form.set("file",new File([size ? new Uint8Array(size) : png],"portrait.png",{type}));return new Request("https://test/api/studio/upload",{method:"POST",body:form});};
describe("Brand Brain uses real authenticated Studio image upload",()=>{
 beforeEach(()=>{vi.resetAllMocks();state.upload.mockResolvedValue({error:null});state.url.mockReturnValue({data:{publicUrl:"https://assets.example/portrait.png"}});state.insert.mockReturnValue({select:()=>({maybeSingle:()=>Promise.resolve({data:{id:owner},error:null})})});state.auth.mockResolvedValue({user:{id:owner},supabase:{storage:{from:()=>({upload:state.upload,getPublicUrl:state.url})},from:()=>({insert:state.insert})}});});
 it("requires sign-in before storage",async()=>{state.auth.mockResolvedValue({error:new Response("Sign in",{status:401})});expect((await POST(request())).status).toBe(401);expect(state.upload).not.toHaveBeenCalled();});
 it("rejects unsafe formats and oversized images",async()=>{expect((await POST(request("image/svg+xml"))).status).toBe(400);expect((await POST(request("image/png",5*1024*1024+1))).status).toBe(400);expect(state.upload).not.toHaveBeenCalled();});
 it("stores bytes in owner's namespace and registers upload",async()=>{const response=await POST(request());expect(response.status).toBe(200);expect(await response.json()).toMatchObject({kind:"image",url:"https://assets.example/portrait.png",uploadId:owner});expect(state.upload).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${owner}/studio/misc/[0-9a-f-]+\\.png$`)),expect.any(Uint8Array),{contentType:"image/png",upsert:false});expect(state.insert).toHaveBeenCalledWith(expect.objectContaining({owner_id:owner,kind:"image",byte_size:png.byteLength}));});
 it("does not claim success after storage failure",async()=>{state.upload.mockResolvedValue({error:{message:"Storage unavailable"}});expect((await POST(request())).status).toBe(500);expect(state.insert).not.toHaveBeenCalled();});
});
