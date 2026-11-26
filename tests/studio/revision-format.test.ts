import { describe, expect, it } from "vitest";
import { restoreVersionSchema, createVersionSchema } from "@/lib/studio/design-versions";
import { updateWorkItemSchema } from "@/lib/work/items";
const id="11111111-1111-4111-8111-111111111111";
describe("Database revision timestamp formats",()=>{
 it.each(["2026-10-14T12:00:00.000123+00:00","2026-10-14T08:00:00.000123-04:00","2026-10-14T12:00:00.000123Z"])("accepts exact database timestamps %s",revision=>{
  expect(restoreVersionSchema.safeParse({versionId:id,expectedUpdatedAt:revision}).success).toBe(true);
  expect(createVersionSchema.safeParse({label:"Checkpoint",expectedUpdatedAt:revision}).success).toBe(true);
  expect(updateWorkItemSchema.safeParse({id,body:"Draft",expectedUpdatedAt:revision}).success).toBe(true);
 });
 it("rejects an invalid revision",()=>expect(updateWorkItemSchema.safeParse({id,expectedUpdatedAt:"invalid"}).success).toBe(false));
});
