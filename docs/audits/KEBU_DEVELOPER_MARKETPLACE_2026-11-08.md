# Developer marketplace local acceptance — November 8, 2026

Source candidate, not a hosted release. The Vercel team is blocked; no deployment, hosted migration, provider activation or spending was attempted. RECT remains a separate product and was not built or seeded.

## Implemented scope

- Existing developer app screens now persist complete hosted-app drafts: description, public HTTPS launch/privacy/support pages, category and pricing metadata. Paid/subscription drafts are preserved but cannot be submitted.
- Submit freezes the content. Kebu Record staff can approve, return for revision or suspend an approved app. Review notes are durable and visible to its developer. Staff approval is a signed admin-session action, never user-editable account metadata.
- The App Store combines optional first-party apps with approved free developer apps. Account holders review the destination and privacy/support pages and explicitly consent before adding a launcher to My Apps.
- Open rechecks the installation, current approval and accepted revision. The launch page shows the exact reviewed destination; a separate tab opens without a referrer or opener. No KEBU identity token, files, wallet or contacts are granted to the external app.
- Remove deletes only that account's install. It does not delete the app's external account. Withdrawn/suspended apps cannot launch from KEBU; stored installation names remain removable without exposing subsequent developer drafts.
- The migration restores the absent developer_apps definition, preserves compatible legacy records and resets unreviewed legacy published flags to draft if launch/privacy/support information is missing. It does not fabricate installs or approvals.

## Verification

The recorded local PostgreSQL/PGlite script passes 20 assertions, including legacy-record preservation, self-publication denial, review freeze and stale-decision rejection, cross-account isolation, exactly-once free installation, withdrawal/suspension, new-version consent, private review notes and private unpublished drafts. This is local database evidence, not hosted Supabase acceptance.

Focused unit checks pass 25 cases across app manifests, mutation origin checks, bounded JSON parsing, existing Live Rooms media grants and sandbox gift confirmation. Targeted marketplace lint has no errors. TypeScript passed locally.

The actual browser → Next API → supabase-js → isolated SQL fixture is checked at desktop (1440px) and phone (390px), with create/submit/approve/add, reload persistence, reviewed launch links, suspension and removal. The fixture substitutes only loopback authentication and the REST transport, not database permission decisions. Screenshots were visually inspected and phone horizontal overflow checked. External app pages are not visited by the fixture: its sample calendar is not a shipped marketplace listing.

Broad local checks: TypeScript passes; full lint has zero errors and359warnings; all6,948repository tests pass with473explicit environment-dependent skips. The production build passes on a clean npm ci installation. Its first attempt failed because this temporary worktree linked Next outside Turbopack’s filesystem root; installing from the existing lockfile fixed that environment issue without application changes. Hosted release readiness remains unverified. The final browser run passes both sizes with94actual SQL transport queries and zero skipped/flaky cases. Local PostgreSQL/PGlite version:0.5.15.

## Explicit remaining scope

| Capability | Status |
| --- | --- |
| Free, externally hosted app listing/review/account launchers | Local implementation and acceptance |
| Hosted Supabase and Vercel preview acceptance | Blocked on preview availability; migration unapplied |
| Real external app developer onboarding and ownership/support review | Requires real submissions and human operation |
| Paid app checkout, entitlement, refund/revocation and creator revenue | Not implemented by this slice; paid publication blocked |
| Scoped KEBU APIs, OAuth, embedded runtime or running developer code | Not implemented; launcher shares no KEBU data |
| RECT, its video catalogue and watch parties | Separate product; excluded |
| Friends/Live Rooms media and real JOKKO payment acceptance | Their earlier hosted/provider checks remain open |

## Running the checks

Use an isolated PostgreSQL/PGlite module through KEBU_PGLITE_MODULE_PATH and run node scripts/verify-developer-marketplace-sql.mjs. For the browser script, also set KEBU_CHROMIUM_EXECUTABLE_PATH and optionally KEBU_MARKETPLACE_OUTPUT_DIR. Neither script uses hosted credentials or falls back to a live database.

KEBU_APP_MARKETPLACE_QA=true enables the candidate only with a loopback Supabase URL or the designated QA project. Production remains disabled. Full hosting/commerce capabilities must not be implied by this flag.
