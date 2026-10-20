-- Source for migration 20260925012420 "revoke_anon_builder_rpcs", applied to the QA project
-- on 2026-09-25 and recorded in supabase_migrations.schema_migrations without a repository
-- file. The statements below are exactly those recorded in QA.
--
-- Why it is required: Supabase projects grant EXECUTE on new public-schema functions to
-- anon explicitly (ALTER DEFAULT PRIVILEGES … GRANT ALL ON ROUTINES TO anon, …).
-- 20260924010000_builder_atomic_rpcs.sql only revokes from PUBLIC, which does not remove
-- that explicit grant. Both RPCs admit callers with no auth.uid() (the service-role path),
-- so an anon EXECUTE grant would let unauthenticated callers use them.
-- Idempotent: revoking an absent privilege is a no-op.
-- Regression: tests/create/builder-rpc-anon-grants.db.test.ts

REVOKE EXECUTE ON FUNCTION batch_update_section_props(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION reorder_sections(uuid, uuid[]) FROM anon;
