/**
 * Verifies that the actual repository migrations have been applied to the QA
 * Supabase project. Uses a direct Postgres connection (SUPABASE_QA_DB_URL).
 *
 * The check is structural: it looks for key tables and functions introduced by
 * each migration phase, and for the SECURITY DEFINER functions from the Builder
 * atomic-RPCs migration. If any are missing it throws, blocking all tests that
 * depend on the correct schema.
 *
 * This does NOT apply migrations — it only verifies them. To apply:
 *   psql $SUPABASE_QA_DB_URL -f supabase/migrations/APPLY_ALL_PHASE_ONE.sql
 *   psql $SUPABASE_QA_DB_URL -f supabase/migrations/<each dated migration>
 */

// @ts-expect-error — @types/pg not in devDependencies
import { Pool } from "pg";

const QA_DB_URL = process.env.SUPABASE_QA_DB_URL ?? "";

/** Returns true if migration verification can be attempted. */
export function canVerifyMigrations(): boolean {
  return Boolean(QA_DB_URL);
}

type VerificationResult = {
  ok: boolean;
  missing: string[];
  details: string;
};

/**
 * Checks that all required schema objects exist in the QA project.
 * Throws if SUPABASE_QA_DB_URL is not set.
 */
export async function verifyMigrations(): Promise<VerificationResult> {
  if (!QA_DB_URL) {
    throw new Error(
      "Migration verifier: SUPABASE_QA_DB_URL is not set. " +
      "Provide the direct Postgres connection string for the QA project."
    );
  }

  const pool = new Pool({ connectionString: QA_DB_URL, max: 2, connectionTimeoutMillis: 10_000 });
  const missing: string[] = [];

  try {
    const client = await pool.connect();
    try {
      // ── Phase 1 tables ──────────────────────────────────────────────────────
      const REQUIRED_TABLES = [
        "public.projects",
        "public.project_sections",
        "public.website_assets",
        "public.project_pages",
      ];
      for (const fqt of REQUIRED_TABLES) {
        const [schema, table] = fqt.split(".");
        const { rows } = await client.query<{ exists: boolean }>(
          `SELECT EXISTS(
             SELECT 1 FROM information_schema.tables
             WHERE table_schema = $1 AND table_name = $2
           ) AS exists`,
          [schema, table]
        );
        if (!rows[0]?.exists) missing.push(`table: ${fqt}`);
      }

      // ── SECURITY DEFINER RPCs (20260924010000_builder_atomic_rpcs.sql) ──────
      const REQUIRED_FUNCTIONS = [
        { name: "reorder_sections",          args: "uuid, uuid[]" },
        { name: "batch_update_section_props", args: "uuid, jsonb" },
      ];
      for (const fn of REQUIRED_FUNCTIONS) {
        const { rows } = await client.query<{ exists: boolean }>(
          `SELECT EXISTS(
             SELECT 1 FROM pg_proc p
             JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = $1
           ) AS exists`,
          [fn.name]
        );
        if (!rows[0]?.exists) missing.push(`function: public.${fn.name}(${fn.args})`);
      }

      // ── SECURITY DEFINER flag on RPCs ────────────────────────────────────────
      const SECDEF_FUNCTIONS = ["reorder_sections", "batch_update_section_props"];
      for (const fnName of SECDEF_FUNCTIONS) {
        const { rows } = await client.query<{ prosecdef: boolean }>(
          `SELECT p.prosecdef
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = $1
           LIMIT 1`,
          [fnName]
        );
        if (rows[0] && !rows[0].prosecdef) {
          missing.push(`function not SECURITY DEFINER: public.${fnName}`);
        }
      }

      // ── Auth guard present in reorder_sections body ──────────────────────────
      // Check that the v2 ownership guard (IS NOT NULL) is in the function body.
      // This catches the case where the old v1 guard (which broke service_role)
      // was accidentally applied instead of v2.
      const { rows: bodyRows } = await client.query<{ prosrc: string }>(
        `SELECT p.prosrc
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'reorder_sections'
         LIMIT 1`
      );
      if (bodyRows.length > 0) {
        const body = bodyRows[0].prosrc ?? "";
        if (!body.includes("auth.uid() IS NOT NULL")) {
          missing.push(
            "function body: public.reorder_sections missing 'auth.uid() IS NOT NULL' guard (v1 guard may be applied)"
          );
        }
      }

      // ── REVOKE from PUBLIC ───────────────────────────────────────────────────
      // Verify PUBLIC has no EXECUTE on the SECURITY DEFINER functions.
      // pg_catalog.has_function_privilege returns true if the given role has execute.
      // We check that 'public' role does NOT have execute.
      for (const fnName of SECDEF_FUNCTIONS) {
        const { rows: grantRows } = await client.query<{ has_priv: boolean }>(
          `SELECT pg_catalog.has_function_privilege(
             'public',
             (SELECT p.oid FROM pg_proc p
              JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public' AND p.proname = $1 LIMIT 1),
             'execute'
           ) AS has_priv`,
          [fnName]
        );
        if (grantRows[0]?.has_priv === true) {
          missing.push(`function: public.${fnName} — PUBLIC still has EXECUTE (REVOKE not applied)`);
        }
      }

    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }

  const ok = missing.length === 0;
  const details = ok
    ? "All required schema objects verified."
    : `Missing or misconfigured objects:\n${missing.map((m) => `  - ${m}`).join("\n")}`;

  return { ok, missing, details };
}

/**
 * Convenience wrapper: verifies migrations and throws a descriptive error if
 * anything is missing. Call in beforeAll() before running any tests.
 */
export async function requireMigrationsApplied(): Promise<void> {
  const result = await verifyMigrations();
  if (!result.ok) {
    throw new Error(
      `QA harness: migrations not fully applied to QA project.\n${result.details}\n\n` +
      `Apply migrations from supabase/migrations/ to the QA project before running tests.`
    );
  }
}
