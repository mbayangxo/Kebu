# Kebu Liguey (K066) — Liguey-specific implementation audit

Scope: `docs/product/KEBU-LIGUEY-SCOPE-ADDENDUM.md`'s 8 acceptance cases. This is the authoritative, standalone evidence record for Liguey going forward — per instruction, Liguey evidence is kept here rather than appended to the global `docs/KEBU-COMPLETION-QUEUE.md` / `docs/KEBU-RECOVERED-REQUEST-AUDIT.md`, to avoid colliding with concurrent work on shared/global docs. This is not a release certificate; genuine hosted Supabase Auth/RLS/Storage acceptance is explicitly open throughout and is never claimed from local fixture tests.

Working branch: `work/kebu-liguey-k066-oct20`, created from `work/kebu-completion-audit-oct13` at commit `4a7eb05` (itself 20 commits ahead of `origin/work/kebu-completion-audit-oct13` @ `e5cf037`, the last verified shared checkpoint as of October 20, 2026). Nothing has been pushed; nothing on the remote has changed since that checkpoint (re-verified by fetch before branching).

## Summary table

| Case | Status | Commit(s) on `work/kebu-completion-audit-oct13` (pre-dating this branch) |
| --- | --- | --- |
| Dependency: `business_members` RLS recursion repair | Repaired (narrow forward migration, not the full bootstrap) | `aacd053` |
| 1 — Worker access and profile | Implemented, locally tested | `620b36a` |
| 2 — Real work discovery | Implemented, locally tested | `6a822b7` |
| 3 — Applications | Partially implemented as part of case 4 (submit/withdraw only; full draft/validation polish not separately built) | `e7019dc` |
| 4 — Employer/recruiter workflow | Implemented, locally tested | `e7019dc` |
| 5 — SAFA first connected journey | **BLOCKED** — no SAFA spec/API contract available | — |
| 6 — Meaningful integration | Implemented (profile/evidence visibility for reviewers), locally tested | `4a7eb05` |
| 7 — Multilingual (EN/FR/Wolof) | Implemented, dictionary-tested; Wolof not fluently reviewed | `26d89db` |
| 8 — Verification (real browser) | Not yet done — in progress on this branch | — |

## Case 1 — Worker access and profile (`620b36a`)

**Mapped before coding**: `user_profiles` is identity-only (no skills/languages/experience/portfolio); `network_profiles` (K067) is a networking directory with its own Oct 15 RLS hardening, deliberately not extended; `opportunity_profiles` is confirmed schema-isolated from any applicant/employment concept in code, not just docs; no jobs/employer/applicant code existed anywhere in the repository before this slice.

**Built**: `supabase/migrations/20261016180000_liguey_worker_profiles.sql` — `public.worker_profiles` (1:1 with `auth.users`, same shape as `opportunity_profiles`) and `public.worker_profile_evidence` (joins to `library_nodes`, K058's already-tested Library storage — reused by reference, no new file storage invented). Every writable column is self-reported; `verified_at`/`verified_by` are reserved for a future verification capability and are **not granted to `authenticated` at all** (table-level column GRANTs, not just RLS, mirroring `network_profiles.is_verified`'s already-hardened convention) — no credential, score or eligibility check invented. `is_discoverable` defaults closed.

