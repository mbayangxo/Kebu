#!/usr/bin/env node
/**
 * Historical migration helper retained only so old references fail safely.
 * Kebu's live database is ahead of the old APPLY_MIGRATIONS_005_007.sql bundle.
 * Never execute historical APPLY_*.sql bundles against production.
 */
console.error(
  "Blocked: this legacy migration runner is retired. Use the canonical supabase/migrations history and reconcile against the live database before any DDL.",
);
process.exit(1);
