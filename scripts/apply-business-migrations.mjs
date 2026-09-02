#!/usr/bin/env node
/**
 * Apply Kebu ID + business registration migrations (005–007 bundle) to Supabase Postgres.
 *
 * Usage:
 *   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" \
 *     node scripts/apply-business-migrations.mjs
 *
 * Get DATABASE_URL from Supabase Dashboard → Project Settings → Database → Connection string (URI).
 * Prefer the "Session pooler" or direct connection for DDL.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(__dirname, "../supabase/migrations/APPLY_MIGRATIONS_005_007.sql");

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    console.error(
      "Missing DATABASE_URL.\n" +
        "Set it from Supabase → Settings → Database → Connection string, then re-run.\n" +
        "Or paste supabase/migrations/APPLY_MIGRATIONS_005_007.sql into Supabase SQL Editor.",
    );
    process.exit(1);
  }

  const sql = readFileSync(sqlPath, "utf8");
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  console.log("Connecting to Supabase Postgres…");
  await client.connect();

  try {
    console.log("Applying APPLY_MIGRATIONS_005_007.sql …");
    await client.query(sql);
    const { rows } = await client.query(`
      select tablename from pg_tables
      where schemaname = 'public'
        and tablename in (
          'businesses', 'business_members', 'kebu_ids',
          'business_owners', 'registration_progress', 'business_readiness_scores'
        )
      order by 1
    `);
    console.log("Tables present:", rows.map((r) => r.tablename).join(", ") || "(none)");
    if (rows.length < 6) {
      console.error("Some tables still missing after apply.");
      process.exit(1);
    }
    console.log("Done. Retry business registration in Kebu.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
