# Supabase migration history

Last reconciled: 2026-09-20  
Project: Kebu (`tnygqgcqlnlsmjpygrca`)

## Purpose

The live Kebu database contains the developed application schema, but its recorded migration ledger does not represent the complete historical path that originally created that schema. The old repository directory mixed numbered migrations, manual apply/fix bundles, verification scripts, and newer canonical timestamped migrations. Blindly replaying those historical files against the live project risks duplicated objects, conflicting policies, or data loss.

This document establishes a safe forward-only migration boundary. It does not claim that the archived SQL can reconstruct the live database from zero.

## Live applied migration ledger

Captured through the Supabase migration API on 2026-09-20:

| Live version | Live name | Repository status |
| --- | --- | --- |
| `20260915204226` | `create_developer_apps` | Live historical entry; related schema exists in archived historical SQL, but there is no trusted byte-for-byte canonical file. Do not replay. |
| `20260919051124` | `add_site_password_fields` | Live historical entry; repository history contains the earlier `087_site_password.sql`. Do not replay. |
| `20260919102208` | `quarantine_accidental_rect_objects` | Equivalent canonical repository migration: `20260919101521_quarantine_accidental_rect_objects.sql`. Version mismatch is documented; do not replay. |
| `20260919102210` | `enforce_opportunity_verified_access` | Equivalent canonical repository migration: `20260919101805_enforce_opportunity_verified_access.sql`. Version mismatch is documented; do not replay. |
| `20260919204303` | `harden_public_database_boundaries` | Exact canonical repository version. |
| `20260919212918` | `remove_duplicate_business_public_id_index` | Exact canonical repository version. |
| `20260919221320` | `add_query_informed_fk_indexes` | Equivalent repository migration: `20260919233000_add_query_informed_fk_indexes.sql`. Known version mismatch; do not replay merely to align numbers. |
| `20260919234857` | `prevent_afrique_id_self_verification` | Applied live security migration; canonical repository copy must retain the live version. |
| `20260919234936` | `restrict_afrique_id_reads_to_owner` | Applied live security migration; canonical repository copy must retain the live version. |

## Executable directory

`supabase/migrations/` is reserved for timestamped, forward-only canonical migrations. CI rejects:

- `APPLY_*`, `FIX_*`, or `VERIFY_*` files in the executable directory;
- duplicate 14-digit timestamp versions;
- package scripts that execute historical apply bundles.

## Archive

The former numbered migrations and manual bundles are preserved under `supabase/migrations_archive/legacy/`. They are reference material only. They must not be renamed back into the executable directory or used as a production deployment plan.

## Rules going forward

1. Generate one unique 14-digit UTC timestamp for every new migration.
2. Never edit a migration after it has been applied to a shared environment. Add a new forward migration instead.
3. Apply schema changes through the approved Supabase migration workflow and commit the exact SQL file in the same change.
4. Compare the intended version with the live ledger before applying. A name match with a different timestamp is a reconciliation event, not permission to replay.
5. Run migration hygiene, Supabase security advisors, and performance advisors after material schema changes.
6. Treat verification queries as tests or documented runbooks, not executable migrations.
7. Never use archived SQL to mutate Production without a separately reviewed recovery plan.

## Bootstrap limitation

The canonical forward chain begins at the reconciled live baseline; it is not yet a zero-to-live bootstrap chain. Creating a sanitized baseline schema for brand-new environments is deferred architecture work and must be generated from a reviewed schema-only dump, with secrets and production data excluded.
