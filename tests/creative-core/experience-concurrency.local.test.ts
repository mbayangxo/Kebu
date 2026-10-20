import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
// @ts-expect-error — installed pg has no @types/pg project dependency
import { Pool } from "pg";
import { setupExperienceDatabase } from "./experience-db-setup";
import { assertLocalPublishDatabase } from "./publish-db-setup";
type Connection = { processID: number; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; release: () => void };
type DatabasePool = { query: Connection["query"]; connect: () => Promise<Connection>; end: () => Promise<void> };
const adminUrl = process.env.KEBU_PUBLISH_CONCURRENCY_DATABASE_URL, database = `_kebutest_experience_${randomUUID().replaceAll("-", "")}`;
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222", project = "33333333-3333-4333-8333-333333333333", otherProject = "44444444-4444-4444-8444-444444444444";
let admin: DatabasePool | undefined, pool: DatabasePool | undefined, created = false;
async function connection() { const client = await pool!.connect(); await client.query("set role service_role;set statement_timeout='10s'"); return client; }
const reserve = (client: Connection, id = randomUUID(), user = owner, site = project) => client.query<{ ok: boolean }>("select reserve_experience_generation($1,$2,$3,1,'plan') as ok", [user, site, id]);
async function blocked(waiter: Connection, holder: Connection) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const row = (await pool!.query<{ reached: boolean }>(`with recursive blockers(pid,path) as (
      select pid,array[$1::int,pid] from unnest(pg_blocking_pids($1)) as pid
      union all select next_pid,path||next_pid from blockers cross join lateral unnest(pg_blocking_pids(blockers.pid)) as next_pid where not next_pid=any(path)
    ) select exists(select 1 from blockers where pid=$2) as reached`, [waiter.processID, holder.processID])).rows[0];
    if (row.reached) { console.info("Observed independent PostgreSQL lock barrier", waiter.processID, holder.processID); return; }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw Error("Independent PostgreSQL race barrier was not observed");
}
const settle = <T>(promise: Promise<T>) => promise.then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }));
async function release(...clients: Connection[]) { for (const client of clients) { try { await client.query("rollback;reset role"); } finally { client.release(); } } }
describe.skipIf(!adminUrl)("Experience gateway independent PostgreSQL reservations", () => {
  beforeAll(async () => {
    const url = assertLocalPublishDatabase(adminUrl!); admin = new Pool({ connectionString: url.href, max: 1 }) as DatabasePool;
    await admin.query(`create database "${database}"`); created = true; url.pathname = `/${database}`;
    pool = new Pool({ connectionString: url.href, max: 6 }) as DatabasePool;
    await setupExperienceDatabase({ exec: sql => pool!.query(sql) });
  }, 60000);
  beforeEach(async () => {
    await pool!.query("truncate projects,auth.users cascade");
    await pool!.query("insert into auth.users(id) values($1),($2)", [owner, other]);
    await pool!.query("insert into projects(id,owner_id,title,document_schema_version) values($1,$2,'First','kcd-1'),($3,$4,'Second','kcd-1')", [project, owner, otherProject, other]);
  });
  afterAll(async () => { try { if (pool) await pool.end(); } finally { try { if (created) await admin!.query(`drop database "${database}" with (force)`); } finally { if (admin) await admin.end(); } } });
  for (const replay of [false, true]) it(`${replay ? "duplicate request" : "last allowance"} admits one request under a real lock barrier`, async () => {
    const holder = await connection(), first = await connection(), second = await connection();
    try {
      expect(new Set([holder.processID, first.processID, second.processID]).size).toBe(3);
      await holder.query("begin;select pg_advisory_xact_lock(hashtextextended($1,391))", [owner]);
      const id = randomUUID(), a = settle(reserve(first, id)); await blocked(first, holder);
      const b = settle(reserve(second, replay ? id : randomUUID())); await blocked(second, holder);
      await holder.query("commit");
      const results = await Promise.all([a, b]); expect(results.every(result => result.ok)).toBe(true);
      expect(results.filter(result => result.ok && result.value.rows[0].ok)).toHaveLength(1);
      expect((await pool!.query("select count(*)::int as total from account_ai_usage_events")).rows[0].total).toBe(1);
    } finally { await release(holder, first, second); }
  }, 20000);
  it("isolates owner budgets while another owner's reservation is blocked", async () => {
    const holder = await connection(), first = await connection(), second = await connection();
    try {
      expect(new Set([holder.processID, first.processID, second.processID]).size).toBe(3);
      await holder.query("begin;select pg_advisory_xact_lock(hashtextextended($1,391))", [owner]);
      const pending = settle(reserve(first)); await blocked(first, holder);
      expect((await reserve(second, randomUUID(), other, otherProject)).rows[0].ok).toBe(true);
      await holder.query("commit"); expect((await pending).ok).toBe(true);
      expect((await pool!.query("select count(*)::int as total from account_ai_usage_events")).rows[0].total).toBe(2);
    } finally { await release(holder, first, second); }
  }, 20000);
  it("shares the last allowance between a native plan and a legacy Studio request", async () => {
    const holder = await connection(), native = await connection(), legacy = await connection();
    try {
      expect(new Set([holder.processID, native.processID, legacy.processID]).size).toBe(3);
      await holder.query("begin;select pg_advisory_xact_lock(hashtextextended($1,391))", [owner]);
      const a = settle(reserve(native)); await blocked(native, holder);
      const b = settle(legacy.query<{ ok: boolean }>("select reserve_account_ai_generation($1,null,$2,1,'studio_generate') as ok", [owner, randomUUID()]));
      await blocked(legacy, holder); await holder.query("commit");
      const results = await Promise.all([a, b]);
      expect(results.every(result => result.ok)).toBe(true);
      expect(results.filter(result => result.ok && result.value.rows[0].ok)).toHaveLength(1);
      expect((await pool!.query("select count(*)::int as total from account_ai_usage_events")).rows[0].total).toBe(1);
    } finally { await release(holder, native, legacy); }
  }, 20000);
  it("releases a rolled-back reservation so the waiting session can use the allowance", async () => {
    const first = await connection(), second = await connection();
    try {
      expect(first.processID).not.toBe(second.processID);
      await first.query("begin"); expect((await reserve(first)).rows[0].ok).toBe(true);
      const pending = settle(reserve(second)); await blocked(second, first); await first.query("rollback");
      const result = await pending; expect(result.ok && result.value.rows[0].ok).toBe(true);
      expect((await pool!.query("select count(*)::int as total from account_ai_usage_events")).rows[0].total).toBe(1);
    } finally { await release(first, second); }
  }, 20000);
});
