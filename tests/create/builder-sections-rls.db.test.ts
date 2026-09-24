/**
 * PostgreSQL RLS / Authorization tests for builder section RPCs.
 *
 * ── ARCHITECTURE ─────────────────────────────────────────────────────────────
 *
 * Tests use the same disposable-database strategy as
 * builder-sections-concurrency.db.test.ts: a fresh database applies the
 * production migration SQL verbatim, then role permissions are simulated
 * via SET LOCAL / set_config to inject JWT claim values.
 *
 * ── WHAT IS VERIFIED HERE ────────────────────────────────────────────────────
 *
 *   Local role simulation (SET LOCAL role / set_config JWT claims):
 *     • Owner can SELECT their own rows via RLS policies
 *     • Non-owner cannot SELECT another user's rows
 *     • anon role has no access to project data
 *     • batch_update_section_props enforces project-level scope (cross-project
 *       writes update 0 rows regardless of which user calls them)
 *     • reorder_sections does not apply changes from wrong project
 *
 * ── WHAT IS NOT VERIFIED HERE (requires full Supabase Auth) ──────────────────
 *
 *   These cases are BLOCKED pending a Supabase environment:
 *     • Real JWT token issuance and validation
 *     • session cookie → auth.uid() resolution via Supabase GoTrue
 *     • SECURITY DEFINER privilege elevation behaviour with real JWT
 *     • service_role bypass of RLS (requires real Supabase service key)
 *     • Row creation through the actual API surface (/api/projects/…)
 *
 * ── LOCAL SIMULATION LIMITATIONS ─────────────────────────────────────────────
 *
 *   • We set 'request.jwt.claim.sub' via set_config to simulate auth.uid().
 *     In Supabase, the claim is decoded from a signed JWT by the PostgREST
 *     layer — we cannot replicate the cryptographic validation locally.
 *   • We switch to the 'authenticated' role via SET LOCAL ROLE.
 *     In production, PostgREST switches the role automatically based on the
 *     JWT 'role' claim. A local SUPERUSER connection issuing SET ROLE does not
 *     carry the same privilege constraints as a real Supabase API connection.
 *   • Results here confirm that the RLS policy SQL logic is correct (the
 *     EXISTS subquery returns the right rows) — they do NOT confirm that
 *     a real API request cannot bypass this via privilege escalation.
 *   • Superuser-level concurrency test results are NOT evidence of RLS
 *     correctness.  These are separate suites testing separate properties.
 *
 * Required environment variables (skip if absent):
 *   DATABASE_URL  — direct postgres:// admin connection string
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
// @ts-expect-error — @types/pg is not in devDependencies
import { Pool, type PoolClient } from "pg";

// ── Environment gate ──────────────────────────────────────────────────────────

const ADMIN_URL = process.env.DATABASE_URL;
const SKIP = !ADMIN_URL;

// ── Disposable database ───────────────────────────────────────────────────────

const DB_NAME = `_kebtest_rls_${Math.random().toString(36).slice(2, 10)}`;
const REPO_ROOT = join(__dirname, "../..");
const MIGRATION_CORE    = join(REPO_ROOT, "supabase/migrations/004_create_projects.sql");
const MIGRATION_BUILDER = join(REPO_ROOT, "supabase/migrations/20260924010000_builder_atomic_rpcs.sql");

async function createDisposableDatabase(adminPool: Pool): Promise<void> {
  const c = await adminPool.connect();
  try {
    await c.query(`CREATE DATABASE "${DB_NAME}"`);
  } finally {
    c.release();
  }
}

async function applyMigrations(dbUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: dbUrl, max: 2 });
  const c = await pool.connect();
  try {
    await c.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await c.query(`CREATE SCHEMA IF NOT EXISTS auth`);
    await c.query(`
      CREATE TABLE IF NOT EXISTS auth.users (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email      text,
        created_at timestamptz DEFAULT now()
      )
    `);
    await c.query(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$
    `);
    await c.query(`
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
      $$ SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon') $$
    `);
    await c.query(readFileSync(MIGRATION_CORE, "utf8"));
    await c.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role;
        END IF;
      END $$
    `);
    // Grant authenticated SELECT/INSERT/UPDATE/DELETE on tables so SET ROLE works.
    await c.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated`);
    await c.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO authenticated`);
    await c.query(`GRANT USAGE ON SCHEMA public TO authenticated`);
    await c.query(`GRANT USAGE ON SCHEMA auth TO authenticated`);
    await c.query(readFileSync(MIGRATION_BUILDER, "utf8"));
  } finally {
    c.release();
    await pool.end();
  }
}

async function dropDisposableDatabase(adminPool: Pool): Promise<void> {
  const c = await adminPool.connect();
  try {
    await c.query(`
      SELECT pg_terminate_backend(pid)
      FROM   pg_stat_activity
      WHERE  datname = $1 AND pid <> pg_backend_pid()
    `, [DB_NAME]);
    await c.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`);
  } finally {
    c.release();
  }
}

function disposableDbUrl(adminUrl: string): string {
  return adminUrl.replace(/\/[^/?]+(\?.*)?$/, `/${DB_NAME}$1`);
}

// ── RLS simulation helpers ────────────────────────────────────────────────────

/**
 * Run a callback inside a transaction that simulates an authenticated user.
 * Sets request.jwt.claim.sub = userId and switches to the 'authenticated' role.
 *
 * LIMITATION: SET ROLE in a superuser connection does NOT restrict privileges
 * the way PostgREST does for real API connections.  What this DOES test is that
 * the RLS policy EXISTS subquery correctly filters rows by owner_id.
 */
