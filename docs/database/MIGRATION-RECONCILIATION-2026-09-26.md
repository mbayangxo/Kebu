# Migration bookkeeping reconciliation — 2026-09-26 (Phase 3B)

Scope: QA project `skqnxyaeimvbyrmdfzvk` history (`supabase_migrations.schema_migrations`) vs
`supabase/migrations/` vs `docs/migrations-to-apply/`. Production was not contacted. No
already-applied migration was run, re-run, rolled back, renamed or edited.

## Starting state (read-only inspection)

- QA history: 123 rows · repository migration files: 123.
- Applied in QA but **not recorded**: `20260924030000_projects_aesthetic_id.sql`, `20260924040000_page_device_layouts.sql`.
- Recorded in QA with **no repository file** (both applied manually on 2026-09-25, `created_by` = project owner):
  - `20260925010330 grant_public_roles`
  - `20260925012420 revoke_anon_builder_rpcs`
- `docs/migrations-to-apply/` had no entry for `20260924040000_page_device_layouts.sql` (nor for any of the 2026-09-23/24 series).

## Resolution

| Item | Finding | Action |
|---|---|---|
| `20260924030000_projects_aesthetic_id` | Schema in QA matches the file exactly: `projects.aesthetic_id text NULL`, identical CHECK (`projects_aesthetic_id_check`) and comment. | Registered in QA history (`version` = basename, `name` = file — the convention of `scripts/bootstrap-qa-schema.sh` step 6). Migration not run. |
| `20260924040000_page_device_layouts` | Applied to QA during Gate 1 (verbatim file, 2026-09-26T04:09:33Z); column `jsonb NULL` with identical comment. | Registered in QA history (same convention). Copied (byte-identical) to `docs/migrations-to-apply/` with a README entry. |
| `20260925012420 revoke_anon_builder_rpcs` | **Real schema discrepancy.** Supabase default privileges grant EXECUTE on new public functions to `anon` explicitly (QA: `pg_default_acl` for functions = `anon=X`). `20260924010000_builder_atomic_rpcs.sql` revokes only from `PUBLIC`, which does not remove that grant; both RPCs accept callers with no `auth.uid()`. Proven by `tests/create/builder-rpc-anon-grants.db.test.ts` (real Postgres, Supabase default privileges): the RPC migration alone leaves `anon` EXECUTE; the revoke removes it. | Added the missing source file `supabase/migrations/20260925012420_revoke_anon_builder_rpcs.sql` — the exact SQL recorded in QA, named `<version>_<name>.sql` (Supabase CLI convention), so QA history and repository now agree. Copied to `docs/migrations-to-apply/` with a README entry and verification query. |
| `20260925010330 grant_public_roles` | QA-environment repair: re-applies Supabase's standard `public` schema grants and default privileges (QA was bootstrapped from raw SQL). Hosted Supabase projects already have these by default. Broad (`GRANT ALL … TO anon`); not a product schema change. | **Not added** to `supabase/migrations/` (it would only restate platform defaults in production and re-grant `anon` on every routine). Left in QA history as the truthful record. The Supabase CLI will list it as a remote-only version for QA; if CLI-clean history is wanted, a human may run `supabase migration repair --status reverted 20260925010330` against QA (not done). |

## End state

- QA history: 125 rows. Every repository migration file is recorded — by basename (bootstrap convention) or by version + name (CLI convention, `20260925012420`).
- One remote-only history entry remains, documented above (`grant_public_roles`).
- QA schema unchanged by this reconciliation (bookkeeping rows only).

## Required before production deploy (human)

Run against production (read-only) and apply `20260925012420_revoke_anon_builder_rpcs.sql` if either is `true`:

```sql
select has_function_privilege('anon', 'public.batch_update_section_props(uuid, jsonb)', 'EXECUTE'),
       has_function_privilege('anon', 'public.reorder_sections(uuid, uuid[])', 'EXECUTE');
```

## Known documentation gap (not changed here)

The 2026-09-23/24 migrations other than `20260924040000` (commerce, platform jobs, builder RPCs, asset
staleness, aesthetic id) have no copies or README entries in `docs/migrations-to-apply/`. They belong to
other slices and are listed here for the owning slice to add.
