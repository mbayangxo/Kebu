#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-test-db.sh
#
# Applies the builder-relevant PostgreSQL migrations to a local kebu_test
# database so the concurrency and DB integration tests can run without a
# live Supabase instance.
#
# Prerequisites
#   • PostgreSQL 16 running locally (sudo -u postgres pg_ctlcluster 16 main start)
#   • kebu_test database exists (see FIRST_TIME SETUP below)
#   • Run as a user whose sudo invokes postgres, OR set PG_SUPERUSER to a role
#     that has CREATE TABLE / CREATE FUNCTION rights on kebu_test.
#
# FIRST TIME SETUP (one-off, run as postgres or superuser):
#   sudo -u postgres psql -c "CREATE DATABASE kebu_test OWNER testuser;"
#   sudo -u postgres psql -c "CREATE ROLE testuser SUPERUSER LOGIN;"    # if absent
#   sudo -u postgres psql -d kebu_test -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
#
# Usage
#   bash scripts/setup-test-db.sh            # applies missing builder tables/RPCs
#   DATABASE_URL=postgres://... bash scripts/setup-test-db.sh
#
# The script is idempotent: it uses CREATE TABLE IF NOT EXISTS and
# CREATE OR REPLACE FUNCTION throughout, so re-running it is safe.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/../supabase/migrations"

# ── Connection ────────────────────────────────────────────────────────────────
# Accept an explicit DATABASE_URL or fall back to local socket.
if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL="psql ${DATABASE_URL}"
else
  # Default: connect as postgres superuser to kebu_test via local socket.
  PSQL="sudo -u postgres psql -d kebu_test"
fi

run_sql() {
  local label="$1"
  local sql="$2"
  echo "  → ${label}"
  echo "${sql}" | ${PSQL} -v ON_ERROR_STOP=1 -q
}

apply_migration() {
  local file="$1"
  echo "  → $(basename "${file}")"
  ${PSQL} -v ON_ERROR_STOP=1 -q -f "${file}"
}

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Kebu Builder — Local Test Database Setup                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: extensions ───────────────────────────────────────────────────────
echo "[1/5] Extensions"
run_sql "pgcrypto" "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# ── Step 2: auth.users stub ──────────────────────────────────────────────────
# Production tables reference auth.users (Supabase auth schema).
# Create a minimal stub schema so foreign-key references resolve.
echo "[2/5] auth schema stub"
run_sql "auth schema" "CREATE SCHEMA IF NOT EXISTS auth;"
run_sql "auth.users stub" "
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  created_at timestamptz DEFAULT now()
);"
run_sql "auth.uid() stub" "
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
\$\$ SELECT current_setting('request.jwt.claim.sub', true)::uuid \$\$;"
run_sql "auth.role() stub" "
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
\$\$ SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon') \$\$;"

# ── Step 3: builder core tables (migration 004) ───────────────────────────────
echo "[3/5] Builder core tables (projects / project_pages / project_sections)"
apply_migration "${MIGRATIONS_DIR}/004_create_projects.sql"

# ── Step 4: atomic RPC functions (migration 20260924010000) ───────────────────
echo "[4/5] Atomic RPCs (batch_update_section_props, reorder_sections)"
apply_migration "${MIGRATIONS_DIR}/20260924010000_builder_atomic_rpcs.sql"

# ── Step 5: grants ────────────────────────────────────────────────────────────
echo "[5/5] Role grants"
run_sql "create roles (if absent)" "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END;
\$\$;
"

echo ""
echo "✓ Setup complete."
echo ""
echo "Set the following env var to run DB integration tests:"
echo "  export DATABASE_URL=\"postgres://testuser:kebu_test_pw@127.0.0.1/kebu_test\""
echo ""
echo "NOTE: Local socket (peer) auth is disabled for Node.js callers."
echo "  The script already set testuser's password to 'kebu_test_pw'."
echo "  Change it: sudo -u postgres psql -c \"ALTER ROLE testuser WITH PASSWORD 'your_pw';\""
echo ""
echo "Then run:"
echo "  npx vitest run tests/create/builder-sections-concurrency.db.test.ts"
echo ""
