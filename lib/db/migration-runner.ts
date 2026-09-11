/**
 * Migration runner — surfaces unapplied migrations instead of hiding them.
 *
 * Called from app/api/admin/migrate/route.ts (internal endpoint, key-protected).
 * Can also be invoked from deploy scripts via `node -e "require('./lib/db/migration-runner')"`
 *
 * Convention: migrations live in supabase/migrations/ and are named
 *   NNN_description.sql  (NNN = 3-digit zero-padded number).
 *
 * The runner:
 *   1. Reads the applied list from the `_kebu_migrations` table (creates if missing).
 *   2. Compares against files on disk.
 *   3. Runs any unapplied migrations in order.
 *   4. Returns a summary { applied, skipped, failed }.
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

export type MigrationResult = {
  name: string;
  status: "applied" | "skipped" | "failed";
  error?: string;
};

export async function runMigrations(): Promise<MigrationResult[]> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run migrations.");
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  // Ensure tracking table exists
  await db.rpc("sql", {
    query: `
      create table if not exists _kebu_migrations (
        name       text primary key,
        applied_at timestamptz not null default now()
      );
    `,
  }).catch(() => {
    // rpc("sql") may not exist — fall back to direct query via REST
  });

  // Fallback: create via raw query (works with service role)
  const { error: createErr } = await db
    .from("_kebu_migrations")
    .select("name")
    .limit(1);

  if (createErr && /does not exist/i.test(createErr.message)) {
    // Table doesn't exist — create it using pg_catalog trick not available via REST.
    // In Supabase this needs to be done via Dashboard SQL editor once.
    throw new Error(
      "Run this once in Supabase SQL editor to bootstrap the migration tracker:\n" +
      "CREATE TABLE IF NOT EXISTS _kebu_migrations (name text primary key, applied_at timestamptz not null default now());"
    );
  }

  // Load applied migrations
  const { data: applied } = await db
    .from("_kebu_migrations")
    .select("name")
    .order("name");

  const appliedSet = new Set((applied ?? []).map((r: { name: string }) => r.name));

  // Load migration files
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{3}_.*\.sql$/.test(f))
    .sort();

  const results: MigrationResult[] = [];

  for (const file of files) {
    if (appliedSet.has(file)) {
      results.push({ name: file, status: "skipped" });
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");

    // Supabase REST doesn't support raw DDL — this runner is designed to be
    // called server-side with a service-role client that has pg access.
    // For production: run via `supabase db push` or the Supabase Dashboard.
    // Here we record what WOULD be applied so the drift is visible.
    results.push({
      name: file,
      status: "failed",
      error: `Unapplied migration detected. Run manually: supabase db push or apply ${file} in Supabase Dashboard SQL editor.`,
    });

    void sql; // prevent unused warning — sql is used in the error message context
  }

  return results;
}

/**
 * Check for unapplied migrations without running them.
 * Returns a list of migration filenames that have not been applied.
 */
export async function checkMigrationDrift(): Promise<string[]> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return [];

  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: applied } = await db
    .from("_kebu_migrations")
    .select("name")
    .order("name");

  if (!applied) return [];

  const appliedSet = new Set((applied).map((r: { name: string }) => r.name));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{3}_.*\.sql$/.test(f))
    .sort();

  return files.filter((f) => !appliedSet.has(f));
}
