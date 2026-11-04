/**
 * Real-SQL verification of shop_fulfillment_orders RLS
 * (20261104020000_shop_joko_fulfillment.sql), applied verbatim against
 * PGlite — not a reimplementation. Same convention as
 * tests/shop/shipping-options.local-pg.test.ts.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = {
  exec: (sql: string) => Promise<unknown>;
  query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
  close: () => Promise<void>;
};

const ownerA = "11111111-1111-4111-8111-111111111111";
const ownerB = "22222222-2222-4222-8222-222222222222";
const stranger = "33333333-3333-4333-8333-333333333333";

const SCHEMA_FIXTURE = `
  create extension if not exists pgcrypto;
  create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  do $$begin
    if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
    if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
    if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
  end$$;
  alter default privileges in schema public grant all on tables to authenticated, anon, service_role;
  grant usage on schema public, auth to authenticated, anon, service_role;
  grant execute on all functions in schema auth to authenticated, anon, service_role;

  create table public.projects (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id)
  );
  create table public.shop_orders (
    id uuid primary key default gen_random_uuid()
  );
`;

async function openDb(): Promise<Db> {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href);
  const db: Db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SCHEMA_FIXTURE);
  await db.exec(`insert into auth.users(id) values ('${ownerA}'), ('${ownerB}'), ('${stranger}');`);
  const shippingMigration = readFileSync(resolve("supabase/migrations/20261103130000_shop_shipping_options.sql"), "utf8");
  await db.exec(shippingMigration);
  const fulfillmentMigration = readFileSync(resolve("supabase/migrations/20261104020000_shop_joko_fulfillment.sql"), "utf8");
  await db.exec(fulfillmentMigration);
  return db;
}

async function asUser<T = Record<string, unknown>>(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query<T>(sql, params);
}

async function asService<T = Record<string, unknown>>(db: Db, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set role service_role;`);
  return db.query<T>(sql, params);
}

async function seedOrderForOwner(db: Db, ownerId: string) {
  const [{ id: projectId }] = (
    await asService<{ id: string }>(db, "insert into public.projects(owner_id) values ($1) returning id", [ownerId])
  ).rows;
  const [{ id: orderId }] = (
    await asService<{ id: string }>(db, "insert into public.shop_orders default values returning id")
  ).rows;
  return { projectId, orderId };
}

describe.skipIf(!root)("shop_fulfillment_orders RLS (local fixture)", () => {
  it("lets the owner read their own project's fulfillment orders", async () => {
    const db = await openDb();
    const { projectId, orderId } = await seedOrderForOwner(db, ownerA);
    await asService(
      db,
      "insert into public.shop_fulfillment_orders(order_id, project_id, commission_xof) values ($1, $2, 1500)",
      [orderId, projectId],
    );
    const result = await asUser<{ commission_xof: number }>(
      db,
      ownerA,
      "select commission_xof from public.shop_fulfillment_orders where project_id=$1",
      [projectId],
    );
    expect(result.rows.map((r) => r.commission_xof)).toEqual([1500]);
    await db.close();
  }, 30_000);

  it("hides one seller's fulfillment orders from another seller", async () => {
    const db = await openDb();
    const { projectId, orderId } = await seedOrderForOwner(db, ownerA);
    await asService(
      db,
      "insert into public.shop_fulfillment_orders(order_id, project_id, commission_xof) values ($1, $2, 1500)",
      [orderId, projectId],
    );
    const asB = await asUser<{ id: string }>(db, ownerB, "select id from public.shop_fulfillment_orders where project_id=$1", [projectId]);
    expect(asB.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("blocks a seller from inserting their own fulfillment-order row — only service_role can create one", async () => {
    const db = await openDb();
    const { projectId, orderId } = await seedOrderForOwner(db, ownerA);
    await expect(
      asUser(
        db,
        ownerA,
        "insert into public.shop_fulfillment_orders(order_id, project_id, commission_xof) values ($1, $2, 1) returning id",
        [orderId, projectId],
      ),
    ).rejects.toThrow(/permission denied|row-level security/i);
    await db.close();
  }, 30_000);

  it("blocks a seller from updating their own fulfillment status — a seller can never self-report delivery", async () => {
    const db = await openDb();
    const { projectId, orderId } = await seedOrderForOwner(db, ownerA);
    const [{ id: rowId }] = (
      await asService<{ id: string }>(
        db,
        "insert into public.shop_fulfillment_orders(order_id, project_id, commission_xof) values ($1, $2, 1500) returning id",
        [orderId, projectId],
      )
    ).rows;
    await expect(
      asUser(db, ownerA, "update public.shop_fulfillment_orders set status='delivered' where id=$1 returning id", [rowId]),
    ).rejects.toThrow(/permission denied|row-level security/i);
    const stillAwaiting = await asService<{ status: string }>(db, "select status from public.shop_fulfillment_orders where id=$1", [rowId]);
    expect(stillAwaiting.rows[0]?.status).toBe("awaiting_pickup");
    await db.close();
  }, 30_000);

  it("rejects a stranger reading fulfillment orders for a project they don't own", async () => {
    const db = await openDb();
    const { projectId, orderId } = await seedOrderForOwner(db, ownerA);
    await asService(
      db,
      "insert into public.shop_fulfillment_orders(order_id, project_id, commission_xof) values ($1, $2, 1500)",
      [orderId, projectId],
    );
    const asStranger = await asUser<{ id: string }>(db, stranger, "select id from public.shop_fulfillment_orders where project_id=$1", [projectId]);
    expect(asStranger.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("shop_fulfillment_commission_total sums only non-cancelled commissions for the project", async () => {
    const db = await openDb();
    const { projectId, orderId } = await seedOrderForOwner(db, ownerA);
    const { orderId: orderId2 } = await seedOrderForOwner(db, ownerA);
    await asService(db, "insert into public.shop_fulfillment_orders(order_id, project_id, commission_xof, status) values ($1, $2, 1000, 'delivered')", [orderId, projectId]);
    await asService(db, "insert into public.shop_fulfillment_orders(order_id, project_id, commission_xof, status) values ($1, $2, 2000, 'cancelled')", [orderId2, projectId]);
    const result = await asService<{ total: string }>(db, "select public.shop_fulfillment_commission_total($1) as total", [projectId]);
    expect(Number(result.rows[0]?.total)).toBe(1000);
    await db.close();
  }, 30_000);
});
