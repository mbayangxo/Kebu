/**
 * Real migrated-SQL test for the unverified-example trade-intelligence seed
 * (supabase/migrations/20261028010000_opportunity_unverified_examples.sql)
 * against a disposable local PostgreSQL database. Proves: the migration
 * applies cleanly on top of the real explore-engines schema, every seeded
 * row carries trust_label='unverified_example' and confidence='exploratory'
 * (never a higher confidence than the content's own honesty allows), and
 * RLS treats these rows exactly like any other published row (same policy,
 * no special-casing) — draft rows stay hidden from anon regardless of
 * trust_label.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error — @types/pg is not in devDependencies; pg itself is present (see tests/search/db/local-pg.ts)
import { Pool } from "pg";

const LOCAL_URL = process.env.LOCAL_PG_TEST_URL ?? "postgres://postgres:localtest@127.0.0.1:5432/postgres";
const CARDS_BASE_PATH = join(__dirname, "../../supabase/migrations_archive/legacy/063_opportunity_cards.sql");
const EXPLORE_BASE_PATH = join(__dirname, "../../supabase/migrations/20261027040000_opportunity_explore_engines.sql");
const EXAMPLES_PATH = join(__dirname, "../../supabase/migrations/20261028010000_opportunity_unverified_examples.sql");

let reachable = false;
let adminPool: InstanceType<typeof Pool> | null = null;
let pool: InstanceType<typeof Pool> | null = null;
let dbName = "";

beforeAll(async () => {
  const probe = new Pool({ connectionString: LOCAL_URL, max: 1, connectionTimeoutMillis: 5000 });
  try {
    await probe.query("select 1");
    reachable = true;
  } catch {
    reachable = false;
  } finally {
    await probe.end().catch(() => {});
  }
  if (!reachable) return;

  dbName = `_kebu_opp_unverified_test_${Math.random().toString(36).slice(2, 10)}`;
  adminPool = new Pool({ connectionString: LOCAL_URL, max: 2 });
  await adminPool.query(`CREATE DATABASE "${dbName}"`);
  const url = LOCAL_URL.replace(/\/[^/?]+(\?.*)?$/, `/${dbName}$1`);
  pool = new Pool({ connectionString: url, max: 4 });

  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await pool.query(`CREATE SCHEMA IF NOT EXISTS auth`);
  await pool.query(`CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid())`);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
    END $$`);
  await pool.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role`);
  await pool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role`);
  await pool.query(
    `CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;`,
  );

  await pool.query(readFileSync(CARDS_BASE_PATH, "utf8"));
  await pool.query(readFileSync(EXPLORE_BASE_PATH, "utf8"));
  await pool.query(readFileSync(EXAMPLES_PATH, "utf8"));
});

afterAll(async () => {
  if (pool) await pool.end();
  if (adminPool) {
    await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`).catch(() => {});
    await adminPool.end();
  }
});

describe("Opportunity OS unverified-example seed — real migrated SQL", () => {
  it("migration applies cleanly and seeds rows into all three explore-engine tables", async (ctx) => {
    if (!reachable) return ctx.skip();
    const counts = await pool!.query(`
      select
        (select count(*) from public.opportunity_discovery_hypotheses where trust_label = 'unverified_example') as discovery,
        (select count(*) from public.opportunity_import_replacement_analyses where trust_label = 'unverified_example') as import_replacement,
        (select count(*) from public.opportunity_trade_gaps where trust_label = 'unverified_example') as trade_gaps
    `);
    const row = counts.rows[0];
    expect(Number(row.discovery)).toBeGreaterThan(0);
    expect(Number(row.import_replacement)).toBeGreaterThan(0);
    expect(Number(row.trade_gaps)).toBeGreaterThan(0);
  });

  it("every unverified_example row is confidence='exploratory' — never overstated", async (ctx) => {
    if (!reachable) return ctx.skip();
    const bad = await pool!.query(`
      select slug, confidence from public.opportunity_discovery_hypotheses where trust_label = 'unverified_example' and confidence != 'exploratory'
      union all
      select slug, confidence from public.opportunity_import_replacement_analyses where trust_label = 'unverified_example' and confidence != 'exploratory'
      union all
      select slug, confidence from public.opportunity_trade_gaps where trust_label = 'unverified_example' and confidence != 'exploratory'
    `);
    expect(bad.rows).toEqual([]);
  });

  it("the real curated Senegal seed from the prior migration is untouched and still distinctly 'curated'", async (ctx) => {
    if (!reachable) return ctx.skip();
    const curated = await pool!.query(
      `select trust_label from public.opportunity_discovery_hypotheses where slug = 'senegal-agtech-export-tooling'`,
    );
    expect(curated.rows).toHaveLength(1);
    expect(curated.rows[0].trust_label).toBe("curated");
  });

  it("RLS treats unverified_example rows exactly like any other row — draft hidden from anon, published visible", async (ctx) => {
    if (!reachable) return ctx.skip();
    await pool!.query(
      `insert into public.opportunity_discovery_hypotheses (slug, title, country_code, hypothesis, reasoning, confidence, trust_label, publish_status)
       values ('rls-probe-draft', 'RLS probe draft', 'SN', 'probe hypothesis', 'probe reasoning', 'exploratory', 'unverified_example', 'draft')`,
    );
    const client = await pool!.connect();
    try {
      await client.query("SET ROLE anon");
      const draftVisible = await client.query(
        `select 1 from public.opportunity_discovery_hypotheses where slug = 'rls-probe-draft'`,
      );
      const publishedVisible = await client.query(
        `select count(*) from public.opportunity_discovery_hypotheses where trust_label = 'unverified_example' and publish_status = 'published'`,
      );
      expect(draftVisible.rows).toHaveLength(0);
      expect(Number(publishedVisible.rows[0].count)).toBeGreaterThan(0);
    } finally {
      await client.query("RESET ROLE");
      client.release();
    }
  });

  it("the highest-risk content (exploitation/scam-framed rows) carries the strengthened legal-review disclaimer", async (ctx) => {
    if (!reachable) return ctx.skip();
    const rows = await pool!.query(
      `select reasoning from public.opportunity_discovery_hypotheses where slug like 'example-exploitation-%'`,
    );
    expect(rows.rows.length).toBeGreaterThan(0);
    for (const r of rows.rows) {
      expect(r.reasoning).toContain("legal review");
      expect(r.reasoning).toContain("NOT a fact-checked");
    }
  });
});
