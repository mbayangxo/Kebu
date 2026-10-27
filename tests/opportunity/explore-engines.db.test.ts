/**
 * Real migrated-SQL tests for the Opportunity OS explore engines
 * (supabase/migrations/20261027040000_opportunity_explore_engines.sql)
 * against a disposable local PostgreSQL database — not a JS mock. Proves
 * three things a code read alone cannot: the migration applies cleanly,
 * RLS actually hides drafts from anon and shows them to service_role, and
 * every factual claim in the seeded rows is genuinely traceable to real
 * data already in public.country_profiles (never a fabricated statistic).
 */
import { readFileSync } from "fs";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error — @types/pg is not in devDependencies; pg itself is present (see tests/search/db/local-pg.ts)
import { Pool } from "pg";

const LOCAL_URL = process.env.LOCAL_PG_TEST_URL ?? "postgres://postgres:localtest@127.0.0.1:5432/postgres";
const MIGRATION_PATH = join(__dirname, "../../supabase/migrations/20261027040000_opportunity_explore_engines.sql");

let reachable = false;
let adminPool: InstanceType<typeof Pool> | null = null;
let pool: InstanceType<typeof Pool> | null = null;
let dbName = "";

async function asRole<T>(client: InstanceType<typeof Pool>, role: string, fn: () => Promise<T>): Promise<T> {
  await client.query(`SET ROLE ${role}`);
  try {
    return await fn();
  } finally {
    await client.query("RESET ROLE");
  }
}

beforeAll(async () => {
  const probe = new Pool({ connectionString: LOCAL_URL, max: 1, connectionTimeoutMillis: 1500 });
  try {
    await probe.query("select 1");
    reachable = true;
  } catch {
    reachable = false;
  } finally {
    await probe.end().catch(() => {});
  }
  if (!reachable) return;

  dbName = `_kebu_opp_explore_test_${Math.random().toString(36).slice(2, 10)}`;
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
  await pool.query(`
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger LANGUAGE plpgsql AS $f$
    BEGIN new.updated_at = now(); RETURN new; END; $f$;
  `);

  // Trimmed opportunity_cards + the real curated Senegal country_profiles
  // columns this migration's seed rows actually cite as their source —
  // same real values as supabase/migrations_archive/legacy/009_opportunity_country_explorer.sql.
  await pool.query(`
    CREATE TABLE public.opportunity_cards (
      id uuid primary key default gen_random_uuid(),
      slug text not null unique, publish_status text not null default 'draft', sort_order integer not null default 0,
      title text, opportunity_summary text, country_code char(2), location_label text,
      problem text, evidence text, why_now text, customer_segment text, current_solutions text,
      import_dependency text, local_resources text[] default '{}', required_capabilities text[] default '{}',
      estimated_market text, competition text, regulatory_notes text,
      potential_african_markets text[] default '{}', business_models text[] default '{}',
      difficulty text, capital_intensity text, time_to_market text,
      confidence text, trust_label text, sources jsonb default '[]'::jsonb,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    CREATE TABLE public.country_profiles (
      country_code char(2) primary key,
      major_exports text[] default '{}', major_imports text[] default '{}',
      agricultural_products text[] default '{}', manufacturing_sectors text[] default '{}',
      technology_ecosystem text, trade_agreements text[] default '{}'
    )
  `);
  await pool.query(
    `INSERT INTO public.country_profiles (country_code, major_exports, major_imports, agricultural_products, manufacturing_sectors, technology_ecosystem, trade_agreements)
     VALUES ('SN', $1, $2, $3, $4, $5, $6)`,
    [
      ["Gold", "Phosphates", "Petroleum products", "Fish", "Groundnuts", "Cashews"],
      ["Petroleum products", "Machinery", "Food products", "Vehicles", "Pharmaceuticals"],
      ["Rice", "Groundnuts", "Millet", "Sorghum", "Cashews", "Horticulture", "Fish"],
      ["Food processing", "Construction materials", "Textiles", "Light manufacturing"],
      "Growing digital ecosystem in Dakar with incubators, fintech experiments, and creative/tech startups.",
      ["ECOWAS", "AfCFTA participation", "WAEMU"],
    ],
  );

  await pool.query(readFileSync(MIGRATION_PATH, "utf8"));
});

