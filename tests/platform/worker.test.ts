import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runPlatformWorker } from "@/lib/platform/worker";

describe("platform worker",()=>{it("claims and idempotently completes a notification job",async()=>{
 const updateEq=vi.fn().mockResolvedValue({error:null});
 const upsert=vi.fn().mockResolvedValue({error:null});
 const admin={rpc:vi.fn().mockResolvedValue({data:[{id:"j1",job_type:"notification.create",payload:{userId:"u1",title:"Published"},attempts:1,max_attempts:5}],error:null}),from:vi.fn((table:string)=>table==="user_notifications"?{upsert}:{update:vi.fn(()=>({eq:updateEq}))})} as unknown as SupabaseClient;
 const result=await runPlatformWorker(admin,"test",1);
 expect(result).toEqual({claimed:1,succeeded:1,failed:0});
 expect(upsert).toHaveBeenCalledWith(expect.objectContaining({source_job_id:"j1"}),expect.objectContaining({onConflict:"source_job_id"}));
});});
