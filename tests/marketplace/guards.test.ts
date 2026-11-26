import { afterEach,describe,it,expect,vi } from "vitest";
vi.mock("@/lib/create/auth",()=>({requireUser:vi.fn()}));
vi.mock("@/lib/admin/assert-admin-cookie",()=>({assertAdminCookie:vi.fn()}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:vi.fn()}));
vi.mock("@/lib/api-guard",()=>({builderRateLimit:()=>null}));
import {mutationGuard,readBody} from "@/lib/marketplace/server";
afterEach(()=>vi.unstubAllEnvs());
describe("marketplace mutation boundary",()=>{
  it("uses the browser Host including port when Next supplies a different internal hostname",()=>{
    const req=new Request("http://localhost:3000/api/dev/apps",{method:"POST",headers:{host:"127.0.0.1:3000",origin:"http://127.0.0.1:3000","content-type":"application/json"}});
    expect(mutationGuard(req)).toBeNull();
  });
  it.each(["http://attacker.example","http://127.0.0.1:3001","not-an-origin"])("denies cross-origin mutation %s",origin=>{
    const req=new Request("http://127.0.0.1:3000/api/dev/apps",{method:"POST",headers:{origin,"content-type":"application/json"}});
    expect(mutationGuard(req)?.status).toBe(403);
  });
  it("rejects oversized and nonobject bodies",async()=>{
    for(const body of ['x'.repeat(13000),"[]","null","invalid"]){
      expect(await readBody(new Request("http://localhost",{method:"POST",body}))).toBeNull();
    }
  });
});
