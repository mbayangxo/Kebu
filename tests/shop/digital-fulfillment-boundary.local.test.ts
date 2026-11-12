/**
 * Real-SQL verification of the digital-fulfillment durability boundary:
 * payment-state gating at redemption time, worker-claim concurrency safety,
 * crashed-worker lease recovery, and job idempotency. Runs the actual RPC
 * bodies from the real migration files against PGlite — not a reimplementation
 * that could hide a real bug. Schema setup below is a minimal stand-in (no
 * Builder/project dependencies); the function bodies under test are sliced
 * verbatim from the real migrations, same convention as
 * tests/creative-core/experience-db-setup.ts.
 *
 * Hosted Postgres/Supabase acceptance remains open — this verifies the SQL
 * logic locally, not production/QA behavior.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

function slice(filePath: string, startMarker: string, endMarker: string): string {
  const text = readFileSync(resolve(filePath), "utf8");
  const start = text.indexOf(startMarker);
  if (start < 0) throw new Error(`Marker not found in ${filePath}: ${startMarker}`);
  const end = text.indexOf(endMarker, start);
  if (end < start) throw new Error(`End marker not found in ${filePath}: ${endMarker}`);
  return text.slice(start, end);
}

async function openDb(): Promise<Db> {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href);
  const db: Db = new PGlite({ extensions: { pgcrypto } });
  await db.exec("create extension if not exists pgcrypto;");
  await db.exec(`
    create table shop_orders(id uuid primary key default gen_random_uuid(), payment_status text not null default 'unpaid');
    create table shop_digital_downloads(
      id uuid primary key default gen_random_uuid(), order_id uuid not null, project_id uuid not null, product_id uuid not null,
      token text not null unique, file_path text not null, file_name text not null default 'download',
      expires_at timestamptz not null, download_count integer not null default 0, max_downloads integer not null default 5,
      created_at timestamptz not null default now()
    );
    create unique index shop_digital_downloads_order_product_uidx on shop_digital_downloads(order_id, product_id);
  `);
  // Real function/table bodies, verbatim, from the actual applied-once migrations —
  // not reimplemented, so a bug in the real SQL would actually surface here.
  await db.exec(slice("supabase/migrations_archive/legacy/101_security_remediation_atomic_commerce.sql",
    "create or replace function public.consume_digital_download",
    "revoke all on function public.consume_digital_download(text) from public, anon, authenticated;"));
  await db.exec(slice("supabase/migrations/20260920040000_platform_durability.sql",
    "create table if not exists public.platform_jobs",
    "create table if not exists public.user_notifications"));
  // 050000 is the lease-recovery-hardened replacement of claim_platform_jobs from 040000.
  await db.exec(slice("supabase/migrations/20260920050000_platform_worker_recovery.sql",
    "create or replace function public.claim_platform_jobs",
    "revoke all on function public.claim_platform_jobs"));
  return db;
}

describe.skipIf(!root)("consume_digital_download — real RPC, payment-state gating at redemption time", () => {
  it("serves the file when the order is paid, not expired, and under the download limit", async () => {
    const db = await openDb();
    const [{ id: orderId }] = (await db.query<{ id: string }>("insert into shop_orders(payment_status) values('paid') returning id")).rows;
    await db.query("insert into shop_digital_downloads(order_id,project_id,product_id,token,file_path,expires_at,max_downloads) values($1,gen_random_uuid(),gen_random_uuid(),$2,'files/a.pdf',now()+interval '1 day',3)", [orderId, "a".repeat(64)]);
    const result = await db.query("select * from consume_digital_download($1)", ["a".repeat(64)]);
    expect(result.rows).toHaveLength(1);
    const [{ download_count }] = (await db.query<{ download_count: number }>("select download_count from shop_digital_downloads where token=$1", ["a".repeat(64)])).rows;
    expect(download_count).toBe(1);
    await db.close();
  }, 30_000);

  it("refuses a refunded order's download — payment_status flips to 'refunded' after the link was already issued", async () => {
    const db = await openDb();
    const [{ id: orderId }] = (await db.query<{ id: string }>("insert into shop_orders(payment_status) values('paid') returning id")).rows;
    await db.query("insert into shop_digital_downloads(order_id,project_id,product_id,token,file_path,expires_at,max_downloads) values($1,gen_random_uuid(),gen_random_uuid(),$2,'files/a.pdf',now()+interval '1 day',3)", [orderId, "b".repeat(64)]);
    // Refund revokes payment_status, as the real admin refund route does.
    await db.query("update shop_orders set payment_status='refunded' where id=$1", [orderId]);
    const result = await db.query("select * from consume_digital_download($1)", ["b".repeat(64)]);
    expect(result.rows).toHaveLength(0);
    const [{ download_count }] = (await db.query<{ download_count: number }>("select download_count from shop_digital_downloads where token=$1", ["b".repeat(64)])).rows;
    expect(download_count).toBe(0);
    await db.close();
  }, 30_000);

  it("refuses an unpaid order's download (never reached 'paid')", async () => {
    const db = await openDb();
    const [{ id: orderId }] = (await db.query<{ id: string }>("insert into shop_orders(payment_status) values('unpaid') returning id")).rows;
    await db.query("insert into shop_digital_downloads(order_id,project_id,product_id,token,file_path,expires_at,max_downloads) values($1,gen_random_uuid(),gen_random_uuid(),$2,'files/a.pdf',now()+interval '1 day',3)", [orderId, "c".repeat(64)]);
    const result = await db.query("select * from consume_digital_download($1)", ["c".repeat(64)]);
    expect(result.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("enforces max_downloads atomically — the increment and the limit check are one statement", async () => {
    const db = await openDb();
    const [{ id: orderId }] = (await db.query<{ id: string }>("insert into shop_orders(payment_status) values('paid') returning id")).rows;
    await db.query("insert into shop_digital_downloads(order_id,project_id,product_id,token,file_path,expires_at,max_downloads) values($1,gen_random_uuid(),gen_random_uuid(),$2,'files/a.pdf',now()+interval '1 day',2)", [orderId, "d".repeat(64)]);
    await db.query("select * from consume_digital_download($1)", ["d".repeat(64)]);
    await db.query("select * from consume_digital_download($1)", ["d".repeat(64)]);
    const third = await db.query("select * from consume_digital_download($1)", ["d".repeat(64)]);
    expect(third.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("refuses an expired download", async () => {
    const db = await openDb();
    const [{ id: orderId }] = (await db.query<{ id: string }>("insert into shop_orders(payment_status) values('paid') returning id")).rows;
    await db.query("insert into shop_digital_downloads(order_id,project_id,product_id,token,file_path,expires_at,max_downloads) values($1,gen_random_uuid(),gen_random_uuid(),$2,'files/a.pdf',now()-interval '1 hour',5)", [orderId, "e".repeat(64)]);
    const result = await db.query("select * from consume_digital_download($1)", ["e".repeat(64)]);
    expect(result.rows).toHaveLength(0);
    await db.close();
  }, 30_000);
});

describe.skipIf(!root)("platform_jobs — real RPCs, worker-crash recovery and idempotency", () => {
  it("does not reclaim a job still inside its lease (status running, locked recently)", async () => {
    const db = await openDb();
    await db.query("insert into platform_jobs(job_type,status,locked_at,locked_by,attempts) values('digital.fulfill','running',now(),'worker-a',1)");
    const claimed = await db.query("select * from claim_platform_jobs('worker-b',10)");
    expect(claimed.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("reclaims a job whose worker lease expired (locked more than 10 minutes ago) instead of losing it forever", async () => {
    const db = await openDb();
    await db.query("insert into platform_jobs(job_type,status,locked_at,locked_by,attempts,max_attempts) values('digital.fulfill','running',now()-interval '20 minutes','dead-worker',1,5)");
    const claimed = await db.query<{ job_type: string; status: string; attempts: number }>("select job_type,status,attempts from claim_platform_jobs('worker-b',10)");
    expect(claimed.rows).toHaveLength(1);
    expect(claimed.rows[0]).toMatchObject({ job_type: "digital.fulfill", status: "running", attempts: 2 });
    await db.close();
  }, 30_000);

  it("dead-letters a lease-expired job that already exhausted its attempts, rather than retrying forever", async () => {
    const db = await openDb();
    await db.query("insert into platform_jobs(job_type,status,locked_at,locked_by,attempts,max_attempts) values('digital.fulfill','running',now()-interval '20 minutes','dead-worker',5,5)");
    const claimed = await db.query("select * from claim_platform_jobs('worker-b',10)");
    expect(claimed.rows).toHaveLength(0);
    const [{ status }] = (await db.query<{ status: string }>("select status from platform_jobs")).rows;
    expect(status).toBe("dead");
    await db.close();
  }, 30_000);

  it("never claims the same queued job twice, even across sequential claim calls (FOR UPDATE SKIP LOCKED + status transition)", async () => {
    const db = await openDb();
    await db.query("insert into platform_jobs(job_type) values('digital.fulfill')");
    const first = await db.query("select * from claim_platform_jobs('worker-a',10)");
    expect(first.rows).toHaveLength(1);
    const second = await db.query("select * from claim_platform_jobs('worker-b',10)");
    expect(second.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("enqueuePlatformJob's idempotency key — a duplicate insert for the same order never creates a second row", async () => {
    const db = await openDb();
    const insertOne = () => db.query(
      "insert into platform_jobs(job_type,payload,idempotency_key) values('digital.fulfill','{\"orderId\":\"order-1\"}','digital.fulfill:order-1') on conflict(idempotency_key) do nothing returning id",
    );
    await insertOne();
    await insertOne();
    const count = await db.query<{ n: string }>("select count(*)::text as n from platform_jobs where idempotency_key='digital.fulfill:order-1'");
    expect(count.rows[0].n).toBe("1");
    await db.close();
  }, 30_000);
});
