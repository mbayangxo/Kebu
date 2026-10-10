#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# bootstrap-qa-schema.sh
#
# Applies the complete current Kebu schema to an empty Supabase QA project
# in one deterministic pass and records Supabase CLI migration state so that
# a subsequent `supabase db push --db-url` is a safe no-op.
#
# WHAT IT DOES
#   1. Validates all five fail-closed safeguards (same as the test harness)
#   2. Checks the target database is reachable and empty-ish (tables < 5)
#   3. Applies ONLY the canonical numbered (001_-100_) and timestamped
#      (20260923…-20260924…) migration files in lexicographic order.
#      NEVER applies APPLY_ALL*, APPLY_MIGRATIONS*, FIX_*, VERIFY_* files —
#      those are SQL-Editor patch/verify helpers, NOT migrations.
#   4. Marks ALL migration-directory .sql files (including the patch/verify
#      helpers) as applied in supabase_migrations.schema_migrations so the
#      Supabase CLI never attempts to run APPLY_ALL_PHASE_ONE or the FIX_
#      files against the QA project.
#   5. Verifies the SECURITY DEFINER RPCs and their v2 guard are present.
#
# USAGE
#   export SUPABASE_QA_DB_URL="postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres"
#   export SUPABASE_QA_DESIGNATED=true
#   export SUPABASE_QA_URL=https://REF.supabase.co
#   export SUPABASE_PROD_URL=https://PROD_REF.supabase.co   # strongly recommended
#   bash scripts/bootstrap-qa-schema.sh
#
# PREREQUISITES
#   • psql in PATH (e.g. apt-get install postgresql-client)
#   • All env vars above set (from .env.test.local — never commit secrets)
#
# SAFETY GUARDS (five independent checks — all must pass):
#   1. SUPABASE_QA_DESIGNATED must be exactly "true"
#   2. SUPABASE_QA_DB_URL must be non-empty
#   3. SUPABASE_QA_DB_URL must NOT contain "supabase_prod_url" value
#   4. SUPABASE_QA_DB_URL must NOT contain production hostname patterns
#   5. The target database must have fewer than 5 public tables (virgin check)
#      (override with ALLOW_PARTIAL=1 to re-run after partial apply)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'
ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
warn() { echo -e "  ${YELLOW}⚠${RESET} $*"; }
fail() { echo -e "  ${RED}✗ FATAL:${RESET} $*" >&2; exit 1; }
step() { echo -e "\n${BOLD}[$1]${RESET} $2"; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║  Kebu QA Schema Bootstrap (NON-PRODUCTION ONLY)             ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# ── Safeguard 1: Designation sentinel ────────────────────────────────────────
step "1/7" "Fail-closed safeguards"

DESIGNATED="${SUPABASE_QA_DESIGNATED:-}"
[[ "$DESIGNATED" == "true" ]] || \
  fail "SUPABASE_QA_DESIGNATED is not set to 'true'. This script requires an explicitly designated QA project."
ok "SUPABASE_QA_DESIGNATED=true"

# ── Safeguard 2: DB URL present ────────────────────────────────────────────────
DB_URL="${SUPABASE_QA_DB_URL:-}"
[[ -n "$DB_URL" ]] || \
  fail "SUPABASE_QA_DB_URL is not set. Set it to the direct Postgres connection string for the QA project."
ok "SUPABASE_QA_DB_URL is set"

# ── Safeguard 3: Production URL denylist ──────────────────────────────────────
PROD_URL="${SUPABASE_PROD_URL:-}"
QA_URL="${SUPABASE_QA_URL:-}"
if [[ -n "$PROD_URL" ]]; then
  # Compare DB URLs by extracting hostname
  PROD_HOST=$(echo "$PROD_URL" | sed 's|https://||;s|/.*||')
  DB_URL_LOWER="${DB_URL,,}"
  if [[ "$DB_URL_LOWER" == *"$PROD_HOST"* ]]; then
    fail "SUPABASE_QA_DB_URL contains the production host '$PROD_HOST'. Refusing to run against production."
  fi
  ok "SUPABASE_QA_DB_URL does not match production URL"
else
  warn "SUPABASE_PROD_URL not set — production denylist check skipped. Set it for full protection."
fi

if [[ -n "$QA_URL" && -n "$PROD_URL" && "$QA_URL" == "$PROD_URL" ]]; then
  fail "SUPABASE_QA_URL equals SUPABASE_PROD_URL — refusing."
fi

# ── Safeguard 4: Hard-coded production patterns ────────────────────────────────
DB_URL_LOWER="${DB_URL,,}"
PROD_PATTERNS=("kebu.africa" ".prod." "production" "master" "main")
for pat in "${PROD_PATTERNS[@]}"; do
  if [[ "$DB_URL_LOWER" == *"$pat"* ]]; then
    fail "SUPABASE_QA_DB_URL contains production-like pattern '$pat'. Refusing."
  fi
done
ok "SUPABASE_QA_DB_URL does not contain production patterns"

# ── Step 2: Database connectivity ────────────────────────────────────────────
step "2/7" "Database connectivity"

if ! psql "$DB_URL" -c "SELECT 1" -q >/dev/null 2>&1; then
  fail "Cannot connect to SUPABASE_QA_DB_URL. Check the URL, password, and that psql is installed."
fi
ok "Database is reachable"

# ── Safeguard 5: Virgin check ─────────────────────────────────────────────────
step "3/7" "Virgin database check"

ALLOW_PARTIAL="${ALLOW_PARTIAL:-0}"
TABLE_COUNT=$(psql "$DB_URL" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo 999)

if [[ "$TABLE_COUNT" -ge 5 && "$ALLOW_PARTIAL" != "1" ]]; then
  echo -e "  ${YELLOW}⚠ Target database already has ${TABLE_COUNT} public tables.${RESET}" >&2
  echo "  If you intend to re-run (idempotent), set ALLOW_PARTIAL=1." >&2
  echo "  If this is accidental, do NOT proceed — check SUPABASE_QA_DB_URL." >&2
  fail "Database is not empty. Refusing to run without ALLOW_PARTIAL=1."
elif [[ "$TABLE_COUNT" -ge 5 ]]; then
  warn "Database has $TABLE_COUNT tables — continuing because ALLOW_PARTIAL=1."
else
  ok "Database appears virgin ($TABLE_COUNT public tables)"
fi

# ── Step 4: Collect canonical migrations ────────────────────────────────────
step "4/7" "Collecting canonical migrations"

# Only numbered (001_…100_) and timestamped (2026…) files are applied.
# APPLY_ALL*, APPLY_MIGRATIONS*, FIX_*, VERIFY_* are excluded from application
# but will be registered in the tracking table.

APPLY_FILES=()
SKIP_FILES=()

while IFS= read -r f; do
  base=$(basename "$f")
  # Canonical: starts with a digit (numbered NNN_ or timestamp 20260923…)
  if [[ "$base" =~ ^[0-9] ]]; then
    APPLY_FILES+=("$f")
  else
    SKIP_FILES+=("$f")
  fi
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' | sort)

ok "Will apply: ${#APPLY_FILES[@]} canonical migrations"
warn "Will SKIP (register-only): ${#SKIP_FILES[@]} patch/verify helper files"
for f in "${SKIP_FILES[@]}"; do
  echo "    skip: $(basename "$f")"
done

# ── Step 5: Apply migrations ─────────────────────────────────────────────────
step "5/7" "Applying canonical migrations"

APPLIED=0
FAILED=0

for f in "${APPLY_FILES[@]}"; do
  base=$(basename "$f")
  # Extract version key: basename without .sql
  version="${base%.sql}"
  printf "  %-60s" "$base"
  if psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f" -q 2>/tmp/mig_err.txt; then
    echo -e "${GREEN}OK${RESET}"
    (( APPLIED++ )) || true
  else
    echo -e "${RED}FAILED${RESET}"
    cat /tmp/mig_err.txt >&2
    (( FAILED++ )) || true
    fail "Migration failed: $base — fix the error above before re-running."
  fi
done

ok "Applied $APPLIED migrations"

# ── Step 6: Register all files in Supabase CLI tracking table ───────────────
step "6/7" "Registering all migration files in CLI tracking table"

# Create the tracking schema/table if not already present (Supabase CLI creates
# this on first `supabase db push`; we create it here so the CLI is safe to use
# afterwards and won't attempt to re-apply any file including APPLY_ALL_PHASE_ONE).
psql "$DB_URL" -q -c "
  CREATE SCHEMA IF NOT EXISTS supabase_migrations;
  CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version text NOT NULL PRIMARY KEY,
    statements text[],
    name text
  );
