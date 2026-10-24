/**
 * Disposable, fully local PostgreSQL database for real migrated-SQL Search
 * tests — not the hosted Supabase QA cluster (unreachable from this sandbox;
 * see tests/creative-core/db/kcd-db.ts) and not production.
 *
 * Builds a real `businesses` table (the authentic columns/constraints from
 * supabase/migrations_archive/legacy/005_kebu_id_draft_business.sql, minus
 * the parts irrelevant to Search), then applies the real, unmodified Search
 * migration files from supabase/migrations/ in order. Tests then exercise
 * public.search_businesses() and the lifecycle_status constraint against a
 * genuine PostgreSQL engine — ts_rank, live JOIN semantics and CHECK
 * constraints are not something a JS mock can prove.
 */
import { readFileSync } from "fs";
import { join } from "path";
// @ts-expect-error — @types/pg is not in devDependencies; pg itself is present
import { Pool, type PoolClient } from "pg";

export const LOCAL_URL = process.env.LOCAL_PG_TEST_URL ?? "postgres://postgres:localtest@127.0.0.1:5432/postgres";

const MIGRATIONS = join(__dirname, "../../../supabase/migrations");
const migration = (file: string) => readFileSync(join(MIGRATIONS, file), "utf8");

export type Db = { pool: Pool; adminPool: Pool; name: string };

/** True once confirmed reachable; checked lazily so non-DB test files are unaffected. */
let reachable: boolean | null = null;
export async function isLocalPgReachable(): Promise<boolean> {
  if (reachable !== null) return reachable;
  const probe = new Pool({ connectionString: LOCAL_URL, max: 1, connectionTimeoutMillis: 1500 });
  try {
    await probe.query("select 1");
    reachable = true;
  } catch {
    reachable = false;
  } finally {
    await probe.end().catch(() => {});
  }
  return reachable;
}

export async function createSearchTestDb(): Promise<Db> {
  const name = `_kebu_search_test_${Math.random().toString(36).slice(2, 10)}`;
  const adminPool = new Pool({ connectionString: LOCAL_URL, max: 2 });
  await adminPool.query(`CREATE DATABASE "${name}"`);
  const url = LOCAL_URL.replace(/\/[^/?]+(\?.*)?$/, `/${name}$1`);
  const pool = new Pool({ connectionString: url, max: 4 });
  const c: PoolClient = await pool.connect();
  try {
    await c.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await c.query(`CREATE SCHEMA IF NOT EXISTS auth`);
    await c.query(`CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid())`);

    // Real roles, since search_businesses's grants target them.
    await c.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
      END $$`);
    await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role`);
    await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role`);
    await c.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role`);

    // The real businesses table shape — same columns/constraints as production,
    // trimmed only of fields Search never reads (archived_at, business_members FK target).
    await c.query(`
      CREATE TABLE public.businesses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        public_kebu_id text NOT NULL UNIQUE
          CHECK (public_kebu_id ~ '^KEBU-[A-Z]{2}-[0-9]{2}-[A-Z0-9]{6}$'),
        legal_name text NOT NULL CHECK (char_length(trim(legal_name)) BETWEEN 1 AND 160),
        trading_name text CHECK (trading_name IS NULL OR char_length(trim(trading_name)) BETWEEN 1 AND 160),
        country_code text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
        region text,
        category text NOT NULL CHECK (char_length(trim(category)) BETWEEN 1 AND 80),
        description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 1 AND 1000),
        website text,
        lifecycle_status text NOT NULL DEFAULT 'draft'
          CHECK (lifecycle_status IN ('draft', 'active', 'suspended', 'archived')),
        verification_level integer NOT NULL DEFAULT 1
          CHECK (verification_level BETWEEN 1 AND 4),
        created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await c.query(migration("20260920087000_search_index_phase_one.sql"));
    await c.query(migration("20261023010000_search_index_businesses_mode.sql"));
    await c.query(migration("20261023020000_search_businesses_rpc.sql"));
    await c.query(migration("20261024010000_search_businesses_pagination.sql"));
  } finally {
    c.release();
  }
  return { pool, adminPool, name };
}

export async function dropSearchTestDb(db: Db): Promise<void> {
  // db.pool.end() already waits for every client it owns to close cleanly.
  // DROP DATABASE ... WITH (FORCE) additionally asks Postgres to kill any
  // *remaining* connection — but killing one mid-close races the client
  // socket's own 'error' event against the pool already having torn down
  // its listeners, surfacing as an unhandled error in the test runner even
  // though every assertion passed. Not needed here since pool.end() already
  // did the graceful close; a plain DROP is enough and doesn't race.
  await db.pool.end();
  await db.adminPool.query(`DROP DATABASE IF EXISTS "${db.name}"`);
  await db.adminPool.end();
}
