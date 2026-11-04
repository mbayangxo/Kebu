/**
 * Real-SQL verification of shop_shipping_options RLS
 * (20261103135000_shop_shipping_options.sql), applied verbatim against
 * PGlite — not a reimplementation, so a bug in the real policy text would
 * actually surface here. Same convention as
 * tests/business/business-members-select-policy.local.test.ts.
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
  -- Minimal stand-in: shop_orders doesn't exist in this fixture, only the
  -- column the real migration's trailing ALTER TABLE needs to attach to.
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
  const migration = readFileSync(resolve("supabase/migrations/20261103135000_shop_shipping_options.sql"), "utf8");
  await db.exec(migration);
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

describe.skipIf(!root)("shop_shipping_options RLS (local fixture)", () => {
  it("lets the owner create and read their own project's shipping options", async () => {
    const db = await openDb();
    const [{ id: projectId }] = (
      await asService<{ id: string }>(db, "insert into public.projects(owner_id) values ($1) returning id", [ownerA])
    ).rows;
    await asUser(
      db,
      ownerA,
      "insert into public.shop_shipping_options(project_id, label, amount_xof) values ($1, 'Pickup', 0)",
      [projectId],
    );
    const result = await asUser<{ label: string }>(
      db,
      ownerA,
      "select label from public.shop_shipping_options where project_id=$1",
      [projectId],
    );
    expect(result.rows.map((r) => r.label)).toEqual(["Pickup"]);
    await db.close();
  }, 30_000);

  it("hides one seller's options from another seller — select returns nothing, no error", async () => {
    const db = await openDb();
    const [{ id: projectId }] = (
      await asService<{ id: string }>(db, "insert into public.projects(owner_id) values ($1) returning id", [ownerA])
    ).rows;
    await asService(db, "insert into public.shop_shipping_options(project_id, label, amount_xof) values ($1, 'Pickup', 0)", [projectId]);

    const asB = await asUser<{ label: string }>(db, ownerB, "select label from public.shop_shipping_options where project_id=$1", [projectId]);
    expect(asB.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("rejects a stranger inserting a shipping option into another seller's project", async () => {
    const db = await openDb();
    const [{ id: projectId }] = (
      await asService<{ id: string }>(db, "insert into public.projects(owner_id) values ($1) returning id", [ownerA])
    ).rows;
    await expect(
      asUser(db, stranger, "insert into public.shop_shipping_options(project_id, label, amount_xof) values ($1, 'Hack', 1) returning id", [projectId]),
    ).rejects.toThrow(/row-level security/i);
    await db.close();
  }, 30_000);

  it("rejects a non-owner updating or deleting another seller's option (no rows match, policy blocks the target)", async () => {
    const db = await openDb();
    const [{ id: projectId }] = (
      await asService<{ id: string }>(db, "insert into public.projects(owner_id) values ($1) returning id", [ownerA])
    ).rows;
    const [{ id: optionId }] = (
      await asService<{ id: string }>(db, "insert into public.shop_shipping_options(project_id, label, amount_xof) values ($1, 'Pickup', 0) returning id", [projectId])
    ).rows;

    const updated = await asUser<{ id: string }>(
      db,
      ownerB,
      "update public.shop_shipping_options set amount_xof=999999 where id=$1 returning id",
      [optionId],
    );
    expect(updated.rows).toHaveLength(0);

    const stillThere = await asService<{ amount_xof: number }>(db, "select amount_xof from public.shop_shipping_options where id=$1", [optionId]);
    expect(stillThere.rows[0]?.amount_xof).toBe(0);
    await db.close();
  }, 30_000);

  it("the service role (used by the public checkout path) can always read, bypassing RLS", async () => {
    const db = await openDb();
    const [{ id: projectId }] = (
      await asService<{ id: string }>(db, "insert into public.projects(owner_id) values ($1) returning id", [ownerA])
    ).rows;
    await asService(db, "insert into public.shop_shipping_options(project_id, label, amount_xof, active) values ($1, 'Pickup', 0, true)", [projectId]);
    const result = await asService<{ label: string }>(db, "select label from public.shop_shipping_options where project_id=$1 and active=true", [projectId]);
    expect(result.rows).toHaveLength(1);
    await db.close();
  }, 30_000);
});
