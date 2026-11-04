/**
 * Real-Postgres proof that security_events is genuinely locked down: RLS is
 * enabled with zero policies, so anon/authenticated get zero rows even though
 * they hold the same schema-level table grants Supabase gives every role by
 * default; only service_role (BYPASSRLS) can read or write it. Skips cleanly
 * when no local Postgres is reachable (see tests/search/db/local-pg.ts's own
 * note on this sandbox limitation).
 */
import { readFileSync } from "fs";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error — @types/pg is not in devDependencies; pg itself is present
import { Pool } from "pg";
import { isLocalPgReachable, LOCAL_URL } from "../search/db/local-pg";

const MIGRATION_SQL = readFileSync(
  join(__dirname, "../../supabase/migrations/20261103130000_security_events_log.sql"),
  "utf8",
);

describe("security_events RLS (real Postgres)", () => {
  let reachable = false;
  let dbName = "";
  let adminPool: Pool;
  let pool: Pool;

  beforeAll(async () => {
    reachable = await isLocalPgReachable();
    if (!reachable) return;
    dbName = `_kebu_sec_events_test_${Math.random().toString(36).slice(2, 10)}`;
    adminPool = new Pool({ connectionString: LOCAL_URL, max: 2 });
    await adminPool.query(`CREATE DATABASE "${dbName}"`);
    const url = LOCAL_URL.replace(/\/[^/?]+(\?.*)?$/, `/${dbName}$1`);
    pool = new Pool({ connectionString: url, max: 4 });
    const c = await pool.connect();
    try {
      await c.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
      await c.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
        END $$`);
      // Same schema-level default grant Supabase applies to every project —
      // the real protection here must come from RLS, not from withholding grants.
      await c.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role`);
      await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role`);
      await c.query(MIGRATION_SQL);
      await c.query(`GRANT ALL ON public.security_events TO anon, authenticated, service_role`);
    } finally {
      c.release();
    }
  });

  afterAll(async () => {
    if (!reachable) return;
    await pool.end();
    await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await adminPool.end();
  });

  it("service_role can insert and read (BYPASSRLS)", async () => {
    if (!reachable) return;
    const c = await pool.connect();
    try {
      await c.query(`SET ROLE service_role`);
      await c.query(
        `INSERT INTO public.security_events (event_type, source) VALUES ('csrf_rejected', '/api/me/profile')`,
      );
      const res = await c.query(`SELECT count(*)::int AS n FROM public.security_events`);
      expect(res.rows[0].n).toBe(1);
    } finally {
      await c.query(`RESET ROLE`);
      c.release();
    }
  });

  it("anon sees zero rows despite table grants (RLS has no anon policy)", async () => {
    if (!reachable) return;
    const c = await pool.connect();
    try {
      await c.query(`SET ROLE anon`);
      const res = await c.query(`SELECT count(*)::int AS n FROM public.security_events`);
      expect(res.rows[0].n).toBe(0);
    } finally {
      await c.query(`RESET ROLE`);
      c.release();
    }
  });

  it("authenticated sees zero rows and cannot insert (RLS has no authenticated policy)", async () => {
    if (!reachable) return;
    const c = await pool.connect();
    try {
      await c.query(`SET ROLE authenticated`);
      const res = await c.query(`SELECT count(*)::int AS n FROM public.security_events`);
      expect(res.rows[0].n).toBe(0);
      await expect(
        c.query(`INSERT INTO public.security_events (event_type, source) VALUES ('admin_login_failed', 'x')`),
      ).rejects.toThrow();
    } finally {
      await c.query(`RESET ROLE`);
      c.release();
    }
  });
});