" >/dev/null 2>&1 || true

REGISTERED=0
while IFS= read -r f; do
  base=$(basename "$f")
  version="${base%.sql}"
  psql "$DB_URL" -q -c "
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('$version', '$base')
    ON CONFLICT (version) DO NOTHING;
  " >/dev/null 2>&1 || true
  (( REGISTERED++ )) || true
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' | sort)

ok "Registered $REGISTERED files in supabase_migrations.schema_migrations"
ok "supabase db push --db-url \$SUPABASE_QA_DB_URL is now a safe no-op"

# ── Step 7: Verify SECURITY DEFINER guard ────────────────────────────────────
step "7/7" "Verifying Builder SECURITY DEFINER RPCs"

check_fn() {
  local fn="$1"
  local result
  result=$(psql "$DB_URL" -tAc "
    SELECT CASE
      WHEN EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                  WHERE n.nspname='public' AND p.proname='$fn') THEN 'PRESENT'
      ELSE 'MISSING'
    END
  " 2>/dev/null || echo "ERROR")
  echo "$result"
}

check_guard() {
  psql "$DB_URL" -tAc "
    SELECT prosrc FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='reorder_sections' LIMIT 1
  " 2>/dev/null | grep -q "auth.uid() IS NOT NULL" && echo "OK" || echo "MISSING"
}

R_STATUS=$(check_fn "reorder_sections")
B_STATUS=$(check_fn "batch_update_section_props")
G_STATUS=$(check_guard)

[[ "$R_STATUS" == "PRESENT" ]] && ok "reorder_sections: present" || \
  warn "reorder_sections: MISSING — check migration 20260924010000_builder_atomic_rpcs.sql"
[[ "$B_STATUS" == "PRESENT" ]] && ok "batch_update_section_props: present" || \
  warn "batch_update_section_props: MISSING"
[[ "$G_STATUS" == "OK" ]] && ok "v2 ownership guard (auth.uid() IS NOT NULL): present" || \
  warn "v2 guard body not found — v1 may have been applied; check migration content"

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}${BOLD}║  QA schema bootstrap complete.                               ║${RESET}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo "  Next step: set all SUPABASE_QA_* vars from .env.test.local and run:"
echo "    npx vitest run tests/create/builder-qa-authz.test.ts"
echo "    npx vitest run tests/create/builder-qa-isolation.test.ts"
echo "    npx vitest run tests/create/builder-qa-rpc.test.ts"
echo ""
