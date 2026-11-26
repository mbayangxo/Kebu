import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { goLiveKcdProject, kcdPublishDocument } from "@/lib/create/kcd-publish";
import { documentToRows } from "@/lib/create/kcd-adapter";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";
import type { NodeId } from "@/lib/creative-core";
function fixture(){const doc=emptyDocument();doc.meta.documentSchemaVersion="kcd-1";const n=node({id:uuidFor(55) as NodeId,type:"section",pageId:PAGE_A,orderKey:"V"});doc.nodes[n.id]=n;return {doc,source:{...documentToRows(doc),products:[]}};}
function enabled(){vi.stubEnv("KEBU_KCD_RENDER","all");vi.stubEnv("KEBU_KCD_OPERATIONS","all");vi.stubEnv("VERCEL_ENV","preview");vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://qa.test");}
afterEach(()=>vi.unstubAllEnvs());
describe("S7 server publishing",()=>{
 it("passes the same consistent source and hash-protected envelope to one atomic commit RPC",async()=>{
  enabled();const {doc,source}=fixture();const rpc=vi.fn().mockResolvedValueOnce({data:source,error:null}).mockImplementationOnce(async (_name,body)=>({data:{publicPath:"/sites/local",contentHash:body.p_snapshot.contentHash,deploymentId:uuidFor(88)},error:null}));
  expect(await goLiveKcdProject({projectId:doc.id,userId:uuidFor(9),subdomain:"local",admin:{rpc} as unknown as SupabaseClient})).toMatchObject({ok:true,publicPath:"/sites/local"});
  expect(rpc.mock.calls[1][0]).toBe("publish_kcd_document");expect(rpc.mock.calls[1][1].p_source).toBe(source);expect(rpc.mock.calls[1][1].p_snapshot.document.nodes).toHaveProperty(Object.keys(doc.nodes)[0]);
 });
 it.each([["40001",409],["23505",409],["PGRST202",503],["XX000",500]])("returns %s as status %s with the old live site unchanged",async(code,status)=>{
  enabled();const {doc,source}=fixture();const rpc=vi.fn().mockResolvedValueOnce({data:source,error:null}).mockResolvedValueOnce({data:null,error:{code,message:"Commit failed"}});
  expect(await goLiveKcdProject({projectId:doc.id,userId:uuidFor(9),subdomain:"local",admin:{rpc} as unknown as SupabaseClient})).toMatchObject({ok:false,status,error:expect.stringMatching(/previous live site is unchanged/)});
 });
 it("blocks production before reading or mutating the database",async()=>{
  enabled();vi.stubEnv("VERCEL_ENV","production");const rpc=vi.fn();expect(await goLiveKcdProject({projectId:fixture().doc.id,userId:uuidFor(9),subdomain:"local",admin:{rpc} as unknown as SupabaseClient})).toMatchObject({ok:false,status:409});expect(rpc).not.toHaveBeenCalled();
 });
 it("merges catalog content deterministically without mutating the saved draft",()=>{
  const {source}=fixture();const original=JSON.stringify(source);const product={id:uuidFor(77),project_id:source.project.id,business_id:null,name:"Rice",description:"Local",price_label:"500 XOF",image_url:"",whatsapp_order_message:"",sort_order:0,is_active:true,created_at:"",updated_at:""};
  const doc=kcdPublishDocument({...source,products:[product]});const next=kcdPublishDocument({...source,products:[product]});expect(doc).toEqual(next);expect(JSON.stringify(source)).toBe(original);expect(Object.values(doc.nodes).find(n=>n.type==="legacy-section:products")?.props.items).toEqual([expect.objectContaining({name:"Rice"})]);
 });
});

describe("publish confirmation failures",()=>{
 it.each([
  {data:null,error:{code:"",message:"TypeError: fetch failed"}},
  {data:null,error:{code:"PGRST000",message:"Gateway connection failed"}},
  {data:null,error:{code:"08007",message:"Transaction resolution unknown"}},
  {data:null,error:null},
  {data:{publicPath:"/wrong-site"},error:null},
 ])("does not promise rollback or successful publication when commit confirmation is unavailable",async(result)=>{
  enabled();const {doc,source}=fixture();const rpc=vi.fn().mockResolvedValueOnce({data:source,error:null}).mockResolvedValueOnce(result);
  const outcome=await goLiveKcdProject({projectId:doc.id,userId:uuidFor(9),subdomain:"local",admin:{rpc} as unknown as SupabaseClient});
  expect(outcome).toMatchObject({ok:false,status:503,error:expect.stringMatching(/could not be confirmed/)});
  expect(outcome.ok?"":outcome.error).not.toMatch(/unchanged|resolving the conflict/);expect(rpc).toHaveBeenCalledTimes(2);
 });
 it("handles a thrown commit transport failure without retrying the transaction",async()=>{
  enabled();const {doc,source}=fixture();const rpc=vi.fn().mockResolvedValueOnce({data:source,error:null}).mockRejectedValueOnce(new Error("Connection closed after commit"));
  await expect(goLiveKcdProject({projectId:doc.id,userId:uuidFor(9),subdomain:"local",admin:{rpc} as unknown as SupabaseClient})).resolves.toMatchObject({ok:false,status:503,error:expect.stringMatching(/could not be confirmed/)});
  expect(rpc).toHaveBeenCalledTimes(2);
 });
});
