/**
 * Behavioral proof for migration 048_shop_customer_accounts.sql's RLS —
 * Part 1 (customer accounts on a published storefront). The existing
 * tests/shop/customer-account.test.ts only asserts that the migration's
 * SQL text contains certain strings; it never proves the policy actually
 * isolates one shopper's orders from another's. This test applies the
 * real, unmodified migration file against a disposable local PostgreSQL
 * database (same approach as tests/search/db/local-pg.ts — this sandbox
 * has no hosted Supabase/PostgREST to test against) and drives it through
 * real role/JWT-claim switching, proving: a customer sees only their own
 * orders and order items; a different customer sees none of them; the
 * store owner can read a customer's display profile but a stranger
 * cannot; and a customer cannot read or forge another customer's profile.
 */
// @ts-expect-error — @types/pg is not in devDependencies; pg itself is present (same as tests/search/db/local-pg.ts)
import { Pool, type PoolClient } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { LOCAL_URL, isLocalPgReachable } from "../search/db/local-pg";

const MIGRATION_048 = readFileSync(
  join(__dirname, "../../supabase/migrations_archive/legacy/048_shop_customer_accounts.sql"),
  "utf8",
);

const buyer1 = "11111111-1111-4111-8111-111111111111";
const buyer2 = "22222222-2222-4222-8222-222222222222";
const storeOwner = "33333333-3333-4333-8333-333333333333";
const stranger = "44444444-4444-4444-8444-444444444444";

type Db = { pool: Pool; adminPool: Pool; name: string };

async function createDb(): Promise<Db> {
  const name = `_kebu_customer_acct_test_${Math.random().toString(36).slice(2, 10)}`;
  const adminPool = new Pool({ connectionString: LOCAL_URL, max: 2 });
  await adminPool.query(`CREATE DATABASE "${name}"`);
  const url = LOCAL_URL.replace(/\/[^/?]+(\?.*)?$/, `/${name}$1`);
  const pool = new Pool({ connectionString: url, max: 4 });
  const c: PoolClient = await pool.connect();
  try {
    await c.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await c.query(`CREATE SCHEMA IF NOT EXISTS auth`);
    await c.query(`CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid())`);
    await c.query(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$
    `);
    await c.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
      END $$`);
    await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role`);
    await c.query(`GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role`);
    await c.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role`);
    await c.query(`
      CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$
    `);

    // Minimal real shape this migration's ALTERs/policies actually need —
    // trimmed to the columns referenced, same convention as local-pg.ts.
    await c.query(`
      CREATE TABLE public.projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
      )
    `);
    await c.query(`
      CREATE TABLE public.shop_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await c.query(`ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY`);
    await c.query(`
      CREATE TABLE public.shop_order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE
      )
    `);
    await c.query(`ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY`);
    await c.query(`
      CREATE TABLE public.shop_cart_drafts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE
      )
    `);
    await c.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_orders, public.shop_order_items, public.shop_cart_drafts TO authenticated, service_role`);

    // Apply the real, unmodified canonical migration.
    await c.query(MIGRATION_048);
  } finally {
    c.release();
  }
  return { pool, adminPool, name };
}

async function dropDb(db: Db): Promise<void> {
  await db.pool.end();
  await db.adminPool.query(`DROP DATABASE IF EXISTS "${db.name}" WITH (FORCE)`);
  await db.adminPool.end();
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  const c = await db.pool.connect();
  try {
    await c.query("RESET ROLE");
    await c.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
    await c.query("SET ROLE authenticated");
    return await c.query(sql, params);
  } finally {
    await c.query("RESET ROLE");
    c.release();
  }
}

async function asService(db: Db, sql: string, params: unknown[] = []) {
  const c = await db.pool.connect();
  try {
    await c.query("RESET ROLE");
    await c.query("SET ROLE service_role");
    return await c.query(sql, params);
  } finally {
    await c.query("RESET ROLE");
    c.release();
  }
}

const reachable = await isLocalPgReachable();