`app/api/liguey/profile/route.ts` (GET lazily creates the profile on first touch, mirroring the existing `ensureAfriqueIdForUser` convention; PATCH updates only sent fields, using the no-default-on-shared-base zod pattern from `lib/work/items.ts` to avoid repeating that session's earlier default-leak bug) and `app/api/liguey/profile/evidence/route.ts` (list/link/unlink, ownership-checked via the existing `private.library_node_owner_id()` helper — safe reuse since it queries a different table than the one its caller writes to).

UI: `app/liguey/page.tsx`, `app/liguey/profile/page.tsx`, `app/components/liguey/liguey-profile-panel.tsx`, plus a "Liguey" entry in the main app nav.

**Verified**: `tests/liguey/worker-profile.local.test.ts` (9 real-SQL PGlite cases against the actual migration SQL, all passed) + `tests/liguey/profile-route.test.ts` (8 mocked cases) + `tests/liguey/profile-evidence-route.test.ts` (8 mocked cases).

## Case 4 — Employer/recruiter workflow + minimum of case 3 (`e7019dc`)

**Mapped before coding**: `businesses`/`business_members` is the only tenant entity in the codebase (no parallel employer concept invented); every `business_*` table shares one RLS shape (business_members exists-check for reads, role-restricted for writes); no `business_*` table has ever had a public RLS policy (public reach goes through a service-role route filtering status, modeled on `business_events`); `event_registrations` has no submitter read-back at all (anonymous guests), so the applicant-reads-their-own-decision case was designed fresh.

**Confirmed and deliberately avoided a real inconsistency**: `lib/business/assert-manager.ts`'s role list (`founder, administrator, store_manager, manager, creative`) doesn't match the DB's own `business_members` role constraint or the two other inline copies of this same check. `lib/liguey/assert-employer-manager.ts` defines its own list matching the two DB-consistent copies.

**Built**: `supabase/migrations/20261016190000_liguey_job_listings_applications.sql` — `job_listings` (business-owned, `public_id`, `draft/published/closed/archived`) and `job_applications` (`listing_id` + denormalized `business_id` + `applicant_user_id`, `unique(listing_id, applicant_user_id)`). A real design bug was found and fixed before shipping: the application-submission policy needed to check "is this listing published," but an applicant can never read `job_listings` under their own RLS, so that check would always see zero rows — fixed with a narrowly-scoped `private.is_published_job_listing()` SECURITY DEFINER helper answering only a bare boolean. `decided_at`/`decided_by` are never client-writable; a trigger stamps them only on a genuine accept/decline transition. An identity-guard trigger blocks reassigning `listing_id`/`business_id`/`applicant_user_id` — though the column-grant layer blocks it even earlier; the trigger is defense-in-depth.

API: `app/api/liguey/employers/[businessId]/listings/**` (manager-gated at RLS and application layers) and `app/api/liguey/applications/route.ts` (list/submit/withdraw). UI: `app/business/[id]/liguey/page.tsx` and `app/liguey/applications/page.tsx`.

**Verified**: `tests/liguey/job-listings-applications.local.test.ts` (14 real-SQL cases, all passed) + 4 mocked route test files (24 cases).

**Case 3 note**: only submit/withdraw were built, as the minimum needed to make case 4's review loop real. Full case 3 (draft states, richer validation/duplicate-submission UX beyond the DB-level unique constraint) was not separately built.

## Case 2 — Real work discovery (`6a822b7`)

Depended on case 4 existing first (the addendum forbids fabricated listings). `app/api/public/liguey/listings/route.ts` (list) and `.../[publicId]/route.ts` (detail) use the service-role client with an explicit `status='published'` filter, mirroring `app/api/public/events/[publicId]/route.ts` exactly — no new anon RLS policy. The detail route returns an identical 404 for a nonexistent `public_id` and a real-but-unpublished one (verified, not assumed) so a draft's existence is never leaked.

UI: `app/j/[publicId]/page.tsx` (public permalink, no app-nav chrome, mirrors `app/e/[publicId]/page.tsx`) and `app/liguey/discover/page.tsx` (in-app browse, requires sign-in like every other `/liguey/*` page).

**Verified**: `tests/liguey/public-listings-route.test.ts` (4 cases) + `public-listing-detail-route.test.ts` (4 cases). No new real-SQL test needed — no new RLS/schema logic beyond case 4's already-tested migration.

## Case 7 — Multilingual EN/FR/Wolof (`26d89db`)

Followed Network's Oct 15 i18n pattern exactly: `lib/liguey/liguey-i18n.ts` (typed key union + `Record<Lang,Record<Key,string>>`, `ligueyT`) plus four enum-label maps so stored/canonical values are never translated. Wolof strings are an explicit, stated best-effort translation, not fluent-reviewed — reuses the existing `LanguageBar` "AI translations are approximate" banner rather than inventing a second review mechanism.

Most Liguey pages are server components delegating to a client sub-panel; only `app/liguey/page.tsx` had user-facing text directly in a server component, extracted into `app/components/liguey/liguey-home-client.tsx`. All six Liguey components wired to the dictionary with `<LanguageBar variant="builder" />` mounted on each.

**Verified**: `tests/liguey/liguey-i18n.test.ts` (9 cases) — dictionary completeness (no gaps, no orphaned keys), enum-label coverage parity across languages, fallback behavior. **Honestly scoped down**: no real-browser language-switching test was added (unlike Network's 4 Playwright cases) — judged out of proportion at the time; case 8 below is where this gets revisited.

## `business_members` RLS recursion repair (`aacd053`, dependency, not Liguey itself)

Found while mapping K065 (team workspaces) ahead of Liguey. Two policy variants have ever existed for `business_members`'s own SELECT policy, both defective (one recursive, one self-row-only). `supabase/migrations/20261016170000_business_members_select_recursion_repair.sql` restores the original intended authorization (founder/administrator sees the full roster) without the recursion, via a `private.is_active_business_admin(business_id)` helper deliberately designed differently from the Rooms equivalent (no user-id parameter, so it can't be used to probe another user's role). **Explicitly not** the full `businesses`/`business_members`/`business_invites` bootstrap, which remains deferred per `supabase/MIGRATION_HISTORY.md`.

**Verified**: `tests/business/business-members-select-policy.local.test.ts` (10 cases against a locally reconstructed fixture matching the archived schema — explicitly not a hosted-schema verification).

## Case 6 — Meaningful integration (`4a7eb05`)

**Mapped before coding**: review had been genuinely blind (cover note + status only, confirmed not assumed). Investigated and ruled out Network-connection-on-hire (Network has no 1:1 connection primitive at all; the separate `personal_connections` table is itself missing its migration from the entire chain — a new, flagged-not-fixed finding) and Rooms-on-hire (no revocation primitive tied to application status, the opposite of what this case needs) as too speculative/unspecified.

**Built**: `supabase/migrations/20261016200000_liguey_profile_visibility_for_reviewers.sql` extends `worker_profiles`/`worker_profile_evidence`'s owner-only SELECT policies with one branch: any active business member may read a worker's profile/evidence once that worker has a non-withdrawn application to one of that business's listings. No SECURITY DEFINER helper needed — the reviewing member already has SELECT rights on the rows the check reads under their own existing RLS. Revocation is a live `EXISTS ... status != 'withdrawn'`, not a cached grant.

**Verified**: `tests/liguey/profile-visibility-for-reviewers.local.test.ts` (7 real-SQL cases, all passed, including a dedicated withdrawal-revokes-visibility-immediately case) + 2 new mocked cases in `employer-listing-detail-route.test.ts`.

## Case 5 — SAFA first connected journey: BLOCKED

No SAFA documentation, API contract, or prior integration exists anywhere in this repository — confirmed by grep, not assumed. Building anything beyond the generic worker→listing→application pipeline (cases 1–4, 6) would mean inventing SAFA's actual integration shape, which the addendum itself warns against. Recorded as a genuine unavailable-access blocker. Not attempted.

## Case 8 — Verification: IN PROGRESS

See the dated entries below for real-browser verification work on this branch.
