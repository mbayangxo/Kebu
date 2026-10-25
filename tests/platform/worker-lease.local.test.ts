import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

const fulfill = vi.hoisted(() => vi.fn());
vi.mock("@/lib/shop/digital-downloads", () => ({ fulfillPaidDigitalOrder: fulfill }));
import { runPlatformWorker } from "@/lib/platform/worker";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec(sql: string): Promise<unknown>; query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>; close(): Promise<void> };

async function database(): Promise<Db> {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const db: Db = new PGlite();
  await db.exec(`create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
    create table public.projects(id uuid primary key);
    create role anon; create role authenticated; create role service_role bypassrls;`);
  await db.exec(readFileSync("supabase/migrations/20260920040000_platform_durability.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/20260920050000_platform_worker_recovery.sql", "utf8"));
  await db.exec(`insert into platform_jobs(job_type,payload) values ('digital.fulfill','{"orderId":"owned-order"}');`);
  return db;
}

// Only transport is adapted. Claims, recovery and filtered updates execute in PostgreSQL.
function client(db: Db): SupabaseClient {
  return {
    rpc: async (_name: string, args: { p_worker: string; p_limit: number }) => {
      const result = await db.query("select * from claim_platform_jobs($1,$2)", [args.p_worker, args.p_limit]);
      return { data: result.rows, error: null };
    },
    from: () => ({ update: (patch: Record<string, unknown>) => {
      const filters: [string, unknown][] = [];
      const execute = async () => {
        const entries = Object.entries(patch), values = entries.map(([, value]) => value);
        const set = entries.map(([key], index) => `${key}=$${index + 1}`).join(",");
        const where = filters.map(([key, value]) => { values.push(value); return `${key}=$${values.length}`; }).join(" and ");
        const result = await db.query(`update platform_jobs set ${set} where ${where} returning id`, values);
        return { data: result.rows[0] ?? null, error: null };
      };
      const query = {
        eq(key: string, value: unknown) { filters.push([key, value]); return query; },
        select() { return query; },
        maybeSingle: execute,
        then(resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) { return execute().then(resolve, reject); },
      };
      return query;
    } }),
  } as unknown as SupabaseClient;
}

describe.skipIf(!root)("worker lease completion against actual claim/recovery SQL", () => {
  for (const outcome of ["success", "retry", "dead"] as const) {
    it(`the current claim still records ${outcome}`, async () => {
      const db = await database();
      try {
        if (outcome === "dead") await db.exec("update platform_jobs set max_attempts=1");
        fulfill.mockReset().mockImplementation(async () => {
          if (outcome !== "success") throw new Error("temporary delivery error");
        });
        const result = await runPlatformWorker(client(db), "current-worker", 1);
        const row = (await db.query("select * from platform_jobs")).rows[0];
        expect(row).toMatchObject({ status: outcome === "success" ? "succeeded" : outcome === "retry" ? "failed" : "dead", locked_by: null, locked_at: null, attempts: 1 });
        expect(result).toEqual({ claimed: 1, succeeded: outcome === "success" ? 1 : 0, failed: outcome === "success" ? 0 : 1, superseded: 0 });
      } finally { await db.close(); }
    }, 30_000);
  }

  for (const outcome of ["success", "failure"] as const) {
    for (const newerFinished of [false, true]) {
      it(`old ${outcome} cannot overwrite a ${newerFinished ? "completed" : "running"} newer attempt, even with the same worker id`, async () => {
        const db = await database();
        try {
          let release!: () => void;
          let entered!: () => void;
          const started = new Promise<void>(resolve => { entered = resolve; });
          const blocked = new Promise<void>(resolve => { release = resolve; });
          fulfill.mockReset().mockImplementation(async () => {
            entered(); await blocked;
            if (outcome === "failure") throw new Error("old provider request failed");
          });
          const old = runPlatformWorker(client(db), "reused-worker-id", 1);
          await started;
          await db.exec("update platform_jobs set locked_at=now()-interval '11 minutes'");
          const next = await db.query("select * from claim_platform_jobs('reused-worker-id',1)");
          expect(next.rows).toHaveLength(1);
          expect(next.rows[0].attempts).toBe(2);
          if (newerFinished) await db.exec("update platform_jobs set status='succeeded',completed_at=now(),locked_at=null,locked_by=null");
          const before = (await db.query("select * from platform_jobs")).rows;
          release();
          const result = await old;
          expect((await db.query("select * from platform_jobs")).rows).toEqual(before);
          expect(result).toMatchObject({ claimed: 1, succeeded: 0, failed: 0, superseded: 1 });
        } finally { await db.close(); }
      }, 30_000);
    }
  }
});
