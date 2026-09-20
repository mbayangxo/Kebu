import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
describe("Track B worker recovery migration",()=>{const sql=readFileSync(join(process.cwd(),"supabase/migrations/20260920050000_platform_worker_recovery.sql"),"utf8");
 it("recovers stale jobs and makes events immutable",()=>{expect(sql).toContain("interval '10 minutes'");expect(sql).toContain("platform_events_immutable");});
 it("makes notification delivery idempotent and read-only except read_at",()=>{expect(sql).toContain("source_job_id");expect(sql).toContain("grant update(read_at)");});
});