describe.skipIf(!reachable)("customer account RLS (migration 048, real Postgres)", () => {
  let db: Db;
  let projectId: string;
  let order1Id: string;
  let order2Id: string;

  beforeAll(async () => {
    db = await createDb();
    await db.pool.query("INSERT INTO auth.users(id) VALUES ($1), ($2), ($3), ($4)", [buyer1, buyer2, storeOwner, stranger]);
    const proj = await asService(db, "INSERT INTO public.projects(owner_id) VALUES ($1) RETURNING id", [storeOwner]);
    projectId = proj.rows[0].id;

    const o1 = await asService(db, "INSERT INTO public.shop_orders(project_id, customer_user_id) VALUES ($1, $2) RETURNING id", [projectId, buyer1]);
    order1Id = o1.rows[0].id;
    const o2 = await asService(db, "INSERT INTO public.shop_orders(project_id, customer_user_id) VALUES ($1, $2) RETURNING id", [projectId, buyer2]);
    order2Id = o2.rows[0].id;
    await asService(db, "INSERT INTO public.shop_order_items(order_id) VALUES ($1), ($2)", [order1Id, order2Id]);
  }, 30000);

  afterAll(async () => {
    await dropDb(db);
  });

  it("lets a customer read their own order", async () => {
    const result = await asUser(db, buyer1, "SELECT id FROM public.shop_orders WHERE id = $1", [order1Id]);
    expect(result.rows).toHaveLength(1);
  });

  it("hides another customer's order entirely — not an error, just zero rows", async () => {
    const result = await asUser(db, buyer2, "SELECT id FROM public.shop_orders WHERE id = $1", [order1Id]);
    expect(result.rows).toHaveLength(0);
  });

  it("isolates shop_order_items the same way, via the owning order's customer_user_id", async () => {
    const own = await asUser(db, buyer1, "SELECT id FROM public.shop_order_items WHERE order_id = $1", [order1Id]);
    expect(own.rows).toHaveLength(1);
    const others = await asUser(db, buyer2, "SELECT id FROM public.shop_order_items WHERE order_id = $1", [order1Id]);
    expect(others.rows).toHaveLength(0);
  });

  it("a stranger with no orders sees nothing at all", async () => {
    const result = await asUser(db, stranger, "SELECT id FROM public.shop_orders WHERE project_id = $1", [projectId]);
    expect(result.rows).toHaveLength(0);
  });

  it("lets a customer create and read their own display profile, and overwrite only their own row", async () => {
    await asUser(
      db,
      buyer1,
      "INSERT INTO public.shop_customer_profiles(user_id, project_id, display_name, phone) VALUES ($1, $2, 'Awa', '+221700000000')",
      [buyer1, projectId],
    );
    const own = await asUser(db, buyer1, "SELECT display_name FROM public.shop_customer_profiles WHERE project_id = $1", [projectId]);
    expect(own.rows).toEqual([{ display_name: "Awa" }]);

    // Buyer 2 cannot forge a profile under buyer 1's user_id.
    await expect(
      asUser(
        db,
        buyer2,
        "INSERT INTO public.shop_customer_profiles(user_id, project_id, display_name) VALUES ($1, $2, 'Forged')",
        [buyer1, projectId],
      ),
    ).rejects.toThrow();
  });

  it("lets the store owner read a customer's profile, but a stranger cannot", async () => {
    const ownerView = await asUser(db, storeOwner, "SELECT display_name FROM public.shop_customer_profiles WHERE project_id = $1", [projectId]);
    expect(ownerView.rows).toEqual([{ display_name: "Awa" }]);

    const strangerView = await asUser(db, stranger, "SELECT display_name FROM public.shop_customer_profiles WHERE project_id = $1", [projectId]);
    expect(strangerView.rows).toHaveLength(0);
  });

  it("a customer cannot read a different customer's profile directly", async () => {
    const result = await asUser(db, buyer2, "SELECT display_name FROM public.shop_customer_profiles WHERE user_id = $1", [buyer1]);
    expect(result.rows).toHaveLength(0);
  });
});
