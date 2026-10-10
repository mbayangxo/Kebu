# 3I Experience DNA — local migration handoff

Canonical forward migration: `supabase/migrations/20261009040802_experience_dna.sql`, allocated with Supabase CLI 2.81.3. Requires `004_create_projects.sql`; ensures/reuses the project/owner composite index also used by 3H. Keep the canonical SQL as the only maintained copy.

The table contains private project intent, not actual site pages or public content. Owner-only RLS and explicit authenticated SELECT/INSERT/UPDATE grants enforce privacy. No DELETE grant permits revision resets. A composite ownership FK, immutable identity trigger and monotonic bounded revision protect direct writes. Strict bounded JSON checks also apply to direct SQL/Data API writes. The security-invoker RPC uses an owned-project lock, rejects stale expected revisions and returns the canonical row. Stored references are owner observations and are not fetched.

The migration was executed in disposable PostgreSQL/PGlite with the real project migration. Ownership, anonymous denial, direct writes, invalid/future/unknown JSON, replay, UTF-8 content and revision checks passed. API and controlled browser verification are recorded in `evidence/3i/experience/README.md`.

No hosted migration, advisors, production deployment or real signed-in S8 verification was performed. Those remain separate and deferred. Review the intended environment and preserve saved direction when planning rollback; no production application or destructive rollback is authorized here.
