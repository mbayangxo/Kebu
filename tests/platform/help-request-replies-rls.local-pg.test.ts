/**
 * Real-Postgres proof for help_request_replies RLS: a customer can read and
 * reply on their own help request, can never reply as 'team', can never
 * reply on someone else's request, and anon has no access at all. Skips
 * cleanly when no local Postgres is reachable (see
 * tests/search/db/local-pg.ts's own note on this sandbox limitation).
 */
import { readFileSync } from "fs";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error — @types/pg is not in devDependencies; pg itself is present
import { Pool } from "pg";
import { isLocalPgReachable, LOCAL_URL } from "../search/db/local-pg";

const HELP_REQUESTS_SQL = readFileSync(
  join(__dirname, "../../supabase/migrations/20261103140000_help_requests_cron_runs.sql"),
  "utf8",
);
const REPLIES_SQL = readFileSync(
  join(__dirname, "../../supabase/migrations/20261103150000_help_request_replies.sql"),
  "utf8",
);

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

describe("help_request_replies RLS (real Postgres)", () => {
  let reachable = false;
  let dbName = "";
  let adminPool: Pool;
  let pool: Pool;
  let requestAId = "";
  let requestBId = "";

  // set_config(..., true) is transaction-local ("SET LOCAL" semantics) — it
  // evaporates the instant the implicit per-statement transaction that set it
  // ends, before the next query even runs, unless an explicit transaction
  // spans both the role/GUC switch and the query that depends on them. Every
  // caller must BEGIN before this and COMMIT/ROLLBACK after — see each it()
  // block below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function asUser(client: any, userId: string) {
    await client.query(`BEGIN`);
    await client.query(`SET LOCAL ROLE authenticated`);
    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId]);
  }

  beforeAll(async () => {
    reachable = await isLocalPgReachable();
    if (!reachable) return;
    dbName = `_kebu_help_replies_test_${Math.random().toString(36).slice(2, 10)}`;
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
      await c.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role`);
      await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role`);

      // Minimal stand-in for Supabase's auth schema + auth.uid(), reading the
      // same request.jwt.claim.sub GUC Supabase's PostgREST sets per request.
      // auth.uid() is schema-qualified and SECURITY INVOKER (the default), so
      // calling it as `authenticated`/`anon` requires USAGE on this schema —
      // without it, any policy that calls auth.uid() fails with a permission
      // error, not a clean "no match", for every non-superuser role.
      await c.query(`CREATE SCHEMA IF NOT EXISTS auth`);
      await c.query(`GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role`);
      await c.query(`
        CREATE TABLE IF NOT EXISTS auth.users (
          id uuid primary key default gen_random_uuid()
        )
      `);
      await c.query(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
        LANGUAGE sql STABLE AS $$
          SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
        $$
      `);
      await c.query(`INSERT INTO auth.users (id) VALUES ($1), ($2)`, [USER_A, USER_B]);

      await c.query(HELP_REQUESTS_SQL);
      await c.query(REPLIES_SQL);
      await c.query(`GRANT ALL ON public.help_requests TO anon, authenticated, service_role`);
      await c.query(`GRANT ALL ON public.help_request_replies TO anon, authenticated, service_role`);

      const reqA = await c.query(
        `INSERT INTO public.help_requests (user_id, name, email, subject, body, source) VALUES ($1, 'A', 'a@example.com', 'Subject A', 'Body A text here', 'in_app') RETURNING id`,
        [USER_A],
      );
      requestAId = reqA.rows[0].id;
      const reqB = await c.query(
        `INSERT INTO public.help_requests (user_id, name, email, subject, body, source) VALUES ($1, 'B', 'b@example.com', 'Subject B', 'Body B text here', 'in_app') RETURNING id`,
        [USER_B],
      );
      requestBId = reqB.rows[0].id;
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

  it("the owner can reply on their own request as 'customer'", async () => {
    if (!reachable) return;
    const c = await pool.connect();
    try {
      await asUser(c, USER_A);
      const res = await c.query(
        `INSERT INTO public.help_request_replies (help_request_id, author_type, author_name, author_user_id, body)
         VALUES ($1, 'customer', 'A', $2, 'Following up') RETURNING id`,
        [requestAId, USER_A],
      );
      expect(res.rows.length).toBe(1);
      await c.query(`COMMIT`);
    } finally {
      c.release();
    }
  });

  it("the owner can read replies on their own request", async () => {
    if (!reachable) return;
    const c = await pool.connect();
    try {
      await asUser(c, USER_A);
      const res = await c.query(`SELECT count(*)::int AS n FROM public.help_request_replies WHERE help_request_id = $1`, [requestAId]);
      expect(res.rows[0].n).toBe(1);
      await c.query(`COMMIT`);
    } finally {
      c.release();
    }
  });

  it("a user cannot reply on someone else's request", async () => {
    if (!reachable) return;
    const c = await pool.connect();
    try {
      await asUser(c, USER_B);
      await expect(
        c.query(
          `INSERT INTO public.help_request_replies (help_request_id, author_type, author_name, author_user_id, body)
           VALUES ($1, 'customer', 'B', $2, 'Snooping') RETURNING id`,
          [requestAId, USER_B],
        ),
      ).rejects.toThrow();
      await c.query(`ROLLBACK`);
    } finally {
      c.release();
    }
  });

  it("a user cannot read someone else's request's replies", async () => {
    if (!reachable) return;
    const c = await pool.connect();
    try {
      await asUser(c, USER_B);
      const res = await c.query(`SELECT count(*)::int AS n FROM public.help_request_replies WHERE help_request_id = $1`, [requestAId]);
      expect(res.rows[0].n).toBe(0);
      await c.query(`COMMIT`);
    } finally {
      c.release();
    }
  });

  it("a user cannot tag their own reply as 'team'", async () => {
    if (!reachable) return;
    const c = await pool.connect();
    try {
      await asUser(c, USER_A);
      await expect(
        c.query(
          `INSERT INTO public.help_request_replies (help_request_id, author_type, author_name, author_user_id, body)
           VALUES ($1, 'team', 'Fake Team', $2, 'Pretending to be staff') RETURNING id`,
          [requestAId, USER_A],
        ),
      ).rejects.toThrow();
      await c.query(`ROLLBACK`);
    } finally {
      c.release();
    }
  });

  it("anon has no access at all", async () => {
    if (!reachable) return;
    const c = await pool.connect();
    try {
      await c.query(`SET ROLE anon`);
      const res = await c.query(`SELECT count(*)::int AS n FROM public.help_request_replies`);
      expect(res.rows[0].n).toBe(0);
    } finally {
      await c.query(`RESET ROLE`);
      c.release();
    }
  });

  it("service_role (the team, via the admin API) can reply as 'team' on any request", async () => {
    if (!reachable) return;
    const c = await pool.connect();
    try {
      await c.query(`SET ROLE service_role`);
      const res = await c.query(
        `INSERT INTO public.help_request_replies (help_request_id, author_type, author_name, body, email_sent)
         VALUES ($1, 'team', 'Kebu team', 'We are on it', true) RETURNING id`,
        [requestBId],
      );
      expect(res.rows.length).toBe(1);
    } finally {
      await c.query(`RESET ROLE`);
      c.release();
    }
  });
});