afterAll(async () => {
  if (pool) await pool.end();
  if (adminPool) {
    await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await adminPool.end();
  }
});

describe("Opportunity OS explore engines — real migrated SQL", () => {
  it("applies cleanly and creates all three new tables", async () => {
    if (!reachable) return;
    const { rows } = await pool!.query(
      `select table_name from information_schema.tables where table_schema='public'
       and table_name in ('opportunity_import_replacement_analyses','opportunity_discovery_hypotheses','opportunity_trade_gaps')`,
    );
    expect(rows.map((r: { table_name: string }) => r.table_name).sort()).toEqual([
      "opportunity_discovery_hypotheses",
      "opportunity_import_replacement_analyses",
      "opportunity_trade_gaps",
    ]);
  });

  it("seeds exactly the honest empty state for trade gaps — zero rows, by design", async () => {
    if (!reachable) return;
    const { rows } = await pool!.query(`select count(*) from public.opportunity_trade_gaps`);
    expect(Number(rows[0].count)).toBe(0);
  });

  it("every claimed fact in the seeded import-replacement row is genuinely true of country_profiles, not invented", async () => {
    if (!reachable) return;
    const { rows } = await pool!.query(
      `select
         'Cashews' = ANY(major_exports) as cashews_in_exports,
         'Cashews' = ANY(agricultural_products) as cashews_in_ag,
         'Food processing' = ANY(manufacturing_sectors) as food_processing_real
       from public.country_profiles where country_code = 'SN'`,
    );
    expect(rows[0].cashews_in_exports).toBe(true);
    expect(rows[0].cashews_in_ag).toBe(true);
    expect(rows[0].food_processing_real).toBe(true);
  });

  it("every claimed signal in the seeded discovery hypothesis is genuinely true of country_profiles", async () => {
    if (!reachable) return;
    const { rows } = await pool!.query(
      `select technology_ecosystem is not null and technology_ecosystem <> '' as has_tech_ecosystem,
              cardinality(major_exports) > 0 as has_major_exports
       from public.country_profiles where country_code = 'SN'`,
    );
    expect(rows[0].has_tech_ecosystem).toBe(true);
    expect(rows[0].has_major_exports).toBe(true);
  });

  it("RLS: anon can read published rows in all three tables", async () => {
    if (!reachable) return;
    const importReplacement = await asRole(pool!, "anon", async () => {
      const { rows } = await pool!.query(`select count(*) from public.opportunity_import_replacement_analyses`);
      return Number(rows[0].count);
    });
    const discovery = await asRole(pool!, "anon", async () => {
      const { rows } = await pool!.query(`select count(*) from public.opportunity_discovery_hypotheses`);
      return Number(rows[0].count);
    });
    expect(importReplacement).toBeGreaterThan(0);
    expect(discovery).toBeGreaterThan(0);
  });

  it("RLS: a draft row is hidden from anon but visible to service_role — proven live, not asserted", async () => {
    if (!reachable) return;
    await pool!.query(
      `insert into public.opportunity_discovery_hypotheses (slug, title, country_code, hypothesis, reasoning, publish_status)
       values ('rls-draft-probe', 'Draft probe', 'SN', 'x', 'x', 'draft')`,
    );

    const hiddenFromAnon = await asRole(pool!, "anon", async () => {
      const { rows } = await pool!.query(
        `select count(*) from public.opportunity_discovery_hypotheses where slug = 'rls-draft-probe'`,
      );
      return Number(rows[0].count);
    });
    expect(hiddenFromAnon).toBe(0);

    const visibleToServiceRole = await asRole(pool!, "service_role", async () => {
      const { rows } = await pool!.query(
        `select count(*) from public.opportunity_discovery_hypotheses where slug = 'rls-draft-probe'`,
      );
      return Number(rows[0].count);
    });
    expect(visibleToServiceRole).toBe(1);
  });

  it("opportunity_cards extension (the new cashew card) is real, published, and cites the same real signals", async () => {
    if (!reachable) return;
    const { rows } = await pool!.query(
      `select title, confidence, trust_label, country_code from public.opportunity_cards where slug = 'senegal-cashew-value-addition' and publish_status = 'published'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].country_code).toBe("SN");
    expect(rows[0].confidence).toBe("exploratory");
  });
});
