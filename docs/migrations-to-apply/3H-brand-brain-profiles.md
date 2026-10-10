# 3H Brand Brain profile migration

Canonical forward migration: `supabase/migrations/20261008194553_brand_brain_profiles.sql`, allocated with the installed Supabase CLI. Requires the existing Brand Kit/DNA migrations 064 and 076. Keep the canonical SQL as the only maintained copy.

The new fields, revision trigger and security-invoker RPC were exercised in disposable local PostgreSQL/WASM. See `evidence/3h/profiles/README.md`. Hosted Supabase application and advisors are **not performed** by this local development slice. Review the intended internal environment, authorization and rollback/data-preservation plan before applying; no production migration is authorized by this checkpoint.

## Durable site attachment

Canonical forward migration: `supabase/migrations/20261009011958_brand_brain_site_binding.sql`, allocated with Supabase CLI 2.81.3. Apply after the profile migration above and existing projects (004), Brand Kit (064) and Brand DNA (076) migrations. This is the only maintained SQL copy. Selective `ON DELETE SET NULL (profile_id)` requires PostgreSQL 15 or later.

The owner-scoped binding uses composite project/profile ownership foreign keys, RLS, immutable ownership and monotonic safe-integer revisions. The security-invoker RPC serializes attachment changes under a project lock and rejects stale expectations. Detachment retains site edits and the saved profile. Profile deletion clears the pointer and advances revision. Actual disposable PostgreSQL tests exercised anonymous and foreign-owner denial, direct writes, stale replay, detach and profile deletion; API/browser tests exercise canonical acknowledgement and recovery. See `evidence/3h/complete/README.md`.

Neither 3H migration has been applied to a hosted environment in this work. Hosted advisors, real signed-in verification and environment rollout remain pending; do not infer deployment from local SQL results. Preserve profiles and binding rows when planning rollback rather than dropping user data.
