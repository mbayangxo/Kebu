/**
 * Disposable PostgreSQL database for the 3C S4 suites (QA cluster only).
 *
 * Built from the REAL migrations in order — 3B core, deployments, section types, device layouts,
 * builder RPCs, the anon revoke — under Supabase's default privileges (new public functions are
 * granted to anon/authenticated/service_role explicitly, as on Supabase), optionally seeded with
 * 3B data BEFORE the KCD migration so the backfill is exercised, then the KCD migration.
 * Roles are simulated as in the 3B suites: `request.jwt.claim.sub` + SET LOCAL ROLE.
 */
import { readFileSync } from "fs";
import { join } from "path";
// @ts-expect-error — @types/pg is not in devDependencies; pg itself is present
import { Pool, type PoolClient } from "pg";
import { teardownDisposableDatabase } from "../../create/qa-harness/disposable-db.js";

export const ADMIN_URL = process.env.DATABASE_URL;
export const SKIP_DB = !ADMIN_URL;
const QA_REF = "skqnxyaeimvbyrmdfzvk";
const PROD_REF = "tnygqgcqlnlsmjpygrca";

const MIGRATIONS = join(__dirname, "../../../supabase/migrations");
export const migration = (file: string) => readFileSync(join(/^\d{3}_/.test(file) ? join(__dirname, "../../../supabase/migrations_archive/legacy") : MIGRATIONS, file), "utf8");
export const KCD_MIGRATION = "20260930010000_kcd_document_storage.sql";

/** Refuses anything but the QA cluster (the admin URL carries the project ref in its user name). */
export function assertQaDatabase(url: string | undefined): void {
  if (!url || url.includes(PROD_REF) || !url.includes(`postgres.${QA_REF}`)) {
    throw new Error("KCD DB suites refuse to run: DATABASE_URL is not the QA database");
  }
}

/** A result row (pg rows are untyped here; @types/pg is not installed). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export type Db = { pool: Pool; adminPool: Pool; name: string; url: string };

const BASE = [
  "004_create_projects.sql",
  "008_website_builder.sql",
  "011_maylecor_section_types.sql",
  "096_add_stats_section_type.sql",
  "20260924040000_page_device_layouts.sql",
  "20260924010000_builder_atomic_rpcs.sql",
  "20260925012420_revoke_anon_builder_rpcs.sql",
];

export async function createKcdDb(opts: { seed?: (c: PoolClient) => Promise<void>; kcd?: boolean } = {}): Promise<Db> {
  assertQaDatabase(ADMIN_URL);
  const name = `_kebtest_kcd_${Math.random().toString(36).slice(2, 10)}`;
  const adminPool = new Pool({ connectionString: ADMIN_URL!, max: 2 });
  await adminPool.query(`CREATE DATABASE "${name}"`);
  const url = ADMIN_URL!.replace(/\/[^/?]+(\?.*)?$/, `/${name}$1`);
  const setup = new Pool({ connectionString: url, max: 1 });
  const c = await setup.connect();
  try {
    await c.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await c.query(`CREATE SCHEMA IF NOT EXISTS auth`);
    await c.query(`CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, created_at timestamptz DEFAULT now())`);
    await c.query(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$`);
    await c.query(`CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon') $$`);
    await c.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
      END $$`);
    // Supabase default privileges: new public tables/functions are granted to the API roles.
    await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role`);
    await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role`);
    await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role`);
    await c.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role`);
    await c.query(`GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role`);
    await c.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role`);
    for (const file of BASE) {
      // 008 references public.businesses (created by 005 in the full history); a key-only stub suffices here.
      if (file.startsWith("008_")) await c.query(`CREATE TABLE IF NOT EXISTS public.businesses (id uuid PRIMARY KEY DEFAULT gen_random_uuid())`);
      await c.query(migration(file));
    }
    if (opts.seed) await opts.seed(c);
    if (opts.kcd !== false) await c.query(migration(KCD_MIGRATION));
  } finally {
    c.release();
    await setup.end();
  }
  return { pool: new Pool({ connectionString: url, max: 12 }), adminPool, name, url };
}

export async function dropKcdDb(db: Db | undefined): Promise<void> {
  if (!db) return;
  await teardownDisposableDatabase({ pools: [db.pool], adminPool: db.adminPool, name: db.name });
}

/** Run `fn` in one transaction as an authenticated user (owner / stranger). */
export async function asUser<T>(pool: Pool, userId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SET LOCAL ROLE authenticated");
    await c.query(`SELECT set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', 'authenticated', true)`, [userId]);
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

/** Run `fn` in one transaction as the service role (auth.uid() IS NULL). */
export async function asService<T>(pool: Pool, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SET LOCAL ROLE service_role");
    await c.query(`SELECT set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claim.role', 'service_role', true)`);
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

/** Run as anon. */
export async function asAnon<T>(pool: Pool, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SET LOCAL ROLE anon");
    await c.query(`SELECT set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claim.role', 'anon', true)`);
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

export type { Pool, PoolClient };