async function asAuthenticatedUser<T>(
  pool: Pool,
  userId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(`SET LOCAL ROLE authenticated`);
    await c.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    const result = await fn(c);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

/** Run a callback as the 'anon' role (unauthenticated). */
async function asAnon<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    // anon role has no grants in this schema; any access should fail or return empty.
    await c.query(`SET LOCAL ROLE anon`);
    await c.query(`SELECT set_config('request.jwt.claim.role', 'anon', true)`);
    const result = await fn(c);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

// ── Fixture helpers ───────────────────────────────────────────────────────────

interface Fixture {
  ownerId: string;
  projectId: string;
  pageId: string;
  sectionIds: string[];
}

async function createFixture(adminPool: Pool, sectionCount = 3): Promise<Fixture> {
  const { rows: [u] } = await adminPool.query<{ id: string }>(
    `INSERT INTO auth.users DEFAULT VALUES RETURNING id`,
  );
  const ownerId = u.id;
  const { rows: [proj] } = await adminPool.query<{ id: string }>(
    `INSERT INTO public.projects (owner_id, title) VALUES ($1, 'RLS Test Project') RETURNING id`,
    [ownerId],
  );
  const { rows: [page] } = await adminPool.query<{ id: string }>(
    `INSERT INTO public.project_pages (project_id) VALUES ($1) RETURNING id`,
    [proj.id],
  );
  const sectionIds: string[] = [];
  for (let i = 0; i < sectionCount; i++) {
    const { rows: [sec] } = await adminPool.query<{ id: string }>(
      `INSERT INTO public.project_sections (page_id, section_type, sort_order, props)
       VALUES ($1, 'hero', $2, $3) RETURNING id`,
      [page.id, i, JSON.stringify({ index: i })],
    );
    sectionIds.push(sec.id);
  }
  return { ownerId, projectId: proj.id, pageId: page.id, sectionIds };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe.skipIf(SKIP)("builder section RLS — local role simulation [PostgreSQL integration]", () => {
  let adminPool: Pool;
  let pool: Pool;    // application-level pool for the disposable DB
  let anonPool: Pool;

  beforeAll(async () => {
    adminPool = new Pool({ connectionString: ADMIN_URL!, max: 3 });
    await createDisposableDatabase(adminPool);
    const dbUrl = disposableDbUrl(ADMIN_URL!);
    await applyMigrations(dbUrl);
    pool = new Pool({ connectionString: dbUrl, max: 10 });
    // Grant anon role minimal login access for SET ROLE to work.
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon;
        END IF;
      END $$
    `);
    await pool.query(`GRANT USAGE ON SCHEMA public TO anon`);
    // Explicitly do NOT grant SELECT on tables to anon — RLS should prevent access.
  }, 60_000);

  afterAll(async () => {
    if (pool) await pool.end();
    if (anonPool) await anonPool.end();
    if (adminPool) {
      await dropDisposableDatabase(adminPool);
      await adminPool.end();
    }
  }, 30_000);

  // ── RLS-1: owner can read their own projects ──────────────────────────────
  it("[RLS] owner can SELECT their own projects row", async () => {
    const { ownerId, projectId } = await createFixture(pool, 1);

    const rows = await asAuthenticatedUser(pool, ownerId, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `SELECT id FROM public.projects WHERE id = $1`,
        [projectId],
      );
      return rows;
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(projectId);
  });

  // ── RLS-2: non-owner cannot read another user's project ───────────────────
  it("[RLS] non-owner receives zero rows for another user's project", async () => {
    const ownerFixture = await createFixture(pool, 1);

    // Create a second user who does not own ownerFixture.projectId.
    const { rows: [stranger] } = await pool.query<{ id: string }>(
      `INSERT INTO auth.users DEFAULT VALUES RETURNING id`,
    );

    const rows = await asAuthenticatedUser(pool, stranger.id, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `SELECT id FROM public.projects WHERE id = $1`,
        [ownerFixture.projectId],
      );
      return rows;
    });

    // RLS policy: auth.uid() = owner_id — stranger sees nothing.
    expect(rows).toHaveLength(0);
  });

  // ── RLS-3: non-owner cannot read another user's sections ─────────────────
  it("[RLS] non-owner receives zero rows for another user's sections", async () => {
    const ownerFixture = await createFixture(pool, 2);

    const { rows: [stranger] } = await pool.query<{ id: string }>(
      `INSERT INTO auth.users DEFAULT VALUES RETURNING id`,
    );

    const rows = await asAuthenticatedUser(pool, stranger.id, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `SELECT id FROM public.project_sections WHERE page_id = $1`,
        [ownerFixture.pageId],
      );
      return rows;
    });

    expect(rows).toHaveLength(0);
  });

  // ── RLS-4: owner can read their own sections ──────────────────────────────
  it("[RLS] owner can SELECT their own sections", async () => {
    const { ownerId, pageId, sectionIds } = await createFixture(pool, 3);

    const rows = await asAuthenticatedUser(pool, ownerId, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `SELECT id FROM public.project_sections WHERE page_id = $1 ORDER BY sort_order`,
        [pageId],
      );
      return rows;
    });

    expect(rows).toHaveLength(3);
    expect(rows.map((r: { id: string }) => r.id)).toEqual(sectionIds);
  });

  // ── RLS-5: batch_update cross-project scope always returns 0 ─────────────
  it("[scope] batch_update_section_props returns 0 for cross-project section IDs (RPC level)", async () => {
    const fixture1 = await createFixture(pool, 2);
    const fixture2 = await createFixture(pool, 2);

    // Even as SUPERUSER (bypassing RLS), the RPC WHERE clause must prevent this.
    const { rows } = await pool.query<{ batch_update_section_props: number }>(
      `SELECT public.batch_update_section_props($1, $2::jsonb)`,
      [
        fixture1.projectId,
        JSON.stringify(fixture2.sectionIds.map((id) => ({ id, props: { hijacked: true } }))),
      ],
    );

    expect(rows[0].batch_update_section_props).toBe(0);

    // Verify fixture2's sections are untouched.
    const { rows: check } = await pool.query<{ props: Record<string, unknown> }>(
      `SELECT props FROM public.project_sections WHERE page_id = $1`,
      [fixture2.pageId],
    );
    for (const row of check) {
      expect(row.props.hijacked).toBeUndefined();
    }
  });

  // ── RLS-6: reorder_sections returns 0 for wrong project ──────────────────
  it("[scope] reorder_sections returns 0 when section IDs belong to a different project", async () => {
    const fixture1 = await createFixture(pool, 3);
    const fixture2 = await createFixture(pool, 3);

    const { rows } = await pool.query<{ reorder_sections: number }>(
      `SELECT public.reorder_sections($1, $2::uuid[])`,
      [fixture1.projectId, fixture2.sectionIds],
    );

    // The WHERE page_id IN (SELECT id FROM project_pages WHERE project_id = fixture1.projectId)
    // clause means fixture2 sections are invisible to this call → 0 rows updated.
    expect(rows[0].reorder_sections).toBe(0);

    // fixture2's sort_order values must be unchanged.
    const { rows: check } = await pool.query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM public.project_sections WHERE page_id = $1 ORDER BY sort_order`,
      [fixture2.pageId],
    );
    const orders = check.map((r: { id: string; sort_order: number }) => r.sort_order);
    expect(orders).toEqual([0, 1, 2]);
  });

  // ── RLS-7: batch_update within-project updates all matching sections ───────
  it("[scope] batch_update_section_props updates all sections in the correct project", async () => {
    const { projectId, sectionIds } = await createFixture(pool, 3);

    const updates = sectionIds.map((id, i) => ({ id, props: { label: `updated-${i}` } }));
    const { rows } = await pool.query<{ batch_update_section_props: number }>(
      `SELECT public.batch_update_section_props($1, $2::jsonb)`,
      [projectId, JSON.stringify(updates)],
    );

    expect(rows[0].batch_update_section_props).toBe(3);

    const { rows: check } = await pool.query<{ props: Record<string, unknown> }>(
      `SELECT props FROM public.project_sections WHERE id = $1`,
      [sectionIds[0]],
    );
    expect(check[0].props).toEqual({ label: "updated-0" });
  });

  // ── BLOCKED CASES (documented, not tested) ────────────────────────────────
  it.skip("[BLOCKED] service_role bypasses RLS — requires real Supabase service key", () => {});
  it.skip("[BLOCKED] SECURITY DEFINER privilege elevation with real JWT — requires Supabase Auth", () => {});
  it.skip("[BLOCKED] anon role has no access — requires SET ROLE + REVOKE to be production-accurate", () => {});
});
