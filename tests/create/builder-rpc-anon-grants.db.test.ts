/**
 * Builder RPC privileges under Supabase's default grants [PostgreSQL integration].
 *
 * Supabase projects run `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO
 * anon, authenticated, service_role`, so every new public function is EXECUTE-able by anon
 * through an explicit grant. 20260924010000_builder_atomic_rpcs.sql revokes only from PUBLIC,
 * which cannot remove that grant — and both RPCs admit callers without auth.uid().
 * 20260925012420_revoke_anon_builder_rpcs.sql closes it.
 *
 * Runs the real migration files in a disposable database that reproduces the Supabase default
 * privileges. Requires DATABASE_URL (skipped otherwise, like the other *.db.test.ts suites).
 */
import { readFileSync } from "fs";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error — @types/pg is not in devDependencies; pg itself is present
import { Pool } from "pg";
import { teardownDisposableDatabase } from "./qa-harness/disposable-db.js";

const ADMIN_URL = process.env.DATABASE_URL;
const SKIP = !ADMIN_URL;
const DB_NAME = `_kebtest_authz_${Math.random().toString(36).slice(2, 10)}`;
const MIGRATIONS = join(__dirname, "../../supabase/migrations");
const LEGACY_MIGRATIONS = join(__dirname, "../../supabase/migrations_archive/legacy");
const migration = (file: string) => readFileSync(join(MIGRATIONS, file), "utf8");
// 004_create_projects.sql was moved into migrations_archive/legacy/ (the canonical
// migration chain only keeps timestamp-named files); this suite still needs its
// real projects/project_sections DDL, so it reads from the archive by name.
const legacyMigration = (file: string) => readFileSync(join(LEGACY_MIGRATIONS, file), "utf8");
const RPCS = ["batch_update_section_props(uuid, jsonb)", "reorder_sections(uuid, uuid[])"];

function disposableDbUrl(adminUrl: string): string {
  return adminUrl.replace(/\/[^/?]+(\?.*)?$/, `/${DB_NAME}$1`);
}

describe.skipIf(SKIP)("builder RPC grants under Supabase default privileges [PostgreSQL integration]", () => {
  let adminPool: Pool;
  let pool: Pool;

  async function executeGrants(): Promise<Record<string, Record<string, boolean>>> {
    const out: Record<string, Record<string, boolean>> = {};
    for (const fn of RPCS) {
      const { rows } = await pool.query(
        `SELECT has_function_privilege('anon', $1::regprocedure, 'EXECUTE') AS anon,
                has_function_privilege('authenticated', $1::regprocedure, 'EXECUTE') AS authenticated,
                has_function_privilege('service_role', $1::regprocedure, 'EXECUTE') AS service_role`,
        [`public.${fn}`],
      );
      out[fn] = rows[0];
    }
    return out;
  }

  beforeAll(async () => {
    adminPool = new Pool({ connectionString: ADMIN_URL!, max: 2 });
    const admin = await adminPool.connect();
    try {
      await admin.query(`CREATE DATABASE "${DB_NAME}"`);
    } finally {
      admin.release();
    }
    pool = new Pool({ connectionString: disposableDbUrl(ADMIN_URL!), max: 2 });
    const c = await pool.connect();
    try {
      await c.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
      await c.query(`CREATE SCHEMA IF NOT EXISTS auth`);
      await c.query(`CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, created_at timestamptz DEFAULT now())`);
      await c.query(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$`);
      await c.query(`CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon') $$`);
      await c.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
        END $$`);
      // Supabase's default privileges for the public schema (as observed in the QA project).
      await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role`);
      await c.query(legacyMigration("004_create_projects.sql"));
      await c.query(migration("20260924010000_builder_atomic_rpcs.sql"));
    } finally {
      c.release();
    }
  }, 60_000);

  afterAll(async () => {
    await teardownDisposableDatabase({ pools: [pool], adminPool, name: DB_NAME });
  }, 45_000);

  it("the atomic-RPC migration alone leaves anon EXECUTE under Supabase default privileges", async () => {
    for (const [fn, grants] of Object.entries(await executeGrants())) {
      expect(grants, fn).toEqual({ anon: true, authenticated: true, service_role: true });
    }
  });

  it("20260925012420_revoke_anon_builder_rpcs removes anon EXECUTE and keeps authenticated/service_role", async () => {
    await pool.query(migration("20260925012420_revoke_anon_builder_rpcs.sql"));
    for (const [fn, grants] of Object.entries(await executeGrants())) {
      expect(grants, fn).toEqual({ anon: false, authenticated: true, service_role: true });
    }
  });

  it("is idempotent", async () => {
    await pool.query(migration("20260925012420_revoke_anon_builder_rpcs.sql"));
    for (const [fn, grants] of Object.entries(await executeGrants())) {
      expect(grants.anon, fn).toBe(false);
    }
  });
});
