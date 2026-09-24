#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-test-db.sh
#
# Prepares a LOCAL test PostgreSQL environment for the builder DB integration
# tests.  Creates (or confirms) the kebu_test database with the required roles
# and a testuser password for TCP connections from Node.js.
#
# This script is LOCAL/TEST ONLY.  It contains hard-coded local credentials
# that are intentionally non-secret and only valid for the local loopback
# interface.  DO NOT run it against production.
#
# PREREQUISITES
#   • PostgreSQL 16 running locally
#       sudo -u postgres pg_ctlcluster 16 main start
#   • Run as a user whose `sudo -u postgres` invocation has no password
#     prompt (typical for developer workstations).
#
# USAGE
#   bash scripts/setup-test-db.sh              # first-time and re-run
#   DRY_RUN=1 bash scripts/setup-test-db.sh    # print commands only
#
# SAFETY GUARDS
#   1. DATABASE_URL, if set, must contain "localhost" or "127.0.0.1" and the
#      database name must NOT match known production patterns.  Otherwise the
#      script aborts before touching anything.
#   2. The script never reads from or connects to the production Supabase URL
#      (NEXT_PUBLIC_SUPABASE_URL is never used here).
#   3. All destructive SQL uses IF NOT EXISTS / IF EXISTS / ON CONFLICT DO
#      NOTHING — re-running is safe.
#
# DATABASE_URL set by this script (output at the end):
#   postgres://testuser:kebu_test_pw@127.0.0.1/kebu_test
#
# NOTE: "kebu_test_pw" is a local-only placeholder credential.  It is not a
# secret.  It is valid only on 127.0.0.1 and only for the kebu_test database.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Safety guard ─────────────────────────────────────────────────────────────

PRODUCTION_DB_PATTERNS=("supabase.co" "supabase.com" "amazonaws.com" "neon.tech" "railway.app" ".prod." "production")

if [[ -n "${DATABASE_URL:-}" ]]; then
  url_lower="${DATABASE_URL,,}"
  is_local=false
  for safe_pattern in "localhost" "127.0.0.1" "::1" "/var/run/postgresql"; do
    if [[ "$url_lower" == *"$safe_pattern"* ]]; then
      is_local=true
      break
    fi
  done
  if [[ "$is_local" == "false" ]]; then
    echo "ERROR: DATABASE_URL is set but does not appear to be a local connection." >&2
    echo "  DATABASE_URL=${DATABASE_URL}" >&2
    echo "  setup-test-db.sh is LOCAL ONLY. Refusing to run against a non-local database." >&2
    echo "  Unset DATABASE_URL or point it at 127.0.0.1/kebu_test to continue." >&2
    exit 1
  fi
  for bad_pattern in "${PRODUCTION_DB_PATTERNS[@]}"; do
    if [[ "$url_lower" == *"$bad_pattern"* ]]; then
      echo "ERROR: DATABASE_URL contains a production-like pattern: '$bad_pattern'" >&2
      echo "  Refusing to run. This script is LOCAL ONLY." >&2
      exit 1
    fi
  done
fi

# ── DRY_RUN support ──────────────────────────────────────────────────────────

DRY_RUN=${DRY_RUN:-0}
PG="sudo -u postgres psql"

run_sql() {
  local label="$1"
  local sql="$2"
  echo "  → ${label}"
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "    [DRY RUN] would execute: ${sql:0:120}…"
    return
  fi
  echo "${sql}" | ${PG} -v ON_ERROR_STOP=1 -q
}

run_sql_db() {
  local db="$1"
  local label="$2"
  local sql="$3"
  echo "  → ${label}"
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "    [DRY RUN] would execute on '${db}': ${sql:0:120}…"
    return
  fi
  echo "${sql}" | ${PG} -d "${db}" -v ON_ERROR_STOP=1 -q
}

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Kebu Builder — Local Test Database Setup (LOCAL ONLY)      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
[[ "$DRY_RUN" == "1" ]] && echo "  [DRY RUN MODE — no changes will be made]" && echo ""

# ── Step 1: Roles ─────────────────────────────────────────────────────────────
echo "[1/4] Ensure test roles exist"
run_sql "testuser role" "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'testuser') THEN
    CREATE ROLE testuser SUPERUSER LOGIN PASSWORD 'kebu_test_pw';
  ELSE
    ALTER ROLE testuser WITH SUPERUSER LOGIN PASSWORD 'kebu_test_pw';
  END IF;
END;
\$\$;
"
# NOTE: testuser is given SUPERUSER so it can CREATE DATABASE for disposable-DB
# test strategy.  It is a dedicated LOCAL test role, not used for app connections.

# ── Step 2: kebu_test database ────────────────────────────────────────────────
echo "[2/4] Ensure kebu_test database exists"
run_sql "kebu_test database" "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'kebu_test') THEN
    PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE kebu_test OWNER testuser');
  END IF;
END;
\$\$ LANGUAGE plpgsql;
"
# Simpler fallback if dblink is not available:
${PG} -tc "SELECT 1 FROM pg_database WHERE datname='kebu_test'" | grep -q 1 || \
  (echo "  → creating kebu_test database"; [[ "$DRY_RUN" != "1" ]] && ${PG} -c "CREATE DATABASE kebu_test OWNER testuser")

# ── Step 3: Extensions ────────────────────────────────────────────────────────
echo "[3/4] Extensions in kebu_test"
run_sql_db "kebu_test" "pgcrypto" "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# ── Step 4: TCP auth (scram-sha-256) ─────────────────────────────────────────
echo "[4/4] Confirm TCP auth works"
echo "  → testing TCP connection as testuser"
if [[ "$DRY_RUN" != "1" ]]; then
  if PGPASSWORD=kebu_test_pw psql -h 127.0.0.1 -U testuser -d kebu_test -c "SELECT 1" -q >/dev/null 2>&1; then
    echo "  ✓ TCP connection OK"
  else
    echo "  WARNING: TCP connection failed. Check pg_hba.conf has:" >&2
    echo "    host all all 127.0.0.1/32 scram-sha-256" >&2
    echo "  Current pg_hba rules (host lines):" >&2
    sudo cat /etc/postgresql/16/main/pg_hba.conf 2>/dev/null | grep "^host" >&2 || true
  fi
fi

echo ""
echo "✓ Local test database ready."
echo ""
echo "  DATABASE_URL for DB integration tests:"
echo "    export DATABASE_URL=\"postgres://testuser:kebu_test_pw@127.0.0.1/kebu_test\""
echo ""
echo "  Run concurrency tests (production RPCs — disposable DB):"
echo "    DATABASE_URL=\"postgres://testuser:kebu_test_pw@127.0.0.1/kebu_test\" \\"
echo "      npx vitest run tests/create/builder-sections-concurrency.db.test.ts"
echo ""
echo "  Run RLS tests (local role simulation):"
echo "    DATABASE_URL=\"postgres://testuser:kebu_test_pw@127.0.0.1/kebu_test\" \\"
echo "      npx vitest run tests/create/builder-sections-rls.db.test.ts"
echo ""
echo "  NOTE: 'kebu_test_pw' is a local-only non-secret placeholder credential."
echo "  It is only valid on 127.0.0.1 and never used in production."
echo ""
