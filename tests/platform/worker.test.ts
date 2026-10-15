import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const fulfillPaidDigitalOrder = vi.fn();
vi.mock("@/lib/shop/digital-downloads", () => ({
  fulfillPaidDigitalOrder: (...args: unknown[]) => fulfillPaidDigitalOrder(...args),
}));

import { runPlatformWorker } from "@/lib/platform/worker";

describe("platform worker",()=>{
 it("claims and idempotently completes a notification job",async()=>{
  const updateEq=vi.fn().mockResolvedValue({error:null});
  const upsert=vi.fn().mockResolvedValue({error:null});
  const admin={rpc:vi.fn().mockResolvedValue({data:[{id:"j1",job_type:"notification.create",payload:{userId:"u1",title:"Published"},attempts:1,max_attempts:5}],error:null}),from:vi.fn((table:string)=>table==="user_notifications"?{upsert}:{update:vi.fn(()=>({eq:updateEq}))})} as unknown as SupabaseClient;
  const result=await runPlatformWorker(admin,"test",1);
  expect(result).toEqual({claimed:1,succeeded:1,failed:0});
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({source_job_id:"j1"}),expect.objectContaining({onConflict:"source_job_id"}));
 });
 it("retries a digital.fulfill job (via failPlatformJob backoff) when the raw core throws, rather than re-enqueueing a duplicate",async()=>{
  fulfillPaidDigitalOrder.mockReset().mockRejectedValue(new Error("mail provider down"));
  const updateEq=vi.fn().mockResolvedValue({error:null});
  const admin={rpc:vi.fn().mockResolvedValue({data:[{id:"j2",job_type:"digital.fulfill",payload:{orderId:"order-1"},attempts:1,max_attempts:5}],error:null}),from:vi.fn(()=>({update:vi.fn(()=>({eq:updateEq}))}))} as unknown as SupabaseClient;
  const result=await runPlatformWorker(admin,"test",1);
  expect(result).toEqual({claimed:1,succeeded:0,failed:1});
  expect(fulfillPaidDigitalOrder).toHaveBeenCalledWith(admin,"order-1");
  // failPlatformJob's update sets status to "failed" (not dead — attempts 1 < max_attempts 5) with a run_after backoff, not a fresh enqueue.
  expect(updateEq).toHaveBeenCalled();
 });
 it("executes a digital.fulfill job by calling the raw core, and succeeds when it resolves",async()=>{
  fulfillPaidDigitalOrder.mockReset().mockResolvedValue(undefined);
  const updateEq=vi.fn().mockResolvedValue({error:null});
  const admin={rpc:vi.fn().mockResolvedValue({data:[{id:"j3",job_type:"digital.fulfill",payload:{orderId:"order-2"},attempts:1,max_attempts:5}],error:null}),from:vi.fn(()=>({update:vi.fn(()=>({eq:updateEq}))}))} as unknown as SupabaseClient;
  const result=await runPlatformWorker(admin,"test",1);
  expect(result).toEqual({claimed:1,succeeded:1,failed:0});
  expect(fulfillPaidDigitalOrder).toHaveBeenCalledWith(admin,"order-2");
 });
 it("rejects an invalid digital.fulfill payload instead of calling the core with a bad orderId",async()=>{
  fulfillPaidDigitalOrder.mockReset();
  const updateEq=vi.fn().mockResolvedValue({error:null});
  const admin={rpc:vi.fn().mockResolvedValue({data:[{id:"j4",job_type:"digital.fulfill",payload:{},attempts:1,max_attempts:5}],error:null}),from:vi.fn(()=>({update:vi.fn(()=>({eq:updateEq}))}))} as unknown as SupabaseClient;
  const result=await runPlatformWorker(admin,"test",1);
  expect(result).toEqual({claimed:1,succeeded:0,failed:1});
  expect(fulfillPaidDigitalOrder).not.toHaveBeenCalled();
 });
});
